"""AugHome Backend Package.

Exposes core IDE intelligence server, model router, and workspace sandbox.
"""

from aughome.model_router import ModelDescriptor, ModelHealthStatus, ModelRouter, ModelTier
from aughome.workspace import (
    edit_file_content,
    generate_file_tree,
    get_default_workspace_root,
    read_file_content,
    validate_sandbox_path,
    write_file_content,
)

__all__ = [
    "ModelRouter",
    "ModelTier",
    "ModelDescriptor",
    "ModelHealthStatus",
    "validate_sandbox_path",
    "generate_file_tree",
    "read_file_content",
    "write_file_content",
    "edit_file_content",
    "get_default_workspace_root",
]
