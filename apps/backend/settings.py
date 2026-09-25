"""User Settings Management Engine for AugHome IDE.

Re-exports from aughome.settings for backward compatibility.
"""

from aughome.settings import DEFAULT_SETTINGS, SettingsManager

__all__ = ["SettingsManager", "DEFAULT_SETTINGS"]
