"""Language Server Protocol (LSP) Bridge for AugHome IDE aughome package.

Provides stdio JSON-RPC 2.0 communication, lifecycle management (initialize,
initialized, shutdown, exit), automatic detection of language servers (pylsp,
typescript-language-server, rust-analyzer, gopls), and resilient AST symbol
fallbacks.
"""

import ast
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class LSPDiagnostic:
    """Represents a diagnostic issue reported by language intelligence."""
    file_path: str
    line: int
    column: int
    message: str
    severity: str = "error"  # 'error' | 'warning' | 'info' | 'hint'
    length: int = 1
    code: Optional[str] = None


@dataclass
class LSPPosition:
    line: int
    character: int


@dataclass
class LSPRange:
    start: LSPPosition
    end: LSPPosition


class JSONRPCMessage:
    """Utilities for encoding and decoding standard LSP JSON-RPC 2.0 messages."""

    @staticmethod
    def encode_payload(payload: Dict[str, Any]) -> bytes:
        """Encode a dictionary payload into an LSP stdio frame with Content-Length."""
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        header = f"Content-Length: {len(data)}\r\n\r\n".encode("utf-8")
        return header + data

    @staticmethod
    def decode_frame(raw_bytes: bytes) -> Tuple[Optional[Dict[str, Any]], bytes]:
        """Decode a single LSP JSON-RPC frame from a byte buffer.

        Returns (parsed_dict, remaining_bytes) or (None, original_bytes) if incomplete.
        """
        delimiter = b"\r\n\r\n"
        if delimiter not in raw_bytes:
            return None, raw_bytes

        header_part, rest = raw_bytes.split(delimiter, 1)
        headers = {}
        for line in header_part.decode("utf-8", errors="ignore").split("\r\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                headers[key.strip().lower()] = val.strip()

        content_length = int(headers.get("content-length", 0))
        if len(rest) < content_length:
            return None, raw_bytes

        body = rest[:content_length]
        remaining = rest[content_length:]
        try:
            parsed = json.loads(body.decode("utf-8"))
            return parsed, remaining
        except Exception:
            return None, remaining


class LSPProcess:
    """Manages an active stdio language server subprocess."""

    def __init__(
        self,
        command: str = "",
        root_uri: str = "",
        server_cmd: Optional[str] = None,
    ) -> None:
        self.command = server_cmd or command
        self.root_uri = root_uri
        self.process: Optional[subprocess.Popen] = None
        self._req_id = 0
        self.initialized = False
        self.capabilities: Dict[str, Any] = {}

    def start(self) -> bool:
        """Spawn the language server process over stdio pipes."""
        try:
            cmd_args = self.command.split()
            self.process = subprocess.Popen(
                cmd_args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
            )
            return True
        except Exception:
            self.process = None
            return False

    def send_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Send a JSON-RPC request and wait for a response."""
        if not self.process or not self.process.stdin or not self.process.stdout:
            return None

        self._req_id += 1
        req_id = self._req_id
        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {},
        }
        data = JSONRPCMessage.encode_payload(payload)
        try:
            self.process.stdin.write(data)
            self.process.stdin.flush()
            # Read response
            line = self.process.stdout.readline()
            if not line:
                return None
            length = 0
            while line and line.strip():
                if line.lower().startswith(b"content-length:"):
                    length = int(line.split(b":")[1].strip())
                line = self.process.stdout.readline()
            if length > 0:
                body = self.process.stdout.read(length)
                return json.loads(body.decode("utf-8"))
        except Exception:
            return None
        return None

    def send_notification(self, method: str, params: Optional[Dict[str, Any]] = None) -> None:
        """Send a JSON-RPC notification (no response expected)."""
        if not self.process or not self.process.stdin:
            return
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
        }
        data = JSONRPCMessage.encode_payload(payload)
        try:
            self.process.stdin.write(data)
            self.process.stdin.flush()
        except Exception:
            pass

    def initialize(self) -> Dict[str, Any]:
        """Perform the standard LSP initialize handshake."""
        if not self.process:
            if not self.start():
                return {}
        params = {
            "processId": os.getpid(),
            "rootUri": self.root_uri,
            "capabilities": {
                "textDocument": {
                    "hover": {"contentFormat": ["markdown", "plaintext"]},
                    "completion": {"completionItem": {"snippetSupport": True}},
                    "definition": {},
                    "publishDiagnostics": {},
                }
            },
        }
        res = self.send_request("initialize", params)
        if res and "result" in res:
            self.capabilities = res["result"].get("capabilities", {})
            self.send_notification("initialized", {})
            self.initialized = True
            return res["result"]
        return {}

    def shutdown(self) -> None:
        """Send shutdown request and exit notification, then terminate."""
        if self.process and self.initialized:
            try:
                self.send_request("shutdown")
                self.send_notification("exit")
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                if self.process:
                    self.process.kill()
            finally:
                self.process = None
                self.initialized = False


class LSPBridge:
    """Bridges LSP messaging between frontend editor, language servers, and AST fallback."""

    # Default command candidates for auto-detection
    AUTO_DETECT_COMMANDS = {
        "python": ["pylsp", "pyright-langserver --stdio", "python-lsp-server"],
        "typescript": ["typescript-language-server --stdio", "tsserver"],
        "javascript": ["typescript-language-server --stdio", "tsserver"],
        "rust": ["rust-analyzer"],
        "go": ["gopls"],
    }

    def __init__(self, workspace_root: Optional[str] = None, auto_detect: bool = False) -> None:
        self.workspace_root = workspace_root or os.getcwd()
        self._active_servers: Dict[str, str] = {}
        self._running_processes: Dict[str, LSPProcess] = {}
        self._diagnostics_cache: Dict[str, List[LSPDiagnostic]] = {}

        if auto_detect:
            self.auto_detect_servers()

    def auto_detect_servers(self) -> Dict[str, str]:
        """Scan PATH for available language servers and register them."""
        detected = {}
        for lang, candidates in self.AUTO_DETECT_COMMANDS.items():
            for cand in candidates:
                binary = cand.split()[0]
                if shutil.which(binary):
                    self.register_server(lang, cand)
                    detected[lang] = cand
                    break
        return detected

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

    def get_or_spawn_server(self, language_id: str) -> Optional[LSPProcess]:
        """Retrieve existing or spawn new LSP server process for language."""
        if language_id in self._running_processes:
            return self._running_processes[language_id]
        cmd = self.get_server_command(language_id)
        if not cmd:
            return None
        try:
            root_uri = f"file:///{self.workspace_root.replace(os.sep, '/')}"
            proc = LSPProcess(command=cmd, root_uri=root_uri)
            self._running_processes[language_id] = proc
            return proc
        except Exception:
            return None

    def initialize(self, language_id: str = "python") -> Dict[str, Any]:
        """Perform initialize handshake with language server."""
        proc = self.get_or_spawn_server(language_id)
        if proc:
            return proc.initialize()
        return {"capabilities": {}}

    def initialized(self, language_id: str = "python") -> None:
        """Send initialized notification to language server."""
        proc = self._running_processes.get(language_id)
        if proc:
            proc.send_notification("initialized", {})

    def shutdown(self, language_id: Optional[str] = None) -> None:
        """Send shutdown request and terminate language server process."""
        if language_id:
            proc = self._running_processes.pop(language_id, None)
            if proc:
                proc.shutdown()
        else:
            for proc in list(self._running_processes.values()):
                proc.shutdown()
            self._running_processes.clear()

    def exit(self, language_id: Optional[str] = None) -> None:
        """Send exit notification to language server process."""
        if language_id:
            proc = self._running_processes.get(language_id)
            if proc:
                proc.send_notification("exit", {})
        else:
            for proc in self._running_processes.values():
                proc.send_notification("exit", {})

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

    # ═══════════════════════════════════════════════════════════════════════════
    # Core LSP Operations (With Seamless AST / Static Heuristic Fallbacks)
    # ═══════════════════════════════════════════════════════════════════════════

    def get_diagnostics(
        self,
        file_path: str,
        content: Optional[str] = None,
        language_id: str = "python",
    ) -> List[LSPDiagnostic]:
        """Get diagnostics for a file buffer."""
        if not file_path:
            raise ValueError("file_path cannot be empty.")

        code = content
        if code is None and os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    code = f.read()
            except Exception:
                code = ""

        code = code or ""
        diagnostics: List[LSPDiagnostic] = []

        # Python syntax checking via standard library ast
        if language_id == "python" or file_path.endswith(".py"):
            try:
                ast.parse(code, filename=file_path)
            except SyntaxError as se:
                diag = LSPDiagnostic(
                    file_path=file_path,
                    line=se.lineno or 1,
                    column=se.offset or 1,
                    message=f"SyntaxError: {se.msg}",
                    severity="error",
                    length=max(1, len(se.text or "") - (se.offset or 0)),
                )
                diagnostics.append(diag)
            except Exception as exc:
                diagnostics.append(
                    LSPDiagnostic(
                        file_path=file_path,
                        line=1,
                        column=1,
                        message=f"Parse Error: {exc}",
                        severity="error",
                    )
                )

        # Cache for agent "fix errors" context
        self._diagnostics_cache[file_path] = diagnostics
        return diagnostics

    def get_hover(
        self,
        file_path: str,
        line: int,
        column: int,
        content: Optional[str] = None,
        language_id: str = "python",
    ) -> Dict[str, Any]:
        """Retrieve type information and docstring hover for a symbol."""
        if line < 1 or column < 1:
            raise ValueError("Line and column must be 1-indexed positive integers.")

        code = content or ""
        lines = code.splitlines()
        if not lines or line > len(lines):
            return {"contents": "No symbol information found."}

        target_line = lines[line - 1]
        col_idx = min(len(target_line), max(0, column - 1))

        # Extract identifier under cursor
        word = self._extract_word_at_column(target_line, col_idx)
        if not word:
            return {"contents": "No symbol at cursor."}

        # Python AST inspection fallback
        if (language_id == "python" or file_path.endswith(".py")) and code:
            try:
                tree = ast.parse(code)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == word:
                        args = [a.arg for a in node.args.args]
                        doc = ast.get_docstring(node) or "No docstring provided."
                        sig = f"def {word}({', '.join(args)}):"
                        return {
                            "contents": f"```python\n{sig}\n```\n\n{doc}",
                            "range": {"line": line, "start": col_idx, "end": col_idx + len(word)},
                        }
                    elif isinstance(node, ast.ClassDef) and node.name == word:
                        bases = [b.id for b in node.bases if isinstance(b, ast.Name)]
                        doc = ast.get_docstring(node) or "No docstring provided."
                        sig = f"class {word}({', '.join(bases)}):" if bases else f"class {word}:"
                        return {
                            "contents": f"```python\n{sig}\n```\n\n{doc}",
                            "range": {"line": line, "start": col_idx, "end": col_idx + len(word)},
                        }
            except Exception:
                pass

        # TypeScript / JavaScript heuristics
        if any(file_path.endswith(ext) for ext in [".ts", ".tsx", ".js", ".jsx"]):
            match = re.search(rf"(?:function|const|let|var|class|interface|type)\s+{word}\b.*", code)
            if match:
                return {
                    "contents": f"```typescript\n{match.group(0).split('{')[0].strip()}\n```",
                    "range": {"line": line, "start": col_idx, "end": col_idx + len(word)},
                }

        return {
            "contents": f"**{word}**\n\n`{language_id}` symbol in `{Path(file_path).name}`",
            "range": {"line": line, "start": col_idx, "end": col_idx + len(word)},
        }

    def get_definition(
        self,
        file_path: str,
        line: int,
        column: int,
        content: Optional[str] = None,
        language_id: str = "python",
    ) -> List[Dict[str, Any]]:
        """Find definition locations for symbol under cursor."""
        if line < 1 or column < 1:
            raise ValueError("Line and column must be 1-indexed positive integers.")

        code = content or ""
        lines = code.splitlines()
        if not lines or line > len(lines):
            return []

        target_line = lines[line - 1]
        col_idx = min(len(target_line), max(0, column - 1))
        word = self._extract_word_at_column(target_line, col_idx)
        if not word:
            return []

        locations = []
        # Python AST symbol definition lookup
        if (language_id == "python" or file_path.endswith(".py")) and code:
            try:
                tree = ast.parse(code)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name == word:
                        locations.append({
                            "uri": f"file:///{file_path.replace(os.sep, '/')}",
                            "range": {
                                "start": {"line": node.lineno, "character": node.col_offset + 1},
                                "end": {"line": node.lineno, "character": node.col_offset + len(word) + 1},
                            },
                        })
            except Exception:
                pass

        # Regex search definition in lines
        if not locations:
            patterns = [
                rf"^\s*(?:def|class|function|const|let|var|type|interface|fn)\s+{re.escape(word)}\b",
                rf"^\s*{re.escape(word)}\s*=",
            ]
            for idx, text in enumerate(lines, start=1):
                for pat in patterns:
                    m = re.search(pat, text)
                    if m:
                        locations.append({
                            "uri": f"file:///{file_path.replace(os.sep, '/')}",
                            "range": {
                                "start": {"line": idx, "character": m.start() + 1},
                                "end": {"line": idx, "character": m.end() + 1},
                            },
                        })
                        break

        return locations

    def get_completion(
        self,
        file_path: str,
        line: int,
        column: int,
        content: Optional[str] = None,
        language_id: str = "python",
    ) -> List[Dict[str, Any]]:
        """Return completion items based on document tokens and keywords."""
        code = content or ""
        lines = code.splitlines()
        prefix = ""
        if lines and line <= len(lines):
            target_line = lines[line - 1]
            sub = target_line[:max(0, column - 1)]
            match = re.search(r"([A-Za-z_][A-Za-z0-9_]*)$", sub)
            prefix = match.group(1) if match else ""

        # Extract tokens from code
        tokens = set(re.findall(r"\b[A-Za-z_][A-Za-z0-9_]{2,}\b", code))

        # Language keywords
        lang_keywords = {
            "python": ["def", "class", "import", "from", "return", "if", "elif", "else", "try", "except", "async", "await", "with"],
            "typescript": ["function", "const", "let", "class", "interface", "type", "import", "export", "return", "async", "await"],
            "javascript": ["function", "const", "let", "class", "import", "export", "return", "async", "await"],
            "rust": ["fn", "struct", "enum", "impl", "let", "mut", "use", "pub", "match", "return"],
            "go": ["func", "type", "struct", "interface", "package", "import", "return", "var"],
        }
        keywords = lang_keywords.get(language_id, lang_keywords["python"])
        tokens.update(keywords)

        items = []
        for tok in sorted(tokens):
            if not prefix or tok.lower().startswith(prefix.lower()):
                items.append({
                    "label": tok,
                    "kind": 14 if tok in keywords else 6,  # 14=Keyword, 6=Variable
                    "detail": f"{language_id} symbol" if tok not in keywords else "keyword",
                    "insert_text": tok,
                })

        return items[:50]

    def rename_symbol(
        self,
        file_path: str,
        line: int,
        column: int,
        new_name: str,
        content: Optional[str] = None,
        language_id: str = "python",
    ) -> Dict[str, Any]:
        """Perform symbol rename across the document."""
        if not new_name or not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", new_name):
            raise ValueError("new_name must be a valid identifier.")

        code = content or ""
        lines = code.splitlines(keepends=True)
        if not lines or line > len(lines):
            raise ValueError("Target coordinate is out of bounds.")

        target_line = lines[line - 1]
        col_idx = min(len(target_line), max(0, column - 1))
        old_name = self._extract_word_at_column(target_line, col_idx)
        if not old_name:
            raise ValueError("No symbol found at given coordinates.")

        edits = []
        for line_no, text in enumerate(lines, start=1):
            for match in re.finditer(rf"\b{re.escape(old_name)}\b", text):
                edits.append({
                    "range": {
                        "start": {"line": line_no, "character": match.start() + 1},
                        "end": {"line": line_no, "character": match.end() + 1},
                    },
                    "newText": new_name,
                })

        uri = f"file:///{file_path.replace(os.sep, '/')}"
        return {"changes": {uri: edits}}

    def get_cached_diagnostics_summary(self) -> str:
        """Format active cached diagnostics as text context for AI chat prompts."""
        if not self._diagnostics_cache:
            return ""

        summary_lines = []
        for path, diags in self._diagnostics_cache.items():
            if diags:
                summary_lines.append(f"Diagnostics for {Path(path).name}:")
                for d in diags:
                    summary_lines.append(f"  - Line {d.line}, Col {d.column} [{d.severity}]: {d.message}")
        return "\n".join(summary_lines)

    @staticmethod
    def _extract_word_at_column(line_text: str, column_idx: int) -> str:
        """Extract identifier string at a specific zero-based column position."""
        if not line_text:
            return ""
        col = max(0, min(column_idx, len(line_text) - 1))
        # Find start
        start = col
        while start > 0 and (line_text[start - 1].isalnum() or line_text[start - 1] == "_"):
            start -= 1
        # Find end
        end = col
        while end < len(line_text) and (line_text[end].isalnum() or line_text[end] == "_"):
            end += 1
        return line_text[start:end]
