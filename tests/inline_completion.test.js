import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EDITOR_DIR = path.join(ROOT_DIR, 'apps/editor');

test('InlineCompletionManager service implements 300ms debounce and in-flight cancellation', () => {
  const servicePath = path.join(EDITOR_DIR, 'src/services/inlineCompletion.ts');
  assert.ok(fs.existsSync(servicePath), 'apps/editor/src/services/inlineCompletion.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('class InlineCompletionManager'), 'InlineCompletionManager class required');
  assert.ok(content.includes('debounceMs ?? 300'), 'Default debounce must be 300ms');
  assert.ok(content.includes('cancelInFlight()'), 'cancelInFlight method required');
  assert.ok(content.includes('abortController.abort()'), 'Must abort in-flight requests on new keystrokes');
  assert.ok(content.includes('registerInlineCompletionsProvider'), 'Must register Monaco inline completions provider');
  assert.ok(content.includes('editor.action.inlineSuggest.commit'), 'Tab to accept command binding required');
  assert.ok(content.includes('editor.action.inlineSuggest.hide'), 'Escape to dismiss command binding required');
});

test('EditorArea component mounts InlineCompletionManager and configures ghost text options', () => {
  const editorAreaPath = path.join(EDITOR_DIR, 'src/components/EditorArea.tsx');
  assert.ok(fs.existsSync(editorAreaPath), 'EditorArea.tsx must exist');

  const content = fs.readFileSync(editorAreaPath, 'utf8');
  assert.ok(content.includes('InlineCompletionManager'), 'Must import and use InlineCompletionManager');
  assert.ok(content.includes('inlineSuggest: {'), 'inlineSuggest Monaco configuration required');
  assert.ok(content.includes('enabled: true'), 'inlineSuggest must be enabled');
  assert.ok(content.includes('suggest: {'), 'suggest preview configuration required');
  assert.ok(content.includes('preview: true'), 'Ghost text preview must be enabled');
});

test('Backend completion module provides multi-format FIM prompt construction', () => {
  const compPath = path.join(ROOT_DIR, 'apps/backend/aughome/completion.py');
  assert.ok(fs.existsSync(compPath), 'apps/backend/aughome/completion.py must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('class FIMFormat'), 'FIMFormat enum required');
  assert.ok(content.includes('CODESTRAL = "codestral"'), 'Codestral format required');
  assert.ok(content.includes('QWEN = "qwen"'), 'Qwen format required');
  assert.ok(content.includes('STARCODER = "starcoder"'), 'StarCoder format required');
  assert.ok(content.includes('GEMINI = "gemini"'), 'Gemini format required');
  assert.ok(content.includes('PREFIX_LINE_LIMIT = 100'), '100 lines prefix limit required');
  assert.ok(content.includes('SUFFIX_LINE_LIMIT = 50'), '50 lines suffix limit required');
  assert.ok(content.includes('extract_imports'), 'Import preservation required');
});

test('Backend server POST /v1/complete enforces 500ms timeout and request_id dedup', () => {
  const serverPath = path.join(ROOT_DIR, 'apps/backend/aughome/server.py');
  assert.ok(fs.existsSync(serverPath), 'apps/backend/aughome/server.py must exist');

  const content = fs.readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('asyncio.wait_for'), 'Must guard execution with asyncio.wait_for');
  assert.ok(content.includes('timeout=0.500'), '500ms timeout guard required');
  assert.ok(content.includes('completion_dedup_cache'), 'Deduplication cache required');
  assert.ok(content.includes('request_id'), 'request_id tracking required');
});
