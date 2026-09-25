import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EDITOR_DIR = path.join(ROOT_DIR, 'apps/editor');

test('Editor package.json is configured with React, TypeScript, and @monaco-editor/react', () => {
  const pkgPath = path.join(EDITOR_DIR, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'apps/editor/package.json must exist');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, '@aughome/editor');
  assert.ok(pkg.dependencies['@monaco-editor/react'], '@monaco-editor/react must be in dependencies');
  assert.ok(pkg.dependencies['react'], 'react must be in dependencies');
  assert.ok(pkg.dependencies['react-dom'], 'react-dom must be in dependencies');
  assert.ok(pkg.devDependencies['vite'], 'vite must be in devDependencies');
  assert.ok(pkg.devDependencies['typescript'], 'typescript must be in devDependencies');
  assert.ok(pkg.devDependencies['@vitejs/plugin-react'], '@vitejs/plugin-react must be in devDependencies');
  assert.equal(pkg.scripts.build, 'tsc && vite build');
});

test('Editor tsconfig.json has rootDir set to . for root config compatibility', () => {
  const tsconfigPath = path.join(EDITOR_DIR, 'tsconfig.json');
  assert.ok(fs.existsSync(tsconfigPath), 'apps/editor/tsconfig.json must exist');

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  assert.equal(tsconfig.compilerOptions.rootDir, '.', 'rootDir must be .');
  assert.equal(tsconfig.compilerOptions.jsx, 'react-jsx');
});

test('Activity Bar component exists with 48px width and all required navigation tabs', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/ActivityBar.tsx');
  assert.ok(fs.existsSync(compPath), 'ActivityBar.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes("width: '48px'"), 'Activity bar must have 48px width');
  assert.ok(content.includes("'explorer'"), 'Explorer tab required');
  assert.ok(content.includes("'search'"), 'Search tab required');
  assert.ok(content.includes("'git'"), 'Git tab required');
  assert.ok(content.includes("'extensions'"), 'Extensions tab required');
  assert.ok(content.includes("'chat'"), 'Chat tab required');
  assert.ok(content.includes('TOGGLE_TERMINAL'), 'Terminal toggle required');
});

test('Sidebar component exists with resizable tree, search, git, and extensions', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/Sidebar.tsx');
  assert.ok(fs.existsSync(compPath), 'Sidebar.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('renderFileTree'), 'File tree renderer required');
  assert.ok(content.includes('mockSearchResults'), 'Search feature required');
  assert.ok(content.includes('STAGED CHANGES'), 'Git staged changes required');
  assert.ok(content.includes('CHANGES'), 'Git unstaged changes required');
  assert.ok(content.includes('UNTRACKED'), 'Git untracked changes required');
  assert.ok(content.includes('INSTALLED EXTENSIONS'), 'Extensions view required');
});

test('EditorArea component integrates Monaco with tabs, minimap, and breadcrumbs', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/EditorArea.tsx');
  assert.ok(fs.existsSync(compPath), 'EditorArea.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('@monaco-editor/react'), 'Must import from @monaco-editor/react');
  assert.ok(content.includes('theme="vs-dark"'), 'Must configure vs-dark theme');
  assert.ok(content.includes('minimap: { enabled: true'), 'Must enable minimap');
  assert.ok(content.includes('JetBrains Mono'), 'Must use JetBrains Mono code font');
  assert.ok(content.includes('onDidChangeCursorPosition'), 'Must track cursor position');
  assert.ok(content.includes('data-testid="editor-breadcrumbs"'), 'Breadcrumbs bar required');
  assert.ok(content.includes('data-testid="editor-tabs"'), 'Tabs bar required');
});

test('ChatPanel component implements AI chat, model selector, and Apply to Editor buttons', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/ChatPanel.tsx');
  assert.ok(fs.existsSync(compPath), 'ChatPanel.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('gemini-2.5-flash'), 'Gemini 2.5 Flash model option required');
  assert.ok(content.includes('gemini-2.5-pro'), 'Gemini 2.5 Pro model option required');
  assert.ok(content.includes('claude-3.7-sonnet'), 'Claude 3.7 Sonnet model option required');
  assert.ok(content.includes('deepseek-r1'), 'DeepSeek R1 model option required');
  assert.ok(content.includes('Apply to Editor'), 'Apply to Editor button required');
  assert.ok(content.includes('APPLY_CODE_TO_ACTIVE_FILE'), 'Dispatches APPLY_CODE_TO_ACTIVE_FILE');
  assert.ok(content.includes('renderMessageContent'), 'Must parse markdown and code blocks');
});

test('TerminalPanel component implements tabs and interactive command prompt', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/TerminalPanel.tsx');
  assert.ok(fs.existsSync(compPath), 'TerminalPanel.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('TERMINAL'), 'TERMINAL tab required');
  assert.ok(content.includes('OUTPUT'), 'OUTPUT tab required');
  assert.ok(content.includes('DEBUG CONSOLE'), 'DEBUG CONSOLE tab required');
  assert.ok(content.includes('PROBLEMS'), 'PROBLEMS tab required');
  assert.ok(content.includes('augagent@aughome:~/workspace$'), 'Prompt line required');
  assert.ok(content.includes('npm test'), 'npm test command handling required');
});

test('StatusBar component displays model, cursor position, encoding, and language', () => {
  const compPath = path.join(EDITOR_DIR, 'src/components/StatusBar.tsx');
  assert.ok(fs.existsSync(compPath), 'StatusBar.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('state.selectedModel'), 'Active model must be rendered');
  assert.ok(content.includes('state.cursorPosition.line'), 'Cursor line must be rendered');
  assert.ok(content.includes('state.cursorPosition.column'), 'Cursor column must be rendered');
  assert.ok(content.includes('UTF-8'), 'UTF-8 encoding must be rendered');
  assert.ok(content.includes('getLanguageLabel'), 'Language label must be rendered');
  assert.ok(content.includes('Augagent'), 'Augagent status badge must be rendered');
});

test('App.tsx layout mounts all panels with drag handles and IDEProvider', () => {
  const appPath = path.join(EDITOR_DIR, 'src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

  const content = fs.readFileSync(appPath, 'utf8');
  assert.ok(content.includes('<IDEProvider>'), 'Must wrap in IDEProvider');
  assert.ok(content.includes('<ActivityBar />'), 'Must mount ActivityBar');
  assert.ok(content.includes('<Sidebar />'), 'Must mount Sidebar');
  assert.ok(content.includes('<EditorArea />'), 'Must mount EditorArea');
  assert.ok(content.includes('<ChatPanel />'), 'Must mount ChatPanel');
  assert.ok(content.includes('<TerminalPanel />'), 'Must mount TerminalPanel');
  assert.ok(content.includes('<StatusBar />'), 'Must mount StatusBar');
  assert.ok(content.includes('handleSidebarResize'), 'Sidebar resize handler required');
  assert.ok(content.includes('handleChatResize'), 'Chat resize handler required');
  assert.ok(content.includes('handleTerminalResize'), 'Terminal resize handler required');
});

test('IDEContext state reducer handles file tabs, content updates, and boundary limits', () => {
  const contextPath = path.join(EDITOR_DIR, 'src/context/IDEContext.tsx');
  assert.ok(fs.existsSync(contextPath), 'IDEContext.tsx must exist');

  const content = fs.readFileSync(contextPath, 'utf8');
  assert.ok(content.includes('OPEN_FILE'), 'Reducer must handle OPEN_FILE');
  assert.ok(content.includes('CLOSE_FILE'), 'Reducer must handle CLOSE_FILE');
  assert.ok(content.includes('SET_ACTIVE_FILE'), 'Reducer must handle SET_ACTIVE_FILE');
  assert.ok(content.includes('UPDATE_FILE_CONTENT'), 'Reducer must handle UPDATE_FILE_CONTENT');
  assert.ok(content.includes('APPLY_CODE_TO_ACTIVE_FILE'), 'Reducer must handle APPLY_CODE_TO_ACTIVE_FILE');
  assert.ok(content.includes('Math.max(180, Math.min(600, action.payload))'), 'Sidebar width boundary clamping');
  assert.ok(content.includes('Math.max(260, Math.min(700, action.payload))'), 'Chat width boundary clamping');
  assert.ok(content.includes('Math.max(80, Math.min(500, action.payload))'), 'Terminal height boundary clamping');
});
