"""Unit and integration tests for LSP Bridge and API endpoints.

Covers JSON-RPC 2.0 stdio framing, lifecycle mechanics, auto-detection,
diagnostics, hover, definition, completion, rename, and agent context injection.
"""

import json
import os
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from aughome.lsp_bridge import (
    JSONRPCMessage,
    LSPBridge,
    LSPDiagnostic,
    LSPProcess,
)
from aughome.server import app


class TestJSONRPCFraming(unittest.TestCase):
    """Test standard LSP JSON-RPC 2.0 message encoding and decoding."""

    def test_encode_and_decode_roundtrip(self) -> None:
        """Verify message payload encodes with Content-Length and decodes cleanly."""
        payload = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
        raw = JSONRPCMessage.encode_payload(payload)
        self.assertTrue(raw.startswith(b"Content-Length: "))
        self.assertIn(b"\r\n\r\n", raw)

        parsed, remaining = JSONRPCMessage.decode_frame(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["method"], "initialize")
        self.assertEqual(len(remaining), 0)

    def test_decode_incomplete_frame_returns_none(self) -> None:
        """Verify incomplete buffer returns None without consuming bytes."""
        payload = {"jsonrpc": "2.0", "id": 2, "result": "ok"}
        raw = JSONRPCMessage.encode_payload(payload)
        truncated = raw[:len(raw) - 5]

        parsed, remaining = JSONRPCMessage.decode_frame(truncated)
        self.assertIsNone(parsed)
        self.assertEqual(remaining, truncated)


class TestLSPBridgeOperations(unittest.TestCase):
    """Test LSPBridge auto-detection and language intelligence engines."""

    def setUp(self) -> None:
        self.bridge = LSPBridge()

    def test_auto_detect_servers_returns_dict(self) -> None:
        """Verify auto-detection returns a dictionary of registered language commands."""
        detected = self.bridge.auto_detect_servers()
        self.assertIsInstance(detected, dict)

    def test_diagnostics_python_syntax_error(self) -> None:
        """Verify AST diagnostics report syntax error line and message."""
        bad_code = "def broken(\n    return 1"
        diags = self.bridge.get_diagnostics("bad.py", content=bad_code, language_id="python")
        self.assertEqual(len(diags), 1)
        self.assertEqual(diags[0].file_path, "bad.py")
        self.assertIn("SyntaxError", diags[0].message)

    def test_diagnostics_clean_code_empty_list(self) -> None:
        """Verify clean code produces no diagnostics."""
        clean_code = "def valid():\n    return True\n"
        diags = self.bridge.get_diagnostics("clean.py", content=clean_code, language_id="python")
        self.assertEqual(len(diags), 0)

    def test_diagnostics_empty_filepath_raises_error(self) -> None:
        """Verify empty file path raises ValueError."""
        with self.assertRaises(ValueError):
            self.bridge.get_diagnostics("", content="print(1)")

    def test_hover_python_function_signature_and_doc(self) -> None:
        """Verify hover extracts function signature and docstrings."""
        code = 'def calculate(a, b):\n    """Sum two numbers."""\n    return a + b\n'
        hover = self.bridge.get_hover("calc.py", line=1, column=5, content=code, language_id="python")
        self.assertIn("def calculate(a, b):", hover["contents"])
        self.assertIn("Sum two numbers.", hover["contents"])

    def test_hover_typescript_symbol(self) -> None:
        """Verify hover extracts TypeScript definition."""
        ts_code = "export const MAX_RETRY_COUNT = 5;\n"
        hover = self.bridge.get_hover("consts.ts", line=1, column=14, content=ts_code, language_id="typescript")
        self.assertIn("MAX_RETRY_COUNT", hover["contents"])

    def test_hover_invalid_coordinates_raises_error(self) -> None:
        """Verify non-positive coordinates raise ValueError."""
        with self.assertRaises(ValueError):
            self.bridge.get_hover("test.py", line=0, column=1)

    def test_definition_python_ast_lookup(self) -> None:
        """Verify go-to-definition locates source line and column."""
        code = "def my_helper():\n    pass\n\nval = my_helper()\n"
        locations = self.bridge.get_definition("script.py", line=4, column=8, content=code, language_id="python")
        self.assertGreater(len(locations), 0)
        self.assertEqual(locations[0]["range"]["start"]["line"], 1)

    def test_completion_extracts_tokens_and_keywords(self) -> None:
        """Verify completion returns language keywords and identifier symbols."""
        code = "user_account = 'admin'\nuser_id = 42\n"
        # Test filtered by prefix 'user'
        items = self.bridge.get_completion("app.py", line=2, column=5, content=code, language_id="python")
        labels = [item["label"] for item in items]
        self.assertIn("user_account", labels)
        self.assertIn("user_id", labels)

        # Test empty prefix returns keywords
        all_items = self.bridge.get_completion("app.py", line=1, column=1, content=code, language_id="python")
        all_labels = [item["label"] for item in all_items]
        self.assertIn("import", all_labels)
        self.assertIn("def", all_labels)

    def test_rename_symbol_success(self) -> None:
        """Verify renaming identifier updates all token occurrences."""
        code = "count = 1\ncount = count + 1\nprint(count)\n"
        res = self.bridge.rename_symbol("counter.py", line=1, column=2, new_name="total", content=code)
        self.assertIn("changes", res)
        edits = list(res["changes"].values())[0]
        self.assertEqual(len(edits), 4)

    def test_rename_invalid_identifier_raises_error(self) -> None:
        """Verify invalid new_name raises ValueError."""
        with self.assertRaises(ValueError):
            self.bridge.rename_symbol("test.py", line=1, column=1, new_name="123invalid", content="val = 1")

    def test_cached_diagnostics_summary(self) -> None:
        """Verify diagnostics caching formats context for AI prompt."""
        self.bridge.get_diagnostics("demo.py", content="def err(\n", language_id="python")
        summary = self.bridge.get_cached_diagnostics_summary()
        self.assertIn("Diagnostics for demo.py:", summary)
        self.assertIn("SyntaxError", summary)

    def test_lifecycle_methods_execute_without_error(self) -> None:
        """Verify initialize, initialized, shutdown, and exit handle unspawned or mock servers gracefully."""
        # Unregistered / uninstalled language server returns empty capabilities
        init_res = self.bridge.initialize("uninstalled_lang")
        self.assertEqual(init_res, {"capabilities": {}})

        # initialized notification succeeds
        self.bridge.initialized("uninstalled_lang")

        # exit notification succeeds
        self.bridge.exit("uninstalled_lang")

        # shutdown succeeds
        self.bridge.shutdown("uninstalled_lang")
        self.bridge.shutdown()


class TestLSPAPIEndpoints(unittest.TestCase):
    """Test FastAPI /v1/lsp/* REST endpoints."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_post_diagnostics_endpoint(self) -> None:
        """Verify POST /v1/lsp/diagnostics returns diagnostic items."""
        payload = {
            "file_path": "sample.py",
            "content": "def syntax_err(\n",
            "language_id": "python",
        }
        res = self.client.post("/v1/lsp/diagnostics", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["file_path"], "sample.py")
        self.assertGreater(len(data["diagnostics"]), 0)

    def test_post_hover_endpoint(self) -> None:
        """Verify POST /v1/lsp/hover returns symbol documentation."""
        payload = {
            "file_path": "main.py",
            "line": 1,
            "column": 5,
            "content": "def add(x, y):\n    return x + y\n",
            "language_id": "python",
        }
        res = self.client.post("/v1/lsp/hover", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("contents", res.json())

    def test_post_definition_endpoint(self) -> None:
        """Verify POST /v1/lsp/definition returns symbol locations."""
        payload = {
            "file_path": "main.py",
            "line": 3,
            "column": 2,
            "content": "class Runner:\n    pass\nRunner()\n",
            "language_id": "python",
        }
        res = self.client.post("/v1/lsp/definition", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("locations", res.json())

    def test_post_completion_endpoint(self) -> None:
        """Verify POST /v1/lsp/completion returns suggestions."""
        payload = {
            "file_path": "script.py",
            "line": 1,
            "column": 1,
            "content": "const greeting = 'hello';\n",
            "language_id": "typescript",
        }
        res = self.client.post("/v1/lsp/completion", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("items", res.json())

    def test_post_rename_endpoint(self) -> None:
        """Verify POST /v1/lsp/rename returns workspace text edits."""
        payload = {
            "file_path": "counter.py",
            "line": 1,
            "column": 1,
            "new_name": "counter_val",
            "content": "val = 10\nprint(val)\n",
            "language_id": "python",
        }
        res = self.client.post("/v1/lsp/rename", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("changes", res.json())

    def test_chat_sse_feeds_diagnostics_for_fix_errors_prompt(self) -> None:
        """Verify chat SSE includes LSP diagnostic context when fixing errors."""
        # First trigger a diagnostic into the cache
        self.client.post(
            "/v1/lsp/diagnostics",
            json={"file_path": "broken.py", "content": "def bug(\n", "language_id": "python"},
        )
        # Ask chat to fix errors
        chat_payload = {
            "messages": [{"role": "user", "content": "Please fix errors in this file"}],
            "stream": True,
        }
        res = self.client.post("/v1/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200)
        text = res.text
        self.assertIn("diagnostics", text.lower())


if __name__ == "__main__":
    unittest.main()
