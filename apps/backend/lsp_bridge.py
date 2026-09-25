"""Language Server Protocol (LSP) Bridge for AugHome IDE.

Re-exports from aughome.lsp_bridge for backward compatibility.
"""

from aughome.lsp_bridge import LSPBridge, LSPDiagnostic

__all__ = ["LSPBridge", "LSPDiagnostic"]
