"""Completion service module for AugHome IDE.

Coordinates multi-line inline completions and snippet completions
using augagent and the tiered model router.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from model_router import ModelRouter, ModelTier


@dataclass(frozen=True)
class CompletionRequest:
    """Request payload for an AI completion."""
    file_path: str
    prefix: str
    suffix: str
    language_id: str
    max_tokens: int = 128


@dataclass(frozen=True)
class CompletionItem:
    """Individual completion proposal."""
    insert_text: str
    model_id: str
    confidence_score: float


class CompletionService:
    """Handles inline completions for the editor canvas."""

    def __init__(self, router: Optional[ModelRouter] = None) -> None:
        self.router = router or ModelRouter()

    def generate_completion(self, request: CompletionRequest) -> List[CompletionItem]:
        """Generate code completion items for the requested buffer location."""
        if not request.file_path:
            raise ValueError("file_path must not be empty.")
        if request.max_tokens <= 0:
            raise ValueError("max_tokens must be greater than zero.")

        # Default fast completion uses Tier 1 model
        model = self.router.select_model_for_tier(ModelTier.TIER_1_FAST)

        # Baseline completion logic placeholder (integrated with augagent engine)
        suggested_text = ""
        stripped_prefix = request.prefix.rstrip()
        if stripped_prefix.endswith("def"):
            suggested_text = "main():\n    pass"
        elif stripped_prefix.endswith("function"):
            suggested_text = "init() {\n  return true;\n}"

        return [
            CompletionItem(
                insert_text=suggested_text,
                model_id=model.model_id,
                confidence_score=0.95,
            )
        ]
