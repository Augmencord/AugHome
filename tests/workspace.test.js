import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('Root package.json exists and defines npm workspaces', () => {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, 'aughome');
  assert.ok(Array.isArray(pkg.workspaces), 'workspaces must be an array');
  assert.ok(pkg.workspaces.includes('apps/*'), 'workspaces must include apps/*');
  assert.ok(pkg.workspaces.includes('extensions/*'), 'workspaces must include extensions/*');
  assert.equal(pkg.private, true, 'root package must be private');
});

test('Backend pyproject.toml exists and requires augagent>=1.3.0', () => {
  const pyprojectPath = path.join(ROOT_DIR, 'apps/backend/pyproject.toml');
  assert.ok(fs.existsSync(pyprojectPath), 'pyproject.toml must exist');

  const content = fs.readFileSync(pyprojectPath, 'utf8');
  assert.ok(content.includes('augagent>=1.3.0'), 'pyproject.toml must declare augagent>=1.3.0 dependency');
  assert.ok(content.includes('fastapi>='), 'pyproject.toml must declare fastapi dependency');
});

test('Backend placeholder modules exist', () => {
  const backendDir = path.join(ROOT_DIR, 'apps/backend');
  const requiredModules = [
    'server.py',
    'lsp_bridge.py',
    'completion.py',
    'diff_engine.py',
    'model_router.py',
  ];

  for (const mod of requiredModules) {
    const modPath = path.join(backendDir, mod);
    assert.ok(fs.existsSync(modPath), `Module ${mod} must exist in apps/backend`);
  }
});

test('Apps desktop and editor packages exist with valid package.json', () => {
  const desktopPkgPath = path.join(ROOT_DIR, 'apps/desktop/package.json');
  assert.ok(fs.existsSync(desktopPkgPath), 'apps/desktop/package.json must exist');
  const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
  assert.equal(desktopPkg.name, '@aughome/desktop');

  const editorPkgPath = path.join(ROOT_DIR, 'apps/editor/package.json');
  assert.ok(fs.existsSync(editorPkgPath), 'apps/editor/package.json must exist');
  const editorPkg = JSON.parse(fs.readFileSync(editorPkgPath, 'utf8'));
  assert.equal(editorPkg.name, '@aughome/editor');
});

test('Documentation and GitHub workflows exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'README.md')), 'README.md must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'LICENSE')), 'LICENSE must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.gitignore')), '.gitignore must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github/workflows/ci.yml')), 'CI workflow must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'docs/README.md')), 'docs/README.md must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'docs/ARCHITECTURE.md')), 'docs/ARCHITECTURE.md must exist');
});
