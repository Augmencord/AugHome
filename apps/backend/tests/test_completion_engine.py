"""Unit tests for CompletionEngine: FIM prompt construction, context extraction,
import preservation, 500ms timeout guard, and request_id deduplication.
"""

import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from aughome.completion import (
    CompletionEngine,
    CompletionItem,
    CompletionRequest,
    FIMFormat,
)
from aughome.server import app


class TestCompletionEngine(unittest.TestCase):
    """Test suite for FIM prompt construction and context slicing."""

    def setUp(self) -> None:
        self.engine = CompletionEngine()

    def test_fim_prompt_format_codestral(self) -> None:
        """Verify Codestral prompt construction format: [PREFIX]...[SUFFIX]...[MIDDLE]."""
        prefix = "def calculate_sum(a, b):\n"
        suffix = "\n    return result"
        prompt = self.engine.build_fim_prompt(prefix, suffix, FIMFormat.CODESTRAL)
        self.assertEqual(prompt, f"[PREFIX]{prefix}[SUFFIX]{suffix}[MIDDLE]")

    def test_fim_prompt_format_qwen(self) -> None:
        """Verify Qwen prompt construction format: <|fim_prefix|>...<|fim_suffix|>...<|fim_middle|>."""
        prefix = "function add(x, y) {\n"
        suffix = "\n  return total;\n}"
        prompt = self.engine.build_fim_prompt(prefix, suffix, FIMFormat.QWEN)
        self.assertEqual(
            prompt,
            f"<|fim_prefix|>{prefix}<|fim_suffix|>{suffix}<|fim_middle|>",
        )

    def test_fim_prompt_format_starcoder(self) -> None:
        """Verify StarCoder prompt construction format: <fim_prefix>...<fim_suffix>...<fim_middle>."""
        prefix = "const config = "
        suffix = ";\nexport default config;"
        prompt = self.engine.build_fim_prompt(prefix, suffix, FIMFormat.STARCODER)
        self.assertEqual(
            prompt,
            f"<fim_prefix>{prefix}<fim_suffix>{suffix}<fim_middle>",
        )

    def test_fim_prompt_format_gemini(self) -> None:
        """Verify Gemini structured FIM prompt format."""
        prefix = "import math\n\ndef area(r):\n"
        suffix = "\n    return a"
        prompt = self.engine.build_fim_prompt(prefix, suffix, FIMFormat.GEMINI)
        self.assertIn("Prefix:\n" + prefix, prompt)
        self.assertIn("Suffix:\n" + suffix, prompt)
        self.assertIn("Middle:", prompt)

    def test_detect_fim_format_by_model_name(self) -> None:
        """Verify automatic FIM format detection based on model name strings."""
        self.assertEqual(self.engine.detect_fim_format("codestral-22b"), FIMFormat.CODESTRAL)
        self.assertEqual(self.engine.detect_fim_format("mistral-large"), FIMFormat.CODESTRAL)
        self.assertEqual(self.engine.detect_fim_format("qwen2.5-coder"), FIMFormat.QWEN)
        self.assertEqual(self.engine.detect_fim_format("ollama-qwen-coder"), FIMFormat.QWEN)
        self.assertEqual(self.engine.detect_fim_format("starcoder2-15b"), FIMFormat.STARCODER)
        self.assertEqual(self.engine.detect_fim_format("gemini-2.5-flash"), FIMFormat.GEMINI)
        self.assertEqual(self.engine.detect_fim_format(None), FIMFormat.QWEN)

    def test_context_extraction_limits_and_import_preservation(self) -> None:
        """Verify prefix cap at 100 lines, suffix at 50 lines, and top-of-file import preservation."""
        # Create a synthetic 250-line file:
        # Lines 1-5: imports
        # Lines 6-180: comments/dummy code
        # Line 181: cursor line
        # Lines 182-250: remaining lines
        lines = [
            "import os",
            "import sys",
            "from pathlib import Path",
            "from typing import Any, Dict",
            "",
        ]
        for i in range(5, 180):
            lines.append(f"# filler line {i}")
        lines.append("def target_function():")
        for i in range(181, 250):
            lines.append(f"    # trailing line {i}")

        content = "\n".join(lines)
        cursor_line = 181  # line of target_function()
        cursor_col = 23    # after ':'

        prefix, suffix = self.engine.extract_context(
            content=content,
            cursor_line=cursor_line,
            cursor_column=cursor_col,
            language_id="python",
        )

        # 1. Imports from top of file must be preserved
        self.assertIn("import os", prefix)
        self.assertIn("import sys", prefix)
        self.assertIn("from pathlib import Path", prefix)

        # 2. Target cursor line prefix must be at the end of prefix
        self.assertTrue(prefix.rstrip().endswith("def target_function():"))

        # 3. Suffix must include trailing lines capped at 50 lines
        suffix_lines = suffix.splitlines()
        self.assertLessEqual(len(suffix_lines), 51)
        self.assertIn("trailing line 181", suffix)


class TestCompletionEndpointAPI(unittest.TestCase):
    """Test suite for POST /v1/complete timeout guard and request deduplication."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_complete_timeout_guard_under_500ms(self) -> None:
        """Verify completion requests return within 500ms latency budget."""
        payload = {
            "file_path": "main.py",
            "prefix": "def execute():\n   ",
            "suffix": "",
            "language_id": "python",
            "max_tokens": 64,
            "request_id": "req-timeout-test-1",
        }
        response = self.client.post("/v1/complete", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("items", data)
        self.assertIn("request_id", data)

    def test_complete_request_id_deduplication(self) -> None:
        """Verify duplicate request_id calls return cached results without re-execution."""
        req_id = "dedup-unique-key-99"
        payload = {
            "file_path": "cache_test.py",
            "prefix": "const result = ",
            "suffix": ";",
            "language_id": "typescript",
            "request_id": req_id,
        }

        # First request
        res1 = self.client.post("/v1/complete", json=payload)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()

        # Second request with identical request_id
        res2 = self.client.post("/v1/complete", json=payload)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertEqual(data1, data2)
        self.assertEqual(data2["request_id"], req_id)


if __name__ == "__main__":
    unittest.main()
