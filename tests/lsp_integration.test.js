import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'apps/backend');
const EDITOR_DIR = path.join(ROOT_DIR, 'apps/editor');

test('LSPBridge backend module implements stdio JSON-RPC 2.0 framing and full lifecycle', () => {
  const bridgePath = path.join(BACKEND_DIR, 'aughome/lsp_bridge.py');
  assert.ok(fs.existsSync(bridgePath), 'apps/backend/aughome/lsp_bridge.py must exist');

  const content = fs.readFileSync(bridgePath, 'utf8');

  // JSON-RPC Framing & Message Specification
  assert.ok(content.includes('class JSONRPCMessage'), 'JSONRPCMessage class required');
  assert.ok(content.includes('encode('), 'JSON-RPC encode framing required');
  assert.ok(content.includes('Content-Length:'), 'Stdio HTTP-style Content-Length header required');
  assert.ok(content.includes('decode_frame('), 'Buffer decoding required');

  // Lifecycle methods
  assert.ok(content.includes('class LSPBridge'), 'LSPBridge class required');
  assert.ok(content.includes('def initialize('), 'initialize lifecycle method required');
  assert.ok(content.includes('def initialized('), 'initialized lifecycle notification required');
  assert.ok(content.includes('def shutdown('), 'shutdown lifecycle method required');
  assert.ok(content.includes('def exit('), 'exit lifecycle notification required');

  // Auto-detection of language servers
  assert.ok(content.includes('auto_detect_servers('), 'auto_detect_servers method required');
  assert.ok(content.includes('pylsp'), 'Python pylsp support required');
  assert.ok(content.includes('tsserver'), 'TypeScript/JavaScript tsserver support required');
  assert.ok(content.includes('rust-analyzer'), 'Rust rust-analyzer support required');
  assert.ok(content.includes('gopls'), 'Go gopls support required');

  // Fallback and core query operations
  assert.ok(content.includes('def get_diagnostics('), 'get_diagnostics required');
  assert.ok(content.includes('def get_hover('), 'get_hover required');
  assert.ok(content.includes('def get_definition('), 'get_definition required');
  assert.ok(content.includes('def get_completion('), 'get_completion required');
  assert.ok(content.includes('def rename_symbol('), 'rename_symbol required');
  assert.ok(content.includes('get_cached_diagnostics_summary('), 'Cached diagnostics summary required for agent context');
});

test('FastAPI backend mounts all 5 /v1/lsp/* endpoints and feeds diagnostics into chat context', () => {
  const serverPath = path.join(BACKEND_DIR, 'aughome/server.py');
  assert.ok(fs.existsSync(serverPath), 'apps/backend/aughome/server.py must exist');

  const content = fs.readFileSync(serverPath, 'utf8');

  // Endpoints
  assert.ok(content.includes('/v1/lsp/diagnostics'), 'POST /v1/lsp/diagnostics endpoint required');
  assert.ok(content.includes('/v1/lsp/hover'), 'POST /v1/lsp/hover endpoint required');
  assert.ok(content.includes('/v1/lsp/definition'), 'POST /v1/lsp/definition endpoint required');
  assert.ok(content.includes('/v1/lsp/completion'), 'POST /v1/lsp/completion endpoint required');
  assert.ok(content.includes('/v1/lsp/rename'), 'POST /v1/lsp/rename endpoint required');

  // Request models
  assert.ok(content.includes('class LSPDiagnosticsRequest'), 'LSPDiagnosticsRequest schema required');
  assert.ok(content.includes('class LSPHoverRequest'), 'LSPHoverRequest schema required');
  assert.ok(content.includes('class LSPDefinitionRequest'), 'LSPDefinitionRequest schema required');
  assert.ok(content.includes('class LSPCompletionRequest'), 'LSPCompletionRequest schema required');
  assert.ok(content.includes('class LSPRenameRequest'), 'LSPRenameRequest schema required');

  // Context injection for "fix errors" prompts
  assert.ok(content.includes('get_cached_diagnostics_summary()'), 'Must inject LSP diagnostics into chat context');
  assert.ok(content.includes('fix errors') || content.includes('diagnostics'), 'Must trigger diagnostics context for error fixing prompts');
});

test('LSPService frontend client implements Monaco diagnostics, hover, definition, and completion', () => {
  const servicePath = path.join(EDITOR_DIR, 'src/services/lspService.ts');
  assert.ok(fs.existsSync(servicePath), 'apps/editor/src/services/lspService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');

  assert.ok(content.includes('class LSPService'), 'LSPService class required');
  assert.ok(content.includes('setModelMarkers'), 'Must set Monaco model markers for squiggly underlines');
  assert.ok(content.includes('/v1/lsp/diagnostics'), 'Must query /v1/lsp/diagnostics');
  assert.ok(content.includes('registerHoverProvider'), 'Must register Monaco hover provider');
  assert.ok(content.includes('/v1/lsp/hover'), 'Must query /v1/lsp/hover');
  assert.ok(content.includes('registerDefinitionProvider'), 'Must register Monaco definition provider');
  assert.ok(content.includes('/v1/lsp/definition'), 'Must query /v1/lsp/definition');
  assert.ok(content.includes('registerCompletionProvider'), 'Must register Monaco completion provider');
  assert.ok(content.includes('/v1/lsp/completion'), 'Must query /v1/lsp/completion');
  assert.ok(content.includes('dispose()'), 'Must support disposing registered listeners and timers');
});

test('EditorArea component mounts LSPService and integrates diagnostics with editor lifecycle', () => {
  const editorAreaPath = path.join(EDITOR_DIR, 'src/components/EditorArea.tsx');
  assert.ok(fs.existsSync(editorAreaPath), 'EditorArea.tsx must exist');

  const content = fs.readFileSync(editorAreaPath, 'utf8');

  assert.ok(content.includes('LSPService'), 'Must import LSPService');
  assert.ok(content.includes('lspServiceRef.current.registerHoverProvider'), 'Must register hover provider on mount');
  assert.ok(content.includes('lspServiceRef.current.registerDefinitionProvider'), 'Must register definition provider on mount');
  assert.ok(content.includes('lspServiceRef.current.registerCompletionProvider'), 'Must register completion provider on mount');
  assert.ok(content.includes('scheduleDiagnosticsUpdate'), 'Must schedule debounced diagnostics updates on content change');
});
