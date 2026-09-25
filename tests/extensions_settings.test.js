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
const EXTENSIONS_DIR = path.join(ROOT_DIR, 'extensions');

test('Extension system backend discovers extensions, parses manifest.json, and integrates MCPToolAdapter', () => {
  const extModulePath = path.join(BACKEND_DIR, 'aughome/extensions.py');
  assert.ok(fs.existsSync(extModulePath), 'apps/backend/aughome/extensions.py must exist');

  const content = fs.readFileSync(extModulePath, 'utf8');
  assert.ok(content.includes('class ExtensionManager'), 'ExtensionManager class required');
  assert.ok(content.includes('class ExtensionManifest'), 'ExtensionManifest class required');
  assert.ok(content.includes('class ExtensionContribution'), 'ExtensionContribution class required');
  assert.ok(content.includes('manifest.json'), 'manifest.json format discovery required');
  assert.ok(content.includes('MCPToolAdapter'), 'MCPToolAdapter integration required');
  assert.ok(content.includes('get_contributed_commands'), 'Command contributions aggregation required');
  assert.ok(content.includes('get_contributed_themes'), 'Theme contributions aggregation required');
  assert.ok(content.includes('get_contributed_languages'), 'Language contributions aggregation required');
  assert.ok(content.includes('get_contributed_tools'), 'Tool contributions aggregation required');
});

test('Bundled extensions python-support and theme-aughome-dark exist with valid manifest.json', () => {
  // Python Support Extension
  const pythonExtDir = path.join(EXTENSIONS_DIR, 'python-support');
  assert.ok(fs.existsSync(pythonExtDir), 'extensions/python-support must exist');
  const pythonManifestPath = path.join(pythonExtDir, 'manifest.json');
  assert.ok(fs.existsSync(pythonManifestPath), 'extensions/python-support/manifest.json must exist');

  const pyManifest = JSON.parse(fs.readFileSync(pythonManifestPath, 'utf8'));
  assert.equal(pyManifest.id, 'python-support');
  assert.ok(pyManifest.contributes.languages.some((l) => l.id === 'python'), 'Python language contribution required');
  assert.ok(pyManifest.contributes.mcpServers.pylsp, 'pylsp MCP server contribution required');

  // Theme AugHome Dark Extension
  const themeExtDir = path.join(EXTENSIONS_DIR, 'theme-aughome-dark');
  assert.ok(fs.existsSync(themeExtDir), 'extensions/theme-aughome-dark must exist');
  const themeManifestPath = path.join(themeExtDir, 'manifest.json');
  assert.ok(fs.existsSync(themeManifestPath), 'extensions/theme-aughome-dark/manifest.json must exist');

  const themeManifest = JSON.parse(fs.readFileSync(themeManifestPath, 'utf8'));
  assert.equal(themeManifest.id, 'theme-aughome-dark');
  assert.ok(themeManifest.contributes.themes.some((t) => t.id === 'aughome-dark'), 'AugHome Dark theme contribution required');
});

test('Settings engine manages user configuration at ~/.aughome/settings.json', () => {
  const settingsModulePath = path.join(BACKEND_DIR, 'aughome/settings.py');
  assert.ok(fs.existsSync(settingsModulePath), 'apps/backend/aughome/settings.py must exist');

  const content = fs.readFileSync(settingsModulePath, 'utf8');
  assert.ok(content.includes('class SettingsManager'), 'SettingsManager class required');
  assert.ok(content.includes('.aughome'), '~/.aughome configuration path required');
  assert.ok(content.includes('settings.json'), 'settings.json filename required');
  assert.ok(content.includes('editor.theme'), 'Default theme setting required');
  assert.ok(content.includes('ai.selectedModel'), 'Default selected model setting required');
  assert.ok(content.includes('keybindings'), 'Default keybindings required');
  assert.ok(content.includes('save_settings'), 'Atomic settings persistence required');
});

test('Backend server mounts /v1/settings and /v1/extensions endpoints', () => {
  const serverPath = path.join(BACKEND_DIR, 'aughome/server.py');
  assert.ok(fs.existsSync(serverPath), 'apps/backend/aughome/server.py must exist');

  const content = fs.readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('/v1/settings'), '/v1/settings endpoint required');
  assert.ok(content.includes('/v1/extensions'), '/v1/extensions endpoint required');
  assert.ok(content.includes('/v1/extensions/toggle'), '/v1/extensions/toggle endpoint required');
});

test('Command Palette component provides fuzzy search and keyboard shortcuts navigation', () => {
  const palettePath = path.join(EDITOR_DIR, 'src/components/CommandPalette.tsx');
  assert.ok(fs.existsSync(palettePath), 'apps/editor/src/components/CommandPalette.tsx must exist');

  const content = fs.readFileSync(palettePath, 'utf8');
  assert.ok(content.includes('CommandPalette'), 'CommandPalette export required');
  assert.ok(content.includes('isCommandPaletteOpen'), 'Command palette open state guard required');
  assert.ok(content.includes('filteredCommands'), 'Fuzzy filtering logic required');
  assert.ok(content.includes('handleKeyDown'), 'Keyboard navigation handler required');
  assert.ok(content.includes('ArrowDown') && content.includes('ArrowUp'), 'Arrow key navigation required');
  assert.ok(content.includes('Enter'), 'Enter key execution required');
  assert.ok(content.includes('Escape'), 'Escape key dismiss required');
});

test('Settings modal component allows editing preferences and persists to backend', () => {
  const settingsModalPath = path.join(EDITOR_DIR, 'src/components/SettingsModal.tsx');
  assert.ok(fs.existsSync(settingsModalPath), 'apps/editor/src/components/SettingsModal.tsx must exist');

  const content = fs.readFileSync(settingsModalPath, 'utf8');
  assert.ok(content.includes('SettingsModal'), 'SettingsModal export required');
  assert.ok(content.includes('isSettingsOpen'), 'Settings open state guard required');
  assert.ok(content.includes('/v1/settings'), 'Must persist settings to /v1/settings endpoint');
  assert.ok(content.includes('selectedModel'), 'Model selection preference required');
  assert.ok(content.includes('fontSize'), 'Font size preference required');
  assert.ok(content.includes('theme'), 'Theme preference required');
});

test('Welcome screen component renders model setup, theme picker, and shortcuts', () => {
  const welcomePath = path.join(EDITOR_DIR, 'src/components/WelcomeScreen.tsx');
  assert.ok(fs.existsSync(welcomePath), 'apps/editor/src/components/WelcomeScreen.tsx must exist');

  const content = fs.readFileSync(welcomePath, 'utf8');
  assert.ok(content.includes('WelcomeScreen'), 'WelcomeScreen export required');
  assert.ok(content.includes('AugHome IDE'), 'AugHome IDE title required');
  assert.ok(content.includes('selectedModel'), 'Model setup selector required');
  assert.ok(content.includes('Shortcuts Cheatsheet'), 'Shortcuts cheatsheet required');
  assert.ok(content.includes('Ctrl+Shift+P'), 'Command Palette shortcut documentation required');
});

test('App layout wires global VS Code keybindings listener (Ctrl+Shift+P, Ctrl+,, Ctrl+B, Ctrl+J, Ctrl+L)', () => {
  const appPath = path.join(EDITOR_DIR, 'src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'apps/editor/src/App.tsx must exist');

  const content = fs.readFileSync(appPath, 'utf8');
  assert.ok(content.includes('handleGlobalKeyDown'), 'Global keydown listener required');
  assert.ok(content.includes('TOGGLE_COMMAND_PALETTE'), 'Ctrl+Shift+P command palette binding required');
  assert.ok(content.includes('TOGGLE_SETTINGS'), 'Ctrl+, settings binding required');
  assert.ok(content.includes('TOGGLE_SIDEBAR'), 'Ctrl+B sidebar binding required');
  assert.ok(content.includes('TOGGLE_TERMINAL'), 'Ctrl+J terminal binding required');
  assert.ok(content.includes('TOGGLE_CHAT'), 'Ctrl+L chat binding required');
  assert.ok(content.includes('<CommandPalette />') || content.includes('<CommandPalette'), 'CommandPalette overlay mounted');
  assert.ok(content.includes('<SettingsModal />') || content.includes('<SettingsModal'), 'SettingsModal overlay mounted');
});
