"""FastAPI server for AugHome IDE intelligence backend.

Re-exports FastAPI app and components from aughome.server for direct invocation
and backward compatibility.
"""

import sys
from pathlib import Path

# Ensure backend directory is present in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from aughome.server import app, model_router, completion_service, diff_engine

__all__ = ["app", "model_router", "completion_service", "diff_engine"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
