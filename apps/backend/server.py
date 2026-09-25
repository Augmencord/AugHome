"""FastAPI server for AugHome IDE intelligence backend.

Exposes REST and WebSocket endpoints for AI completions, diffs, model routing,
and editor language support.
"""

import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict

# Ensure backend directory is present in sys.path for direct invocation and sidecar processes
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from model_router import ModelRouter, ModelTier
    from diff_engine import DiffEngine
    from completion import CompletionRequest, CompletionService
    from lsp_bridge import LSPBridge
except ImportError:
    from .model_router import ModelRouter, ModelTier
    from .diff_engine import DiffEngine
    from .completion import CompletionRequest, CompletionService
    from .lsp_bridge import LSPBridge

app = FastAPI(
    title="AugHome Backend Service",
    description="AI-native backend service powered by augagent",
    version="0.1.0",
)

# Enable CORS for desktop and editor client apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = ModelRouter()
completion_service = CompletionService(router=router)
diff_engine = DiffEngine()
lsp_bridge = LSPBridge()


class HealthResponse(BaseModel):
    """Health check response payload."""
    status: str
    service: str
    version: str


class DiffRequestPayload(BaseModel):
    """Diff computation request payload."""
    original_content: str
    modified_content: str
    filename: str = "buffer.txt"


class CompletionRequestPayload(BaseModel):
    """Completion request payload."""
    file_path: str
    prefix: str
    suffix: str = ""
    language_id: str
    max_tokens: int = Field(default=128, ge=1, le=4096)


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return backend service health status."""
    return HealthResponse(
        status="healthy",
        service="aughome-backend",
        version="0.1.0",
    )


@app.get("/models")
def list_models() -> Dict[str, Any]:
    """List available model descriptors categorized by tier."""
    return {
        "tier_1_fast": [asdict(m) for m in router.list_models_by_tier(ModelTier.TIER_1_FAST)],
        "tier_2_reasoning": [asdict(m) for m in router.list_models_by_tier(ModelTier.TIER_2_REASONING)],
        "tier_3_heavy": [asdict(m) for m in router.list_models_by_tier(ModelTier.TIER_3_HEAVY)],
        "tier_4_local": [asdict(m) for m in router.list_models_by_tier(ModelTier.TIER_4_LOCAL)],
    }


@app.post("/diff")
def compute_diff(payload: DiffRequestPayload) -> Dict[str, Any]:
    """Compute unified diff for provided content."""
    try:
        diff_res = diff_engine.generate_unified_diff(
            original_content=payload.original_content,
            modified_content=payload.modified_content,
            filename=payload.filename,
        )
        return {
            "filename": diff_res.original_file,
            "has_changes": diff_res.has_changes,
            "unified_diff": diff_res.unified_diff,
            "added_lines": diff_res.added_lines,
            "removed_lines": diff_res.removed_lines,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/complete")
def generate_completion(payload: CompletionRequestPayload) -> Dict[str, Any]:
    """Generate completion items."""
    try:
        req = CompletionRequest(
            file_path=payload.file_path,
            prefix=payload.prefix,
            suffix=payload.suffix,
            language_id=payload.language_id,
            max_tokens=payload.max_tokens,
        )
        items = completion_service.generate_completion(req)
        return {"items": [asdict(item) for item in items]}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
