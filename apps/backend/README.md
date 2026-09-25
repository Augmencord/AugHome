# AugHome Backend Service

Intelligence and language service for the AugHome IDE, powered by [`augagent`](https://github.com/Augmencord/augagent) and FastAPI.

## Modules

- `server.py`: FastAPI web service exposing REST and WebSocket endpoints for IDE operations.
- `model_router.py`: Dispatcher routing requests across Tier 1, 2, 3, and 4 models.
- `completion.py`: Inline AI completion generator with context caching and prompt assembly.
- `diff_engine.py`: Multi-file unified diff parsing, validation, and patch application.
- `lsp_bridge.py`: Language Server Protocol proxy relaying diagnostics and semantic definitions.
