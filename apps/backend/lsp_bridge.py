"""Language Server Protocol (LSP) Bridge for AugHome IDE.

Acts as an intermediary bridging Monaco editor language requests with
local language servers (Pyright, TypeScript, Rust Analyzer) and
augagent's AST symbol indexing.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class LSPDiagnostic:
    """Represents a diagnostic issue reported by language intelligence."""
    file_path: str
    line: int
    column: int
    message: str
    severity: str  # 'error' | 'warning' | 'info' | 'hint'


class LSPBridge:
    """Bridges LSP messaging between frontend editor and language engines."""

    def __init__(self) -> None:
        self._active_servers: Dict[str, str] = {}

    def register_server(self, language_id: str, server_command: str) -> None:
        """Register a language server command for a given language."""
        if not language_id or not server_command:
            raise ValueError("language_id and server_command must be non-empty strings.")
        self._active_servers[language_id] = server_command

    def is_server_registered(self, language_id: str) -> bool:
        """Check if a language server is registered."""
        return language_id in self._active_servers

    def get_server_command(self, language_id: str) -> Optional[str]:
        """Get the executable command configured for a language."""
        return self._active_servers.get(language_id)

    def format_diagnostic(
        self,
        file_path: str,
        line: int,
        column: int,
        message: str,
        severity: str = "error",
    ) -> LSPDiagnostic:
        """Format an LSP diagnostic item."""
        if line < 0 or column < 0:
            raise ValueError("Line and column indices must be non-negative.")
        return LSPDiagnostic(
            file_path=file_path,
            line=line,
            column=column,
            message=message,
            severity=severity,
        )
