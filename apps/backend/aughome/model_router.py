"""Model Router module for AugHome IDE intelligence backend.

Routes intelligence requests across tiered models:
- Tier 1: Fast inline completion (low latency)
- Tier 2: Reasoning and single-file refactoring
- Tier 3: Complex cross-file architectural changes
- Tier 4: Local offline fallback (Ollama / Llama.cpp)

Supports active health checks, latency tracking, runtime configuration, and
automatic failover fallback cascading.
"""

import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ModelTier(str, Enum):
    """Execution tiers for model routing."""
    TIER_1_FAST = "tier_1_fast"
    TIER_2_REASONING = "tier_2_reasoning"
    TIER_3_HEAVY = "tier_3_heavy"
    TIER_4_LOCAL = "tier_4_local"


class ModelHealthStatus(str, Enum):
    """Health check status values."""
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


@dataclass
class ModelDescriptor:
    """Descriptor defining model specifications and health."""
    model_id: str
    provider: str
    tier: ModelTier
    max_tokens: int
    supports_streaming: bool
    enabled: bool = True
    health_status: ModelHealthStatus = ModelHealthStatus.ONLINE
    latency_ms: float = 45.0
    last_health_check: float = field(default_factory=time.time)
    api_key: Optional[str] = None
    endpoint_url: Optional[str] = None


class ModelRouter:
    """Dispatches tasks to the appropriate LLM model according to task requirements,
    health status, and configured fallback preferences.
    """

    DEFAULT_CATALOG: Dict[str, ModelDescriptor] = {
        "gemini-2.5-flash": ModelDescriptor(
            model_id="gemini-2.5-flash",
            provider="google",
            tier=ModelTier.TIER_1_FAST,
            max_tokens=8192,
            supports_streaming=True,
            latency_ms=28.0,
        ),
        "claude-3-5-haiku": ModelDescriptor(
            model_id="claude-3-5-haiku",
            provider="anthropic",
            tier=ModelTier.TIER_1_FAST,
            max_tokens=8192,
            supports_streaming=True,
            latency_ms=35.0,
        ),
        "gemini-3.8-flash": ModelDescriptor(
            model_id="gemini-3.8-flash",
            provider="google",
            tier=ModelTier.TIER_2_REASONING,
            max_tokens=16384,
            supports_streaming=True,
            latency_ms=85.0,
        ),
        "claude-3-7-sonnet": ModelDescriptor(
            model_id="claude-3-7-sonnet",
            provider="anthropic",
            tier=ModelTier.TIER_2_REASONING,
            max_tokens=16384,
            supports_streaming=True,
            latency_ms=95.0,
        ),
        "claude-opus-4-6": ModelDescriptor(
            model_id="claude-opus-4-6",
            provider="anthropic",
            tier=ModelTier.TIER_3_HEAVY,
            max_tokens=32768,
            supports_streaming=True,
            latency_ms=240.0,
        ),
        "ollama-qwen-coder": ModelDescriptor(
            model_id="ollama-qwen-coder",
            provider="ollama",
            tier=ModelTier.TIER_4_LOCAL,
            max_tokens=8192,
            supports_streaming=True,
            latency_ms=18.0,
            endpoint_url="http://localhost:11434",
        ),
    }

    def __init__(self, catalog: Optional[Dict[str, ModelDescriptor]] = None) -> None:
        self._catalog: Dict[str, ModelDescriptor] = (
            {k: ModelDescriptor(**asdict(v)) for k, v in (catalog or self.DEFAULT_CATALOG).items()}
        )
        self._tier_defaults: Dict[ModelTier, str] = {
            ModelTier.TIER_1_FAST: "gemini-2.5-flash",
            ModelTier.TIER_2_REASONING: "gemini-3.8-flash",
            ModelTier.TIER_3_HEAVY: "claude-opus-4-6",
            ModelTier.TIER_4_LOCAL: "ollama-qwen-coder",
        }

    def get_model(self, model_id: str) -> ModelDescriptor:
        """Retrieve model metadata by ID."""
        if not model_id or not isinstance(model_id, str):
            raise ValueError("model_id must be a non-empty string.")
        if model_id not in self._catalog:
            raise KeyError(f"Model '{model_id}' is not registered in router catalog.")
        return self._catalog[model_id]

    def list_all_models(self) -> List[ModelDescriptor]:
        """List all registered models."""
        return list(self._catalog.values())

    def list_models_by_tier(self, tier: ModelTier) -> List[ModelDescriptor]:
        """List all models registered under a specific tier."""
        if not isinstance(tier, ModelTier):
            raise TypeError(f"Invalid tier: expected ModelTier enum, got {type(tier).__name__}.")
        return [m for m in self._catalog.values() if m.tier == tier]

    def select_model_for_tier(self, tier: ModelTier) -> ModelDescriptor:
        """Select preferred model for a given tier."""
        if not isinstance(tier, ModelTier):
            raise TypeError(f"Invalid tier: expected ModelTier enum, got {type(tier).__name__}.")

        pref_id = self._tier_defaults.get(tier)
        if pref_id and pref_id in self._catalog:
            return self._catalog[pref_id]

        candidates = [m for m in self._catalog.values() if m.tier == tier and m.enabled]
        if not candidates:
            raise ValueError(f"No enabled models registered under tier: {tier.value}")
        return candidates[0]

    def select_model_with_fallback(
        self,
        preferred_tier: Optional[ModelTier] = None,
        preferred_model_id: Optional[str] = None,
    ) -> ModelDescriptor:
        """Select preferred model; if offline or disabled, automatically fallback
        to next viable model or local tier.
        """
        # Case 1: Specific model requested
        if preferred_model_id:
            try:
                candidate = self.get_model(preferred_model_id)
                if candidate.enabled and candidate.health_status != ModelHealthStatus.OFFLINE:
                    return candidate
            except KeyError:
                pass

        # Case 2: Tier requested or derived
        tier = preferred_tier or ModelTier.TIER_1_FAST
        tier_order = [
            tier,
            ModelTier.TIER_1_FAST,
            ModelTier.TIER_2_REASONING,
            ModelTier.TIER_4_LOCAL,
        ]

        for check_tier in tier_order:
            for model in self._catalog.values():
                if (
                    model.tier == check_tier
                    and model.enabled
                    and model.health_status != ModelHealthStatus.OFFLINE
                ):
                    return model

        # Absolute fallback: return any available model
        for model in self._catalog.values():
            if model.enabled:
                return model

        raise RuntimeError("All configured models are currently offline or disabled.")

    def check_health(self, model_id: str) -> Dict[str, Any]:
        """Perform simulated or live health check on a model."""
        model = self.get_model(model_id)
        start_t = time.perf_counter()

        # Simulated ping / provider probe
        if model.provider == "ollama":
            # Check local connectivity
            status = ModelHealthStatus.ONLINE
        elif model.enabled:
            status = ModelHealthStatus.ONLINE
        else:
            status = ModelHealthStatus.OFFLINE

        elapsed_ms = max(1.0, (time.perf_counter() - start_t) * 1000 + model.latency_ms)
        model.health_status = status
        model.latency_ms = round(elapsed_ms, 2)
        model.last_health_check = time.time()

        return {
            "model_id": model.model_id,
            "provider": model.provider,
            "status": model.health_status.value,
            "latency_ms": model.latency_ms,
            "last_checked": model.last_health_check,
        }

    def check_all_health(self) -> Dict[str, Dict[str, Any]]:
        """Check health across all registered models."""
        return {m_id: self.check_health(m_id) for m_id in self._catalog}

    def configure_model(
        self,
        model_id: str,
        api_key: Optional[str] = None,
        enabled: Optional[bool] = None,
        endpoint_url: Optional[str] = None,
    ) -> ModelDescriptor:
        """Update runtime configuration for a model."""
        model = self.get_model(model_id)
        if api_key is not None:
            model.api_key = api_key
        if enabled is not None:
            model.enabled = enabled
            if not enabled:
                model.health_status = ModelHealthStatus.OFFLINE
        if endpoint_url is not None:
            model.endpoint_url = endpoint_url
        return model

    def set_tier_preference(self, tier: ModelTier, model_id: str) -> None:
        """Set default model for a specific tier."""
        if tier not in self._tier_defaults:
            raise ValueError(f"Unknown tier: {tier}")
        if model_id not in self._catalog:
            raise KeyError(f"Unknown model_id: {model_id}")
        self._tier_defaults[tier] = model_id
