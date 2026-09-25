"""Integration tests for AugHome IDE FastAPI backend endpoints.

Covers standard happy paths, edge cases, and failure modes across all 12 endpoints:
- GET /health
- POST /v1/chat (SSE streaming)
- POST /v1/complete (FIM completion)
- GET /v1/files/tree
- GET /v1/files/read
- POST /v1/files/write
- POST /v1/files/edit
- GET /v1/search
- GET /v1/git/status
- POST /v1/git/commit
- WebSocket /v1/terminal
- GET /v1/models
- POST /v1/models/configure
"""

import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from aughome.server import app


class TestAugHomeBackendAPI(unittest.TestCase):
    """Test suite covering AugHome backend REST and WebSocket APIs."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)
        # Create dedicated test sandbox directory
        cls.test_dir = tempfile.mkdtemp(prefix="aughome_api_test_")
        os.environ["AUGHOME_WORKSPACE"] = cls.test_dir

    @classmethod
    def tearDownClass(cls) -> None:
        shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_health_check_endpoint(self) -> None:
        """Verify GET /health returns 200 with healthy service status."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "aughome-backend")
        self.assertEqual(data["version"], "0.1.0")

    def test_chat_sse_streaming_happy_path(self) -> None:
        """Verify POST /v1/chat returns streaming SSE with token and done events."""
        payload = {
            "messages": [
                {"role": "user", "content": "Explain the project architecture"}
            ],
            "model": "gemini-2.5-flash",
            "stream": True,
        }
        response = self.client.post("/v1/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])
        body = response.text
        self.assertIn("event: token", body)
        self.assertIn("event: done", body)
        self.assertIn('"status": "completed"', body)

    def test_chat_empty_messages_raises_400(self) -> None:
        """Verify POST /v1/chat returns 400 when messages list is empty."""
        payload = {"messages": [], "model": "gemini-2.5-flash"}
        response = self.client.post("/v1/chat", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Messages list cannot be empty", response.json()["detail"])

    def test_fim_complete_happy_path(self) -> None:
        """Verify POST /v1/complete returns completion items."""
        payload = {
            "file_path": "server.py",
            "prefix": "def health_check",
            "suffix": "",
            "language_id": "python",
            "max_tokens": 64,
        }
        response = self.client.post("/v1/complete", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)
        self.assertIn("model", data)
        self.assertTrue(len(data["items"]) > 0)

    def test_fim_complete_empty_path_raises_400(self) -> None:
        """Verify POST /v1/complete returns 400 when file_path is empty."""
        payload = {
            "file_path": "",
            "prefix": "def ",
            "suffix": "",
            "language_id": "python",
        }
        response = self.client.post("/v1/complete", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_files_write_read_edit_lifecycle(self) -> None:
        """Verify file write, read, and edit lifecycle within sandbox."""
        rel_path = "subdir/sample.txt"
        initial_content = "Hello, AugHome IDE!"

        # 1. Write file
        write_res = self.client.post(
            "/v1/files/write",
            json={"path": rel_path, "content": initial_content, "overwrite": True},
        )
        self.assertEqual(write_res.status_code, 200)
        self.assertEqual(write_res.json()["status"], "written")

        # 2. Read file
        read_res = self.client.get(f"/v1/files/read?path={rel_path}")
        self.assertEqual(read_res.status_code, 200)
        read_data = read_res.json()
        self.assertEqual(read_data["content"], initial_content)
        self.assertEqual(read_data["lines"], 1)

        # 3. Edit file (targeted replace)
        edit_res = self.client.post(
            "/v1/files/edit",
            json={"path": rel_path, "target": "AugHome IDE", "replacement": "World"},
        )
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.json()["status"], "edited")

        # 4. Verify edited content
        verify_res = self.client.get(f"/v1/files/read?path={rel_path}")
        self.assertEqual(verify_res.json()["content"], "Hello, World!")

    def test_files_write_duplicate_without_overwrite_raises_409(self) -> None:
        """Verify POST /v1/files/write returns 409 Conflict when overwrite is False."""
        rel_path = "existing.txt"
        self.client.post("/v1/files/write", json={"path": rel_path, "content": "first", "overwrite": True})

        dup_res = self.client.post("/v1/files/write", json={"path": rel_path, "content": "second", "overwrite": False})
        self.assertEqual(dup_res.status_code, 409)

    def test_files_sandbox_traversal_violation_raises_403(self) -> None:
        """Verify accessing paths outside the workspace sandbox raises 403 Forbidden."""
        traversal_path = "../../outside_sandbox.txt"

        read_res = self.client.get(f"/v1/files/read?path={traversal_path}")
        self.assertEqual(read_res.status_code, 403)

        write_res = self.client.post("/v1/files/write", json={"path": traversal_path, "content": "exploit"})
        self.assertEqual(write_res.status_code, 403)

        edit_res = self.client.post("/v1/files/edit", json={"path": traversal_path, "target": "a", "replacement": "b"})
        self.assertEqual(edit_res.status_code, 403)

    def test_files_tree_endpoint(self) -> None:
        """Verify GET /v1/files/tree returns hierarchical structure."""
        response = self.client.get("/v1/files/tree")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("root", data)
        self.assertIn("tree", data)
        self.assertIsInstance(data["tree"], list)

    def test_search_endpoint(self) -> None:
        """Verify GET /v1/search queries workspace files."""
        # Create a file with searchable keyword
        self.client.post("/v1/files/write", json={"path": "searchable.py", "content": "KEYWORD_FOUND = 42\n", "overwrite": True})

        res = self.client.get("/v1/search?query=KEYWORD_FOUND")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["query"], "KEYWORD_FOUND")
        self.assertIn("matches", data)

    def test_search_empty_query_raises_400(self) -> None:
        """Verify GET /v1/search raises 400 when query is empty."""
        res = self.client.get("/v1/search?query=")
        self.assertEqual(res.status_code, 400)

    def test_git_status_endpoint(self) -> None:
        """Verify GET /v1/git/status returns working tree status."""
        res = self.client.get("/v1/git/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("branch", data)
        self.assertIn("staged", data)
        self.assertIn("unstaged", data)
        self.assertIn("untracked", data)

    def test_git_commit_endpoint(self) -> None:
        """Verify POST /v1/git/commit commits staged changes."""
        res = self.client.post("/v1/git/commit", json={"message": "Test commit message"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "committed")
        self.assertEqual(data["message"], "Test commit message")

    def test_git_commit_empty_message_raises_400(self) -> None:
        """Verify POST /v1/git/commit raises 400 when message is empty."""
        res = self.client.post("/v1/git/commit", json={"message": "   "})
        self.assertEqual(res.status_code, 400)

    def test_models_list_and_configure_endpoints(self) -> None:
        """Verify GET /v1/models and POST /v1/models/configure."""
        # 1. List models
        res = self.client.get("/v1/models")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("models", data)
        self.assertIn("tiers", data)
        self.assertIn("health", data)
        self.assertTrue(len(data["models"]) >= 4)

        # 2. Configure model
        cfg_res = self.client.post(
            "/v1/models/configure",
            json={
                "model_id": "gemini-2.5-flash",
                "api_key": "test-key-xyz",
                "enabled": True,
            },
        )
        self.assertEqual(cfg_res.status_code, 200)
        cfg_data = cfg_res.json()
        self.assertEqual(cfg_data["model_id"], "gemini-2.5-flash")
        self.assertEqual(cfg_data["api_key"], "test-key-xyz")

    def test_models_configure_unknown_model_raises_404(self) -> None:
        """Verify POST /v1/models/configure returns 404 for unknown model."""
        cfg_res = self.client.post(
            "/v1/models/configure",
            json={"model_id": "non-existent-model", "enabled": False},
        )
        self.assertEqual(cfg_res.status_code, 404)

    def test_terminal_websocket_endpoint(self) -> None:
        """Verify WebSocket /v1/terminal connection and command echo."""
        with self.client.websocket_connect("/v1/terminal") as websocket:
            banner = websocket.receive_text()
            self.assertIn("AugHome IDE Embedded Terminal", banner)

            # Send pwd command
            websocket.send_text("p")
            echo_p = websocket.receive_text()
            self.assertEqual(echo_p, "p")

            websocket.send_text("w")
            echo_w = websocket.receive_text()
            self.assertEqual(echo_w, "w")

            websocket.send_text("d")
            echo_d = websocket.receive_text()
            self.assertEqual(echo_d, "d")

            websocket.send_text("\r")
            nl = websocket.receive_text()
            self.assertIn("\r\n", nl)
            out = websocket.receive_text()
            self.assertTrue(len(out) > 0)


if __name__ == "__main__":
    unittest.main()
