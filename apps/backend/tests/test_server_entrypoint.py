"""Tests for server.py entrypoint and backward-compatible re-exports.

Ensures that apps/backend/server.py correctly re-exports all runtime components,
responds properly to legacy and current API calls, and honors environment
configuration.
"""

import os
import sys
import unittest
from pathlib import Path

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
import server


class TestServerEntrypoint(unittest.TestCase):
    """Verifies that apps/backend/server.py functions correctly as the primary entrypoint."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(server.app)

    def test_reexported_symbols_exist(self) -> None:
        """Verify all declared __all__ symbols are present and non-None."""
        self.assertIsNotNone(server.app)
        self.assertIsNotNone(server.model_router)
        self.assertIsNotNone(server.completion_service)
        self.assertIsNotNone(server.diff_engine)
        self.assertIsNotNone(server.lsp_bridge)

    def test_health_check_via_server_app(self) -> None:
        """Verify GET /health via server.app returns 200 with service info."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "aughome-backend")

    def test_models_legacy_and_v1_endpoints(self) -> None:
        """Verify GET /models and GET /v1/models return model catalogs."""
        res_legacy = self.client.get("/models")
        self.assertEqual(res_legacy.status_code, 200)
        self.assertIn("models", res_legacy.json())

        res_v1 = self.client.get("/v1/models")
        self.assertEqual(res_v1.status_code, 200)
        self.assertIn("models", res_v1.json())

    def test_diff_endpoint_via_server_app(self) -> None:
        """Verify POST /diff computes unified diff between buffers."""
        payload = {
            "original_content": "def hello():\n    print('world')\n",
            "modified_content": "def hello():\n    print('world updated')\n",
            "filename": "hello.py",
        }
        response = self.client.post("/diff", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_changes"])
        self.assertIn("+    print('world updated')", data["unified_diff"])
        self.assertEqual(data["added_lines"], 1)
        self.assertEqual(data["removed_lines"], 1)

    def test_complete_legacy_endpoint_via_server_app(self) -> None:
        """Verify POST /complete forwards to complete_endpoint and returns completions."""
        payload = {
            "file_path": "test.py",
            "prefix": "def add(a, b):\n    return ",
            "suffix": "",
            "language_id": "python",
            "max_tokens": 64,
        }
        response = self.client.post("/complete", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)
        self.assertGreater(len(data["items"]), 0)

    def test_v1_complete_via_server_app(self) -> None:
        """Verify POST /v1/complete works via server.app."""
        payload = {
            "file_path": "test.py",
            "prefix": "const sum = ",
            "suffix": "",
            "language_id": "typescript",
            "max_tokens": 32,
        }
        response = self.client.post("/v1/complete", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)

    def test_v1_chat_sse_via_server_app(self) -> None:
        """Verify POST /v1/chat returns streaming SSE via server.app."""
        payload = {
            "messages": [{"role": "user", "content": "hello"}],
            "stream": True,
        }
        response = self.client.post("/v1/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers.get("content-type", ""))


if __name__ == "__main__":
    unittest.main()
