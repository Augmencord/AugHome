"""User Settings Management Engine for AugHome IDE.

Handles persistence, retrieval, and defaults for user configuration in
~/.aughome/settings.json with atomic writes and schema fallback.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional


DEFAULT_SETTINGS: Dict[str, Any] = {
    "editor.theme": "aughome-dark",
    "editor.fontSize": 13,
    "editor.fontFamily": "'JetBrains Mono', Consolas, 'Courier New', monospace",
    "editor.tabSize": 2,
    "editor.wordWrap": "on",
    "editor.minimap": True,
    "editor.inlineSuggest": True,
    "ai.selectedModel": "gemini-2.5-flash",
    "ai.autoCompleteDebounceMs": 300,
    "ai.fimLinePrefixLimit": 100,
    "ai.fimLineSuffixLimit": 50,
    "extensions.autoUpdate": False,
    "keybindings": {
        "commandPalette": "Ctrl+Shift+P",
        "quickOpen": "Ctrl+P",
        "toggleSidebar": "Ctrl+B",
        "toggleTerminal": "Ctrl+J",
        "toggleChat": "Ctrl+L",
        "openSettings": "Ctrl+,",
        "saveFile": "Ctrl+S",
    },
}


class SettingsManager:
    """Manages application-wide settings stored at ~/.aughome/settings.json."""

    def __init__(self, config_path: Optional[str] = None) -> None:
        if config_path:
            self.config_path = Path(config_path)
        else:
            env_override = os.environ.get("AUGHOME_SETTINGS_PATH")
            if env_override:
                self.config_path = Path(env_override)
            else:
                self.config_path = Path.home() / ".aughome" / "settings.json"

        self._settings: Dict[str, Any] = {}
        self.load_settings()

    def get_defaults(self) -> Dict[str, Any]:
        """Return a copy of the default settings dictionary."""
        return json.loads(json.dumps(DEFAULT_SETTINGS))

    def load_settings(self) -> Dict[str, Any]:
        """Load settings from JSON file, merging with default settings."""
        settings = self.get_defaults()
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    user_data = json.load(f)
                if isinstance(user_data, dict):
                    self._deep_merge(settings, user_data)
            except Exception:
                # If settings file is corrupted or unreadable, retain defaults
                pass

        self._settings = settings
        return self._settings

    def save_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Persist updated settings to file atomically."""
        if not isinstance(new_settings, dict):
            raise ValueError("Settings payload must be a dictionary.")

        # Deep merge new settings into current settings
        self._deep_merge(self._settings, new_settings)

        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self.config_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self._settings, f, indent=2, ensure_ascii=False)
            temp_path.replace(self.config_path)
        except Exception as exc:
            raise IOError(f"Failed to persist settings to {self.config_path}: {exc}")

        return self._settings

    def get(self, key: str, default: Any = None) -> Any:
        """Get setting by literal key or nested dot-notation key (e.g., 'keybindings.commandPalette')."""
        if key in self._settings:
            return self._settings[key]
        parts = key.split(".")
        curr: Any = self._settings
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                return default
        return curr

    def set(self, key: str, value: Any) -> None:
        """Set setting by literal key or nested key and persist to disk."""
        if key in self._settings or "." not in key:
            self._settings[key] = value
        else:
            parts = key.split(".")
            curr = self._settings
            for p in parts[:-1]:
                if p not in curr or not isinstance(curr[p], dict):
                    curr[p] = {}
                curr = curr[p]
            curr[parts[-1]] = value
        self.save_settings(self._settings)

    def reset_to_defaults(self) -> Dict[str, Any]:
        """Reset settings to default factory values."""
        self._settings = self.get_defaults()
        if self.config_path.exists():
            try:
                self.config_path.unlink()
            except Exception:
                pass
        return self._settings

    @staticmethod
    def _deep_merge(target: Dict[str, Any], source: Dict[str, Any]) -> None:
        """Recursively merge source dictionary into target."""
        for key, val in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(val, dict):
                SettingsManager._deep_merge(target[key], val)
            else:
                target[key] = val
