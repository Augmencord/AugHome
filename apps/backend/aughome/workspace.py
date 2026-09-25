"""Workspace and Sandbox Enforcement module for AugHome IDE.

Provides safe workspace path validation, recursive file tree generation,
sandboxed file read/write/edit operations, and traversal attack prevention.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

DEFAULT_IGNORED_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
    ".DS_Store",
}


def get_default_workspace_root() -> Path:
    """Return the default workspace root directory."""
    env_root = os.environ.get("AUGHOME_WORKSPACE")
    if env_root:
        return Path(env_root).resolve()
    # Fallback to repository root (two levels above apps/backend)
    backend_dir = Path(__file__).resolve().parent.parent
    return backend_dir.parent.parent.resolve()


def validate_sandbox_path(target_path: str, workspace_root: Optional[str] = None) -> Path:
    """Validate that target_path resides strictly within the workspace root.

    Args:
        target_path: Relative or absolute file path.
        workspace_root: Optional workspace root directory override.

    Returns:
        Canonical, validated Path object.

    Raises:
        ValueError: If path is empty or contains invalid characters.
        PermissionError: If target_path traverses outside workspace_root.
    """
    if not target_path or not isinstance(target_path, str):
        raise ValueError("Target path must be a non-empty string.")

    root_dir = Path(workspace_root).resolve() if workspace_root else get_default_workspace_root()
    root_str = os.path.realpath(str(root_dir))

    # Resolve relative or absolute path
    if os.path.isabs(target_path):
        resolved_target = os.path.realpath(target_path)
    else:
        resolved_target = os.path.realpath(os.path.join(root_str, target_path))

    # Check sandbox boundary: resolved_target must be root or a subpath of root
    try:
        common = os.path.commonpath([root_str, resolved_target])
    except ValueError as exc:
        raise PermissionError(f"Access denied: path '{target_path}' is on a different drive than workspace '{root_str}'.") from exc

    if common != root_str:
        raise PermissionError(f"Access denied: path '{target_path}' traverses outside sandbox root '{root_str}'.")

    return Path(resolved_target)


def generate_file_tree(
    workspace_root: Optional[str] = None,
    max_depth: int = 6,
    current_depth: int = 0,
    current_dir: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Generate a hierarchical tree of files and directories within the workspace.

    Args:
        workspace_root: Workspace root path.
        max_depth: Maximum recursion depth.
        current_depth: Current recursion depth.
        current_dir: Current directory being inspected.

    Returns:
        List of nested directory items.
    """
    root_path = Path(workspace_root).resolve() if workspace_root else get_default_workspace_root()
    active_dir = current_dir if current_dir else root_path

    if not active_dir.exists() or current_depth > max_depth:
        return []

    tree: List[Dict[str, Any]] = []

    try:
        entries = sorted(os.scandir(active_dir), key=lambda e: (not e.is_dir(), e.name.lower()))
    except (PermissionError, OSError):
        return []

    for entry in entries:
        if entry.name in DEFAULT_IGNORED_DIRS:
            continue

        entry_path = Path(entry.path)
        try:
            rel_path = str(entry_path.relative_to(root_path)).replace("\\", "/")
        except ValueError:
            rel_path = entry.name

        if entry.is_dir(follow_symlinks=False):
            children = []
            if current_depth < max_depth:
                children = generate_file_tree(
                    workspace_root=str(root_path),
                    max_depth=max_depth,
                    current_depth=current_depth + 1,
                    current_dir=entry_path,
                )
            tree.append({
                "id": rel_path,
                "name": entry.name,
                "path": rel_path,
                "is_dir": True,
                "children": children,
            })
        else:
            tree.append({
                "id": rel_path,
                "name": entry.name,
                "path": rel_path,
                "is_dir": False,
            })

    return tree


def read_file_content(path: str, workspace_root: Optional[str] = None) -> Dict[str, Any]:
    """Read file content within sandbox boundary.

    Args:
        path: Path to target file.
        workspace_root: Optional workspace root override.

    Returns:
        Metadata and content dictionary.
    """
    valid_path = validate_sandbox_path(path, workspace_root)

    if not valid_path.exists():
        raise FileNotFoundError(f"File not found: '{path}'")
    if valid_path.is_dir():
        raise IsADirectoryError(f"Path is a directory, not a file: '{path}'")

    try:
        content = valid_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = valid_path.read_text(encoding="latin-1")

    stat = valid_path.stat()
    return {
        "path": path.replace("\\", "/"),
        "content": content,
        "size": stat.st_size,
        "lines": len(content.splitlines()),
        "encoding": "utf-8",
    }


def write_file_content(
    path: str,
    content: str,
    overwrite: bool = True,
    workspace_root: Optional[str] = None,
) -> Dict[str, Any]:
    """Write text content to file within sandbox boundary.

    Args:
        path: Target file path.
        content: Text content to write.
        overwrite: Whether to overwrite existing file.
        workspace_root: Optional workspace root override.

    Returns:
        Status dictionary with path and byte count.
    """
    valid_path = validate_sandbox_path(path, workspace_root)

    if valid_path.exists() and not overwrite:
        raise FileExistsError(f"File already exists and overwrite is False: '{path}'")

    valid_path.parent.mkdir(parents=True, exist_ok=True)
    valid_path.write_text(content, encoding="utf-8")

    return {
        "path": path.replace("\\", "/"),
        "bytes_written": len(content.encode("utf-8")),
        "status": "written",
    }


def edit_file_content(
    path: str,
    target: Optional[str] = None,
    replacement: Optional[str] = None,
    patch: Optional[str] = None,
    workspace_root: Optional[str] = None,
) -> Dict[str, Any]:
    """Edit file within sandbox boundary via substring replacement or patch.

    Args:
        path: Target file path.
        target: Substring to replace.
        replacement: New content.
        patch: Optional patch text.
        workspace_root: Optional workspace root override.

    Returns:
        Status dictionary.
    """
    valid_path = validate_sandbox_path(path, workspace_root)

    if not valid_path.exists():
        raise FileNotFoundError(f"File not found: '{path}'")

    current_content = valid_path.read_text(encoding="utf-8")

    if target is not None and replacement is not None:
        if target not in current_content:
            raise ValueError(f"Target content not found in '{path}'")
        new_content = current_content.replace(target, replacement, 1)
        valid_path.write_text(new_content, encoding="utf-8")
        return {"path": path.replace("\\", "/"), "status": "edited", "mode": "replace"}

    if patch is not None:
        # Simple patch or direct replacement
        valid_path.write_text(patch, encoding="utf-8")
        return {"path": path.replace("\\", "/"), "status": "edited", "mode": "patch"}

    raise ValueError("Either (target and replacement) or patch must be provided.")
