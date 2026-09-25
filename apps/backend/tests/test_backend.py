"""Unit tests for AugHome IDE backend modules.

Uses Python standard library unittest to ensure zero-dependency test execution.
Covers happy paths, edge cases, and failure modes across model_router, diff_engine,
completion, and lsp_bridge.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path so modules can be imported directly
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from model_router import ModelRouter, ModelTier, ModelDescriptor
from diff_engine import DiffEngine, DiffResult
from completion import CompletionService, CompletionRequest
from lsp_bridge import LSPBridge, LSPDiagnostic


class TestModelRouter(unittest.TestCase):
    """Tests for ModelRouter module."""

    def setUp(self) -> None:
        self.router = ModelRouter()

    def test_get_registered_model_happy_path(self) -> None:
        """Verify retrieval of an existing model descriptor."""
        model = self.router.get_model("gemini-3.8-flash")
        self.assertIsNotNone(model)
        self.assertEqual(model.model_id, "gemini-3.8-flash")
        self.assertEqual(model.provider, "google")
        self.assertEqual(model.tier, ModelTier.TIER_2_REASONING)
        self.assertTrue(model.supports_streaming)

    def test_select_model_for_tier(self) -> None:
        """Verify selection of a model for each valid tier."""
        for tier in ModelTier:
            model = self.router.select_model_for_tier(tier)
            self.assertEqual(model.tier, tier)

    def test_get_unregistered_model_raises_key_error(self) -> None:
        """Verify KeyError when requesting a non-existent model."""
        with self.assertRaises(KeyError):
            self.router.get_model("non-existent-model-xyz")

    def test_get_model_invalid_input_type(self) -> None:
        """Verify ValueError when passing an empty or invalid model_id."""
        with self.assertRaises(ValueError):
            self.router.get_model("")

    def test_select_model_invalid_tier_type(self) -> None:
        """Verify TypeError when passing non-ModelTier object."""
        with self.assertRaises(TypeError):
            self.router.select_model_for_tier("tier_1_fast")  # type: ignore


class TestDiffEngine(unittest.TestCase):
    """Tests for DiffEngine module."""

    def test_diff_identical_content(self) -> None:
        """Verify diff computation on identical buffers produces no changes."""
        content = "def test():\n    pass\n"
        res = DiffEngine.generate_unified_diff(content, content, "sample.py")
        self.assertFalse(res.has_changes)
        self.assertEqual(res.added_lines, 0)
        self.assertEqual(res.removed_lines, 0)
        self.assertEqual(res.unified_diff, "")

    def test_diff_modified_content(self) -> None:
        """Verify diff detection when content changes."""
        orig = "line 1\nline 2\n"
        mod = "line 1\nline 2 modified\nline 3 added\n"
        res = DiffEngine.generate_unified_diff(orig, mod, "test.txt")
        self.assertTrue(res.has_changes)
        self.assertGreater(res.added_lines, 0)
        self.assertIn("+line 3 added", res.unified_diff)

    def test_diff_none_inputs_raises_value_error(self) -> None:
        """Verify ValueError is raised if either input is None."""
        with self.assertRaises(ValueError):
            DiffEngine.generate_unified_diff(None, "code")  # type: ignore
        with self.assertRaises(ValueError):
            DiffEngine.generate_unified_diff("code", None)  # type: ignore

    def test_apply_patch_happy_path(self) -> None:
        """Verify apply_patch returns replaced chunk."""
        res = DiffEngine.apply_patch("old", "new")
        self.assertEqual(res, "new")

    def test_apply_patch_none_raises_value_error(self) -> None:
        """Verify ValueError when None is passed to apply_patch."""
        with self.assertRaises(ValueError):
            DiffEngine.apply_patch(None, "new")  # type: ignore


class TestCompletionService(unittest.TestCase):
    """Tests for CompletionService."""

    def setUp(self) -> None:
        self.service = CompletionService()

    def test_completion_happy_path_python(self) -> None:
        """Verify completion for Python function header."""
        req = CompletionRequest(
            file_path="main.py",
            prefix="def ",
            suffix="",
            language_id="python",
            max_tokens=64,
        )
        items = self.service.generate_completion(req)
        self.assertTrue(len(items) > 0)
        self.assertIn("main():", items[0].insert_text)

    def test_completion_empty_filepath_raises_error(self) -> None:
        """Verify empty file_path raises ValueError."""
        req = CompletionRequest(
            file_path="",
            prefix="def ",
            suffix="",
            language_id="python",
        )
        with self.assertRaises(ValueError):
            self.service.generate_completion(req)

    def test_completion_negative_tokens_raises_error(self) -> None:
        """Verify non-positive max_tokens raises ValueError."""
        req = CompletionRequest(
            file_path="test.py",
            prefix="x = ",
            suffix="",
            language_id="python",
            max_tokens=-5,
        )
        with self.assertRaises(ValueError):
            self.service.generate_completion(req)


class TestLSPBridge(unittest.TestCase):
    """Tests for LSPBridge module."""

    def setUp(self) -> None:
        self.bridge = LSPBridge()

    def test_register_and_query_server(self) -> None:
        """Verify server registration and retrieval."""
        self.bridge.register_server("python", "pyright-langserver --stdio")
        self.assertTrue(self.bridge.is_server_registered("python"))
        self.assertEqual(
            self.bridge.get_server_command("python"),
            "pyright-langserver --stdio",
        )

    def test_unregistered_language_query(self) -> None:
        """Verify query on unregistered language returns False and None."""
        self.assertFalse(self.bridge.is_server_registered("rust"))
        self.assertIsNone(self.bridge.get_server_command("rust"))

    def test_register_invalid_args_raises_error(self) -> None:
        """Verify empty arguments raise ValueError."""
        with self.assertRaises(ValueError):
            self.bridge.register_server("", "server")
        with self.assertRaises(ValueError):
            self.bridge.register_server("python", "")

    def test_format_diagnostic_happy_path(self) -> None:
        """Verify diagnostic creation."""
        diag = self.bridge.format_diagnostic("app.py", 10, 5, "Syntax error", "error")
        self.assertEqual(diag.file_path, "app.py")
        self.assertEqual(diag.line, 10)
        self.assertEqual(diag.column, 5)
        self.assertEqual(diag.severity, "error")

    def test_format_diagnostic_negative_coords_raises_error(self) -> None:
        """Verify negative line/column coordinates raise ValueError."""
        with self.assertRaises(ValueError):
            self.bridge.format_diagnostic("app.py", -1, 0, "Error")


if __name__ == "__main__":
    unittest.main()
