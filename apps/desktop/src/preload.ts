/**
 * Preload script for AugHome IDE.
 *
 * Exposes a secure, typed API surface to the renderer process
 * using Electron's contextBridge.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface BackendStatus {
  running: boolean;
  healthy: boolean;
  port: number;
  pid: number | null;
  statusText: 'starting' | 'healthy' | 'unhealthy' | 'stopped';
  restartCount: number;
}

export interface AugHomeAPI {
  platform: string;
  version: string;
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  backend: {
    getStatus: () => Promise<BackendStatus>;
    restart: () => Promise<void>;
    onStatusChange: (callback: (status: BackendStatus) => void) => () => void;
  };
}

const api: AugHomeAPI = {
  platform: process.platform,
  version: '0.1.0',
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
  backend: {
    getStatus: () => ipcRenderer.invoke('backend:get-status'),
    restart: () => ipcRenderer.invoke('backend:restart'),
    onStatusChange: (callback: (status: BackendStatus) => void) => {
      const handler = (_event: IpcRendererEvent, status: BackendStatus) => callback(status);
      ipcRenderer.on('backend:status-changed', handler);
      return () => {
        ipcRenderer.removeListener('backend:status-changed', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('aughome', api);

declare global {
  interface Window {
    aughome: AugHomeAPI;
  }
}
