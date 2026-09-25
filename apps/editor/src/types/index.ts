/**
 * Core domain types for AugHome Editor.
 */

export interface OpenFileTab {
  id: string;
  path: string;
  filename: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
}

export interface BackendStatus {
  online: boolean;
  port: number;
  activeModelTier: string;
}
