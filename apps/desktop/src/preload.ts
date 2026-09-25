/**
 * Preload script for AugHome IDE.
 *
 * Exposes a minimal, secure API surface to the renderer process
 * using Electron's contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface AugHomeAPI {
  getBackendStatus: () => Promise<{ running: boolean; port: string }>;
  platform: string;
}

const api: AugHomeAPI = {
  getBackendStatus: () => ipcRenderer.invoke('ide:get-backend-status'),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('aughome', api);
