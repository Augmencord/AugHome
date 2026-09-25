"""Unit tests for AugHome Extension System and REST endpoints."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from starlette.testclient import TestClient

from aughome.extensions import (
    ExtensionContribution,
    ExtensionManager,
    ExtensionManifest,
    ExtensionRecord,
)
from aughome.server import app


class TestExtensionManager(unittest.TestCase):
    """Test ExtensionManager discovery, manifests, contributions, and lifecycle."""

    def setUp(self) -> None:
        self.temp_ext_dir = tempfile.mkdtemp()
        self.temp_user_dir = tempfile.mkdtemp()

        # Create a sample extension with manifest.json
        ext_folder = Path(self.temp_ext_dir) / "sample-ext"
        ext_folder.mkdir()
        manifest = {
            "id": "sample-ext",
            "name": "Sample Mock Extension",
            "version": "1.2.0",
            "description": "Mock extension for test validation",
            "publisher": "tester",
            "contributes": {
                "languages": [
                    {"id": "mocklang", "extensions": [".mock"]}
                ],
                "themes": [
                    {"id": "mock-dark", "label": "Mock Dark Theme"}
                ],
                "commands": [
                    {"command": "mock.doSomething", "title": "Mock: Do Something"}
                ],
                "tools": [
                    {"name": "mock_tool", "description": "Execute mock tool action"}
                ],
                "mcpServers": {
                    "mock_server": {
                        "command": "python",
                        "args": ["-m", "mock_server"]
                    }
                }
            }
        }
        with open(ext_folder / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f)

        self.manager = ExtensionManager(
            extensions_dir=self.temp_ext_dir,
            user_extensions_dir=self.temp_user_dir,
        )

    def tearDown(self) -> None:
        shutil.rmtree(self.temp_ext_dir, ignore_errors=True)
        shutil.rmtree(self.temp_user_dir, ignore_errors=True)

    def test_extension_discovered_and_parsed(self) -> None:
        """Verify manifest.json is parsed into ExtensionRecord."""
        extensions = self.manager.get_extensions()
        self.assertEqual(len(extensions), 1)
        rec = extensions[0]
        self.assertEqual(rec.manifest.id, "sample-ext")
        self.assertEqual(rec.manifest.name, "Sample Mock Extension")
        self.assertEqual(rec.manifest.version, "1.2.0")
        self.assertTrue(rec.enabled)
        self.assertTrue(rec.is_builtin)

    def test_contributions_aggregation(self) -> None:
        """Verify aggregated contributed commands, themes, languages, and tools."""
        commands = self.manager.get_contributed_commands()
        self.assertEqual(len(commands), 1)
        self.assertEqual(commands[0]["command"], "mock.doSomething")
        self.assertEqual(commands[0]["extensionId"], "sample-ext")

        themes = self.manager.get_contributed_themes()
        self.assertEqual(len(themes), 1)
        self.assertEqual(themes[0]["id"], "mock-dark")

        languages = self.manager.get_contributed_languages()
        self.assertEqual(len(languages), 1)
        self.assertEqual(languages[0]["id"], "mocklang")

        tools = self.manager.get_contributed_tools()
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]["name"], "mock_tool")

    def test_toggle_extension_lifecycle(self) -> None:
        """Verify enabling and disabling suppresses/restores contributions."""
        rec = self.manager.toggle_extension("sample-ext", enabled=False)
        self.assertFalse(rec.enabled)

        # Disabled extension should not contribute commands
        commands = self.manager.get_contributed_commands()
        self.assertEqual(len(commands), 0)

        # Re-enable
        rec = self.manager.toggle_extension("sample-ext", enabled=True)
        self.assertTrue(rec.enabled)
        commands = self.manager.get_contributed_commands()
        self.assertEqual(len(commands), 1)

    def test_toggle_nonexistent_extension_raises_key_error(self) -> None:
        """Verify invalid extension ID raises KeyError."""
        with self.assertRaises(KeyError):
            self.manager.toggle_extension("unknown-ext", enabled=True)

    def test_bundled_workspace_extensions_discovery(self) -> None:
        """Verify discovery on workspace root extensions/ directory discovers bundled extensions."""
        default_manager = ExtensionManager()
        ext_ids = [ext.manifest.id for ext in default_manager.get_extensions()]
        self.assertIn("python-support", ext_ids)
        self.assertIn("theme-aughome-dark", ext_ids)


class TestExtensionAPIEndpoints(unittest.TestCase):
    """Test FastAPI /v1/extensions REST endpoints."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_get_extensions_endpoint(self) -> None:
        """Verify GET /v1/extensions returns discovered extensions and contributions."""
        res = self.client.get("/v1/extensions")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("extensions", data)
        self.assertIn("contributions", data)
        self.assertIn("commands", data["contributions"])
        self.assertIn("themes", data["contributions"])
        self.assertIn("languages", data["contributions"])

    def test_post_extensions_toggle_endpoint(self) -> None:
        """Verify POST /v1/extensions/toggle modifies extension state."""
        payload = {
            "extension_id": "python-support",
            "enabled": True,
        }
        res = self.client.post("/v1/extensions/toggle", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["extension"]["id"], "python-support")
        self.assertTrue(data["extension"]["enabled"])

    def test_post_extensions_toggle_not_found(self) -> None:
        """Verify POST /v1/extensions/toggle with invalid ID returns 404."""
        payload = {
            "extension_id": "nonexistent-extension-id",
            "enabled": True,
        }
        res = self.client.post("/v1/extensions/toggle", json=payload)
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
