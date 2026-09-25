"""AugHome IDE Extension System Engine.

Re-exports from aughome.extensions for backward compatibility.
"""

from aughome.extensions import (
    ExtensionContribution,
    ExtensionManager,
    ExtensionManifest,
    ExtensionRecord,
)

__all__ = [
    "ExtensionManager",
    "ExtensionManifest",
    "ExtensionContribution",
    "ExtensionRecord",
]
