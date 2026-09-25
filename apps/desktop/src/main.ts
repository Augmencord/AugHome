/**
 * Electron Main Process for AugHome IDE.
 *
 * Responsibilities:
 * - Application lifecycle management
 * - BrowserWindow creation with secure contextIsolation
 * - Spawning and supervising backend Python/FastAPI service
 * - Inter-Process Communication (IPC) handling
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = process.env.AUGHOME_BACKEND_PORT || '8000';

function startBackendService(): void {
  const isDev = process.env.NODE_ENV !== 'production';
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
  const backendScript = path.resolve(__dirname, '../../backend/server.py');

  try {
    backendProcess = spawn(pythonCmd, [backendScript], {
      env: {
        ...process.env,
        AUGHOME_PORT: BACKEND_PORT,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`[AugHome Backend]: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`[AugHome Backend Error]: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[AugHome Backend] exited with code ${code}`);
    });
  } catch (err) {
    console.error('Failed to spawn backend process:', err);
  }
}

function stopBackendService(): void {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'AugHome IDE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    backgroundColor: '#0d1117',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback if local dev server is not active
      mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html')).catch((err) => {
        console.error('Failed to load fallback index.html', err);
      });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).catch((err) => {
      console.error('Failed to load production index.html', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startBackendService();
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

app.on('will-quit', () => {
  stopBackendService();
});

// IPC Communications
ipcMain.handle('ide:get-backend-status', async () => {
  return {
    running: backendProcess !== null && !backendProcess.killed,
    port: BACKEND_PORT,
  };
});
