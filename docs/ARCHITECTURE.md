# AugHome IDE Architecture

## High-Level System Design

AugHome IDE consists of three decoupled application tiers:

1. **Host Shell (`apps/desktop`)**:
   - Packaged with Electron and TypeScript.
   - Provides native window frame, OS file dialogs, system menus, and hardware access.
   - Supervises and health-monitors the local Python backend sidecar.

2. **Presentation Canvas (`apps/editor`)**:
   - Single Page Application built on React and Monaco Editor.
   - Renders code syntax highlighting, minimap, multi-cursor editing, and git status decorations.
   - Communicates with the intelligence backend via WebSocket for real-time streaming and REST for atomic operations.

3. **Intelligence Backend (`apps/backend`)**:
   - High-throughput asynchronous service powered by FastAPI and Python 3.10+.
   - Embedded with [`augagent`](https://github.com/Augmencord/augagent).
   - Manages AST symbol indexing, vector embeddings, Language Server Protocol (LSP) bridges, and tiered model dispatching.

## Multi-Tier Model Strategy

AugHome routes requests based on task latency and reasoning intensity:
- **Tier 1 (Fast Inline Completion)**: Gemini 2.5 Flash, Claude 3.5 Haiku (<150ms).
- **Tier 2 (Code Generation & Refactoring)**: Gemini 3.8 Flash, Claude 3.7 Sonnet (<400ms).
- **Tier 3 (Multi-File Architectural Reasoning)**: Claude Opus 4.6, GPT-4o (<1200ms).
- **Tier 4 (Offline & Local Privacy)**: Ollama / vLLM local engines.
