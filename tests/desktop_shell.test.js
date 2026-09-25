import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DESKTOP_DIR = path.join(ROOT_DIR, 'apps/desktop');

test('Electron desktop package.json is configured with Vite, TypeScript, and Electron', () => {
  const pkgPath = path.join(DESKTOP_DIR, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'apps/desktop/package.json must exist');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, '@aughome/desktop');
  assert.equal(pkg.main, 'dist/main/main.js');
  assert.equal(pkg.scripts.dev, 'vite');
  assert.equal(pkg.scripts.build, 'tsc && vite build');
  assert.ok(pkg.devDependencies.electron, 'electron must be in devDependencies');
  assert.ok(pkg.devDependencies.vite, 'vite must be in devDependencies');
  assert.ok(pkg.devDependencies['vite-plugin-electron'], 'vite-plugin-electron must be in devDependencies');
  assert.ok(pkg.devDependencies['electron-builder'], 'electron-builder must be in devDependencies');
});

test('Vite config for Electron main and preload processes exists', () => {
  const viteConfigPath = path.join(DESKTOP_DIR, 'vite.config.ts');
  assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');

  const content = fs.readFileSync(viteConfigPath, 'utf8');
  assert.ok(content.includes('vite-plugin-electron'), 'must use vite-plugin-electron');
  assert.ok(content.includes('src/main.ts'), 'must build src/main.ts');
  assert.ok(content.includes('src/preload.ts'), 'must build src/preload.ts');
});

test('Multi-platform packaging config supports NSIS (Win), DMG (Mac), and AppImage (Linux)', () => {
  const builderConfigPath = path.join(DESKTOP_DIR, 'electron-builder.json5');
  assert.ok(fs.existsSync(builderConfigPath), 'electron-builder.json5 must exist');

  const content = fs.readFileSync(builderConfigPath, 'utf8');
  assert.ok(content.includes('"nsis"'), 'must target nsis for Windows');
  assert.ok(content.includes('"dmg"'), 'must target dmg for macOS');
  assert.ok(content.includes('"AppImage"'), 'must target AppImage for Linux');
  assert.ok(content.includes('"com.augmencord.aughome"'), 'appId must be set');
});

test('Frameless window (1400x900) and custom title bar configured in main.ts', () => {
  const mainPath = path.join(DESKTOP_DIR, 'src/main.ts');
  assert.ok(fs.existsSync(mainPath), 'src/main.ts must exist');

  const content = fs.readFileSync(mainPath, 'utf8');
  assert.ok(content.includes('width: 1400'), 'width must be 1400');
  assert.ok(content.includes('height: 900'), 'height must be 900');
  assert.ok(content.includes('frame: false'), 'window must be frameless');
  assert.ok(content.includes("titleBarStyle: 'hidden'"), 'titleBarStyle must be hidden');
  assert.ok(content.includes('contextIsolation: true'), 'contextIsolation must be enabled');
  assert.ok(content.includes('sandbox: true'), 'sandbox must be enabled');

  // Verify IPC endpoints
  assert.ok(content.includes("'window:minimize'"), 'window:minimize IPC required');
  assert.ok(content.includes("'window:maximize'"), 'window:maximize IPC required');
  assert.ok(content.includes("'window:close'"), 'window:close IPC required');
  assert.ok(content.includes("'backend:get-status'"), 'backend:get-status IPC required');
  assert.ok(content.includes("'backend:restart'"), 'backend:restart IPC required');
});

test('Preload script exposes window controls and backend supervisor via contextBridge', () => {
  const preloadPath = path.join(DESKTOP_DIR, 'src/preload.ts');
  assert.ok(fs.existsSync(preloadPath), 'src/preload.ts must exist');

  const content = fs.readFileSync(preloadPath, 'utf8');
  assert.ok(content.includes("contextBridge.exposeInMainWorld('aughome'"), 'must expose aughome in main world');
  assert.ok(content.includes('minimize:'), 'window.minimize must be exposed');
  assert.ok(content.includes('maximize:'), 'window.maximize must be exposed');
  assert.ok(content.includes('close:'), 'window.close must be exposed');
  assert.ok(content.includes('getStatus:'), 'backend.getStatus must be exposed');
  assert.ok(content.includes('onStatusChange:'), 'backend.onStatusChange must be exposed');
});

test('Backend process manager implements auto-spawn, health monitoring, and graceful shutdown', () => {
  const managerPath = path.join(DESKTOP_DIR, 'src/backend-manager.ts');
  assert.ok(fs.existsSync(managerPath), 'src/backend-manager.ts must exist');

  const content = fs.readFileSync(managerPath, 'utf8');
  assert.ok(content.includes('class BackendProcessManager'), 'BackendProcessManager class required');
  assert.ok(content.includes('start()'), 'start method required');
  assert.ok(content.includes('stop()'), 'stop method required');
  assert.ok(content.includes('startHealthMonitoring()'), 'startHealthMonitoring method required');
  assert.ok(content.includes('/health'), 'health check must query /health');
  assert.ok(content.includes('SIGTERM'), 'SIGTERM graceful termination required');
  assert.ok(content.includes('SIGKILL'), 'SIGKILL fallback escalation required');
});

test('Dark theme placeholder index.html contains custom titlebar and status badge', () => {
  const htmlPath = path.join(DESKTOP_DIR, 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');

  const content = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(content.includes('class="titlebar"'), 'custom titlebar required');
  assert.ok(content.includes('btn-minimize'), 'minimize button required');
  assert.ok(content.includes('btn-maximize'), 'maximize button required');
  assert.ok(content.includes('btn-close'), 'close button required');
  assert.ok(content.includes('id="backend-badge"'), 'backend status badge required');
  assert.ok(content.includes('-webkit-app-region: drag'), 'draggable titlebar style required');
  assert.ok(content.includes('-webkit-app-region: no-drag'), 'no-drag controls required');
  assert.ok(content.includes('window.aughome'), 'must hook into window.aughome contextBridge');
});
