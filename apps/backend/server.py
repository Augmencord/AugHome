"""FastAPI server for AugHome IDE intelligence backend.

Re-exports FastAPI app and components from aughome.server for direct invocation
and backward compatibility. Supports startup via CLI, Electron backend-manager,
and direct test client runners.
"""

import os
import sys
from pathlib import Path

# Ensure backend directory is present in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from aughome.server import (
    app,
    completion_service,
    diff_engine,
    lsp_bridge,
    model_router,
)

__all__ = [
    "app",
    "model_router",
    "completion_service",
    "diff_engine",
    "lsp_bridge",
]

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("AUGHOME_HOST", "127.0.0.1")
    port = int(os.environ.get("AUGHOME_PORT", "8000"))
    uvicorn.run("server:app", host=host, port=port, reload=True)
