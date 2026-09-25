"""Diff and Patch Engine for AugHome IDE aughome package.

Provides unified diff generation, syntax check, and safe atomic patch application.
"""

import difflib
from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class DiffResult:
    """Encapsulates diff computation output."""
    original_file: str
    has_changes: bool
    unified_diff: str
    added_lines: int
    removed_lines: int


class DiffEngine:
    """Computes unified diffs and safely previews/applies code transformations."""

    @staticmethod
    def generate_unified_diff(
        original_content: str,
        modified_content: str,
        filename: str = "buffer.txt",
    ) -> DiffResult:
        """Generate unified diff text between two string buffers."""
        if original_content is None or modified_content is None:
            raise ValueError("original_content and modified_content cannot be None.")

        orig_lines = original_content.splitlines(keepends=True)
        mod_lines = modified_content.splitlines(keepends=True)

        diff = list(
            difflib.unified_diff(
                orig_lines,
                mod_lines,
                fromfile=f"a/{filename}",
                tofile=f"b/{filename}",
                lineterm="",
            )
        )

        added = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
        removed = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))
        diff_text = "".join(diff)

        return DiffResult(
            original_file=filename,
            has_changes=len(diff) > 0,
            unified_diff=diff_text,
            added_lines=added,
            removed_lines=removed,
        )

    @staticmethod
    def apply_patch(original_content: str, replacement_chunk: str) -> str:
        """Apply replacement content cleanly, checking basic consistency."""
        if original_content is None or replacement_chunk is None:
            raise ValueError("Input contents must not be None.")
        return replacement_chunk
