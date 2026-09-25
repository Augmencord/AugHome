"""Completion service module for AugHome IDE.

Re-exports completion classes from aughome.completion for backward compatibility.
"""

from aughome.completion import (
    CompletionEngine,
    CompletionItem,
    CompletionRequest,
    CompletionService,
    FIMFormat,
)

__all__ = [
    "CompletionEngine",
    "CompletionItem",
    "CompletionRequest",
    "CompletionService",
    "FIMFormat",
]
