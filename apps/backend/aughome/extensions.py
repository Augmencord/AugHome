"""AugHome IDE Extension System Engine.

Discovers extensions from extensions/ and ~/.aughome/extensions/, validates
manifest.json specifications, aggregates tool/theme/language/command
contributions, and loads MCP tool servers via augagent MCPToolAdapter.
"""

import json
import logging
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("aughome.extensions")

try:
    from augagent.mcp_client import MCPToolAdapter, HAS_MCP
except ImportError:
    MCPToolAdapter = None
    HAS_MCP = False


@dataclass
class ExtensionContribution:
    """Represents contributions made by an extension."""
    tools: List[Dict[str, Any]] = field(default_factory=list)
    themes: List[Dict[str, Any]] = field(default_factory=list)
    languages: List[Dict[str, Any]] = field(default_factory=list)
    commands: List[Dict[str, Any]] = field(default_factory=list)
    mcp_servers: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtensionManifest:
    """Parsed manifest.json specification for an extension."""
    id: str
    name: str
    version: str = "0.1.0"
    description: str = ""
    publisher: str = "aughome"
    main: Optional[str] = None
    contributes: ExtensionContribution = field(default_factory=ExtensionContribution)


@dataclass
class ExtensionRecord:
    """In-memory extension instance with runtime state and directory path."""
    manifest: ExtensionManifest
    directory: str
    enabled: bool = True
    is_builtin: bool = False
    mcp_adapters: List[Any] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert record to JSON-serializable dictionary."""
        return {
            "id": self.manifest.id,
            "name": self.manifest.name,
            "version": self.manifest.version,
            "description": self.manifest.description,
            "publisher": self.manifest.publisher,
            "main": self.manifest.main,
            "enabled": self.enabled,
            "is_builtin": self.is_builtin,
            "directory": self.directory,
            "contributes": asdict(self.manifest.contributes),
        }


class ExtensionManager:
    """Manages discovery, loading, contribution aggregation, and lifecycle of extensions."""

    def __init__(
        self,
        extensions_dir: Optional[str] = None,
        user_extensions_dir: Optional[str] = None,
    ) -> None:
        if extensions_dir:
            self.extensions_dir = Path(extensions_dir)
        else:
            # Look for extensions/ directory in workspace
            curr = Path(__file__).resolve()
            # Try ascending up to find workspace root with extensions/
            candidate = curr.parent.parent.parent.parent / "extensions"
            if candidate.exists() and candidate.is_dir():
                self.extensions_dir = candidate
            else:
                self.extensions_dir = Path(os.getcwd()) / "extensions"

        if user_extensions_dir:
            self.user_extensions_dir = Path(user_extensions_dir)
        else:
            self.user_extensions_dir = Path.home() / ".aughome" / "extensions"

        self._extensions: Dict[str, ExtensionRecord] = {}
        self.discover_extensions()

    def discover_extensions(self) -> List[ExtensionRecord]:
        """Scan extensions directories and load valid extensions."""
        records: Dict[str, ExtensionRecord] = {}

        # 1. Built-in workspace extensions
        if self.extensions_dir.exists() and self.extensions_dir.is_dir():
            for child in self.extensions_dir.iterdir():
                if child.is_dir():
                    rec = self._load_from_dir(child, is_builtin=True)
                    if rec:
                        records[rec.manifest.id] = rec

        # 2. User installed extensions (~/.aughome/extensions)
        if self.user_extensions_dir.exists() and self.user_extensions_dir.is_dir():
            for child in self.user_extensions_dir.iterdir():
                if child.is_dir():
                    rec = self._load_from_dir(child, is_builtin=False)
                    if rec and rec.manifest.id not in records:
                        records[rec.manifest.id] = rec

        self._extensions = records
        return list(self._extensions.values())

    def _load_from_dir(self, dir_path: Path, is_builtin: bool) -> Optional[ExtensionRecord]:
        """Parse manifest.json or package.json within a directory."""
        manifest_path = dir_path / "manifest.json"
        pkg_path = dir_path / "package.json"

        data: Dict[str, Any] = {}
        if manifest_path.exists():
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                logger.warning("Failed to parse %s: %s", manifest_path, e)
                return None
        elif pkg_path.exists():
            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    pkg_data = json.load(f)
                data = {
                    "id": pkg_data.get("name", dir_path.name).replace("@aughome/extension-", ""),
                    "name": pkg_data.get("displayName", pkg_data.get("name", dir_path.name)),
                    "version": pkg_data.get("version", "0.1.0"),
                    "description": pkg_data.get("description", ""),
                    "publisher": pkg_data.get("author", "aughome"),
                    "main": pkg_data.get("main"),
                    "contributes": pkg_data.get("contributes", {}),
                }
            except Exception as e:
                logger.warning("Failed to parse %s: %s", pkg_path, e)
                return None
        else:
            return None

        ext_id = data.get("id") or dir_path.name
        raw_contrib = data.get("contributes", {})
        mcp_servers = raw_contrib.get("mcpServers") or raw_contrib.get("mcp_servers") or {}

        contrib = ExtensionContribution(
            tools=raw_contrib.get("tools", []),
            themes=raw_contrib.get("themes", []),
            languages=raw_contrib.get("languages", []),
            commands=raw_contrib.get("commands", []),
            mcp_servers=mcp_servers,
        )

        manifest = ExtensionManifest(
            id=ext_id,
            name=data.get("name", ext_id),
            version=data.get("version", "0.1.0"),
            description=data.get("description", ""),
            publisher=data.get("publisher", "aughome"),
            main=data.get("main"),
            contributes=contrib,
        )

        record = ExtensionRecord(
            manifest=manifest,
            directory=str(dir_path),
            enabled=True,
            is_builtin=is_builtin,
        )

        # Connect MCP tool servers if defined and MCP is installed
        if contrib.mcp_servers and MCPToolAdapter and HAS_MCP:
            for srv_name, srv_conf in contrib.mcp_servers.items():
                try:
                    cmd = srv_conf.get("command")
                    args = srv_conf.get("args", [])
                    env = srv_conf.get("env")
                    adapter = MCPToolAdapter(command=cmd, args=args, env=env, name=f"{ext_id}:{srv_name}")
                    record.mcp_adapters.append(adapter)
                except Exception as exc:
                    logger.debug("Could not initialize MCPToolAdapter for %s: %s", srv_name, exc)

        return record

    def get_extensions(self) -> List[ExtensionRecord]:
        """Return all discovered extensions."""
        return list(self._extensions.values())

    def get_extension(self, extension_id: str) -> Optional[ExtensionRecord]:
        """Get an extension by ID."""
        return self._extensions.get(extension_id)

    def toggle_extension(self, extension_id: str, enabled: Optional[bool] = None) -> ExtensionRecord:
        """Toggle or set the enabled state of an extension."""
        record = self._extensions.get(extension_id)
        if not record:
            raise KeyError(f"Extension '{extension_id}' not found.")
        if enabled is None:
            record.enabled = not record.enabled
        else:
            record.enabled = bool(enabled)
        return record

    def get_contributed_commands(self) -> List[Dict[str, Any]]:
        """Aggregate all commands contributed by enabled extensions."""
        commands = []
        for rec in self._extensions.values():
            if rec.enabled:
                for cmd in rec.manifest.contributes.commands:
                    cmd_copy = dict(cmd)
                    cmd_copy["extensionId"] = rec.manifest.id
                    commands.append(cmd_copy)
        return commands

    def get_contributed_themes(self) -> List[Dict[str, Any]]:
        """Aggregate all themes contributed by enabled extensions."""
        themes = []
        for rec in self._extensions.values():
            if rec.enabled:
                for theme in rec.manifest.contributes.themes:
                    theme_copy = dict(theme)
                    theme_copy["extensionId"] = rec.manifest.id
                    themes.append(theme_copy)
        return themes

    def get_contributed_languages(self) -> List[Dict[str, Any]]:
        """Aggregate all language definitions contributed by enabled extensions."""
        languages = []
        for rec in self._extensions.values():
            if rec.enabled:
                for lang in rec.manifest.contributes.languages:
                    lang_copy = dict(lang)
                    lang_copy["extensionId"] = rec.manifest.id
                    languages.append(lang_copy)
        return languages

    def get_contributed_tools(self) -> List[Dict[str, Any]]:
        """Aggregate all tool definitions contributed by enabled extensions."""
        tools = []
        for rec in self._extensions.values():
            if rec.enabled:
                for tool in rec.manifest.contributes.tools:
                    tool_copy = dict(tool)
                    tool_copy["extensionId"] = rec.manifest.id
                    tools.append(tool_copy)
        return tools
