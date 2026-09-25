/**
 * Electron Main Process for AugHome IDE.
 *
 * Responsibilities:
 * - Application lifecycle management
 * - Frameless BrowserWindow creation (1400x900) with custom titlebar
 * - Preload with secure contextBridge
 * - Auto-spawning Python backend service with health monitoring & graceful shutdown
 * - Handling window control & backend IPC channels
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BackendProcessManager } from './backend-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const backendManager = new BackendProcessManager();

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Relay backend status changes to renderer
  backendManager.on('status', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend:status-changed', status);
    }
  });

  // Load URL or local index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error('[Main] Failed to load dev server URL:', err);
    });
  } else {
    const indexPath = path.resolve(__dirname, '../../index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Main] Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// IPC Handlers: Window Controls
// ═══════════════════════════════════════════════════════════════════════════

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// ═══════════════════════════════════════════════════════════════════════════
// IPC Handlers: Backend Supervision
// ═══════════════════════════════════════════════════════════════════════════

ipcMain.handle('backend:get-status', () => {
  return backendManager.getStatus();
});

ipcMain.handle('backend:restart', async () => {
  await backendManager.stop();
  backendManager.start();
  return backendManager.getStatus();
});

// ═══════════════════════════════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════════════════════════════

app.whenReady().then(() => {
  backendManager.start();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isQuitting = false;
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    isQuitting = true;
    event.preventDefault();
    try {
      await backendManager.stop();
    } catch (err) {
      console.error('[Main] Error stopping backend:', err);
    }
    app.quit();
  }
});
