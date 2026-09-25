"""Model Router module for AugHome IDE.

Re-exports model routing classes and functions from aughome.model_router
for backward compatibility.
"""

from aughome.model_router import (
    ModelDescriptor,
    ModelHealthStatus,
    ModelRouter,
    ModelTier,
)

__all__ = [
    "ModelTier",
    "ModelHealthStatus",
    "ModelDescriptor",
    "ModelRouter",
]
