"""Unit tests for AugHome Settings Engine and REST endpoints."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from starlette.testclient import TestClient

from aughome.server import app, settings_manager
from aughome.settings import DEFAULT_SETTINGS, SettingsManager


class TestSettingsManager(unittest.TestCase):
    """Test SettingsManager isolated operations with temporary directories."""

    def setUp(self) -> None:
        self.temp_dir = tempfile.mkdtemp()
        self.config_file = Path(self.temp_dir) / "settings.json"
        self.manager = SettingsManager(config_path=str(self.config_file))

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_default_settings_loaded(self) -> None:
        """Verify default settings populated on fresh instantiation."""
        settings = self.manager.load_settings()
        self.assertEqual(settings["editor.theme"], "aughome-dark")
        self.assertEqual(settings["editor.tabSize"], 2)
        self.assertEqual(settings["ai.selectedModel"], "gemini-2.5-flash")
        self.assertIn("keybindings", settings)

    def test_dot_notation_get_and_set(self) -> None:
        """Verify dot-notation accessors for nested and flat settings."""
        self.assertEqual(self.manager.get("editor.fontSize"), 13)
        self.assertEqual(self.manager.get("keybindings.commandPalette"), "Ctrl+Shift+P")
        self.assertIsNone(self.manager.get("nonexistent.setting"))
        self.assertEqual(self.manager.get("nonexistent.setting", "fallback"), "fallback")

        # Set and verify persistence
        self.manager.set("editor.fontSize", 16)
        self.assertEqual(self.manager.get("editor.fontSize"), 16)

        # Reload from disk to verify atomic save
        fresh_manager = SettingsManager(config_path=str(self.config_file))
        self.assertEqual(fresh_manager.get("editor.fontSize"), 16)

    def test_deep_merge_partial_settings(self) -> None:
        """Verify partial settings merge cleanly without overriding untouched defaults."""
        partial = {
            "editor.theme": "monokai",
            "keybindings": {
                "commandPalette": "F1",
            },
        }
        self.manager.save_settings(partial)
        loaded = self.manager.load_settings()
        self.assertEqual(loaded["editor.theme"], "monokai")
        self.assertEqual(loaded["keybindings"]["commandPalette"], "F1")
        # Untouched keybinding preserved
        self.assertEqual(loaded["keybindings"]["quickOpen"], "Ctrl+P")
        # Untouched editor setting preserved
        self.assertEqual(loaded["editor.tabSize"], 2)

    def test_invalid_settings_payload_raises_value_error(self) -> None:
        """Verify non-dictionary payload raises ValueError."""
        with self.assertRaises(ValueError):
            self.manager.save_settings("not-a-dict")  # type: ignore

    def test_reset_to_defaults(self) -> None:
        """Verify resetting removes user overrides."""
        self.manager.set("editor.fontSize", 24)
        self.assertEqual(self.manager.get("editor.fontSize"), 24)
        self.manager.reset_to_defaults()
        self.assertEqual(self.manager.get("editor.fontSize"), 13)


class TestSettingsAPIEndpoints(unittest.TestCase):
    """Test FastAPI /v1/settings REST endpoints."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_get_settings_endpoint(self) -> None:
        """Verify GET /v1/settings returns configured settings."""
        res = self.client.get("/v1/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("settings", data)
        self.assertIn("editor.theme", data["settings"])

    def test_post_settings_endpoint(self) -> None:
        """Verify POST /v1/settings updates settings."""
        payload = {
            "settings": {
                "editor.fontSize": 14,
            }
        }
        res = self.client.post("/v1/settings", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["settings"]["editor.fontSize"], 14)


if __name__ == "__main__":
    unittest.main()
