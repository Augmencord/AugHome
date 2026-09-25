"""Model Router module for AugHome IDE.

Routes intelligence requests across tiered models:
- Tier 1: Fast inline completion (low latency)
- Tier 2: Reasoning and single-file refactoring
- Tier 3: Complex cross-file architectural changes
- Tier 4: Local offline fallback
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional


class ModelTier(str, Enum):
    """Execution tiers for model routing."""
    TIER_1_FAST = "tier_1_fast"
    TIER_2_REASONING = "tier_2_reasoning"
    TIER_3_HEAVY = "tier_3_heavy"
    TIER_4_LOCAL = "tier_4_local"


@dataclass(frozen=True)
class ModelDescriptor:
    """Descriptor defining model specifications."""
    model_id: str
    provider: str
    tier: ModelTier
    max_tokens: int
    supports_streaming: bool


class ModelRouter:
    """Dispatches tasks to the appropriate LLM model according to task requirements."""

    DEFAULT_CATALOG: Dict[str, ModelDescriptor] = {
        "gemini-2.5-flash": ModelDescriptor(
            model_id="gemini-2.5-flash",
            provider="google",
            tier=ModelTier.TIER_1_FAST,
            max_tokens=8192,
            supports_streaming=True,
        ),
        "claude-3-5-haiku": ModelDescriptor(
            model_id="claude-3-5-haiku",
            provider="anthropic",
            tier=ModelTier.TIER_1_FAST,
            max_tokens=8192,
            supports_streaming=True,
        ),
        "gemini-3.8-flash": ModelDescriptor(
            model_id="gemini-3.8-flash",
            provider="google",
            tier=ModelTier.TIER_2_REASONING,
            max_tokens=16384,
            supports_streaming=True,
        ),
        "claude-3-7-sonnet": ModelDescriptor(
            model_id="claude-3-7-sonnet",
            provider="anthropic",
            tier=ModelTier.TIER_2_REASONING,
            max_tokens=16384,
            supports_streaming=True,
        ),
        "claude-opus-4-6": ModelDescriptor(
            model_id="claude-opus-4-6",
            provider="anthropic",
            tier=ModelTier.TIER_3_HEAVY,
            max_tokens=32768,
            supports_streaming=True,
        ),
        "ollama-qwen-coder": ModelDescriptor(
            model_id="ollama-qwen-coder",
            provider="ollama",
            tier=ModelTier.TIER_4_LOCAL,
            max_tokens=8192,
            supports_streaming=True,
        ),
    }

    def __init__(self, catalog: Optional[Dict[str, ModelDescriptor]] = None) -> None:
        self._catalog: Dict[str, ModelDescriptor] = dict(catalog or self.DEFAULT_CATALOG)

    def get_model(self, model_id: str) -> ModelDescriptor:
        """Retrieve model metadata by ID."""
        if not model_id or not isinstance(model_id, str):
            raise ValueError("model_id must be a non-empty string.")
        if model_id not in self._catalog:
            raise KeyError(f"Model '{model_id}' is not registered in router catalog.")
        return self._catalog[model_id]

    def select_model_for_tier(self, tier: ModelTier) -> ModelDescriptor:
        """Select the preferred default model for a given tier."""
        if not isinstance(tier, ModelTier):
            raise TypeError(f"Invalid tier: expected ModelTier enum, got {type(tier).__name__}.")

        matching = [m for m in self._catalog.values() if m.tier == tier]
        if not matching:
            raise ValueError(f"No models registered under tier: {tier.value}")
        return matching[0]

    def list_models_by_tier(self, tier: ModelTier) -> List[ModelDescriptor]:
        """List all registered models within a tier."""
        return [m for m in self._catalog.values() if m.tier == tier]
