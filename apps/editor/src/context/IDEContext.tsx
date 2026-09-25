import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  IDEState,
  IDEAction,
  FileItem,
  OpenFileTab,
  ActivityTab,
  TerminalTab,
  ChatMessage,
} from '../types';

const INITIAL_FILE_TREE: FileItem[] = [
  {
    id: 'f-root-apps',
    name: 'apps',
    path: 'apps',
    isDir: true,
    children: [
      {
        id: 'f-apps-desktop',
        name: 'desktop',
        path: 'apps/desktop',
        isDir: true,
        children: [
          {
            id: 'f-desktop-main',
            name: 'main.ts',
            path: 'apps/desktop/src/main.ts',
            isDir: false,
            language: 'typescript',
            content: `import { app, BrowserWindow } from 'electron';\n\napp.whenReady().then(() => {\n  console.log('AugHome Desktop Shell started.');\n});\n`,
          },
          {
            id: 'f-desktop-bm',
            name: 'backend-manager.ts',
            path: 'apps/desktop/src/backend-manager.ts',
            isDir: false,
            language: 'typescript',
            content: `export class BackendProcessManager {\n  start() {\n    console.log('Spawning Python backend...');\n  }\n}\n`,
          },
          {
            id: 'f-desktop-pkg',
            name: 'package.json',
            path: 'apps/desktop/package.json',
            isDir: false,
            language: 'json',
            content: `{\n  "name": "@aughome/desktop",\n  "version": "0.1.0"\n}\n`,
          },
        ],
      },
      {
        id: 'f-apps-backend',
        name: 'backend',
        path: 'apps/backend',
        isDir: true,
        children: [
          {
            id: 'f-backend-server',
            name: 'server.py',
            path: 'apps/backend/server.py',
            isDir: false,
            language: 'python',
            content: `from fastapi import FastAPI\n\napp = FastAPI(title="AugHome Backend")\n\n@app.get("/health")\ndef health_check():\n    return {"status": "healthy", "service": "aughome-backend"}\n`,
          },
          {
            id: 'f-backend-diff',
            name: 'diff_engine.py',
            path: 'apps/backend/diff_engine.py',
            isDir: false,
            language: 'python',
            content: `class DiffEngine:\n    def compute_diff(self, original: str, modified: str):\n        return "unified diff output"\n`,
          },
        ],
      },
      {
        id: 'f-apps-editor',
        name: 'editor',
        path: 'apps/editor',
        isDir: true,
        children: [
          {
            id: 'f-editor-app',
            name: 'App.tsx',
            path: 'apps/editor/src/App.tsx',
            isDir: false,
            language: 'typescript',
            content: `import React from 'react';\n\nexport const App: React.FC = () => {\n  return <div>AugHome IDE Monaco Editor</div>;\n};\n`,
          },
        ],
      },
    ],
  },
  {
    id: 'f-readme',
    name: 'README.md',
    path: 'README.md',
    isDir: false,
    language: 'markdown',
    content: `# AugHome IDE\n\nAn AI-native, open-source code editor powered by **Augagent**.\n\n### Features\n- Monaco Code Editor\n- Real-time AugAgent AI Assistant\n- Integrated Terminal PTY\n`,
  },
];

const INITIAL_STATE: IDEState = {
  activeActivityTab: 'explorer',
  isSidebarOpen: true,
  sidebarWidth: 250,
  openFiles: [
    {
      id: 'f-backend-server',
      path: 'apps/backend/server.py',
      filename: 'server.py',
      language: 'python',
      content: `from fastapi import FastAPI\n\napp = FastAPI(title="AugHome Backend")\n\n@app.get("/health")\ndef health_check():\n    return {"status": "healthy", "service": "aughome-backend"}\n`,
      isDirty: false,
    },
    {
      id: 'f-readme',
      path: 'README.md',
      filename: 'README.md',
      language: 'markdown',
      content: `# AugHome IDE\n\nAn AI-native, open-source code editor powered by **Augagent**.\n\n### Features\n- Monaco Code Editor\n- Real-time AugAgent AI Assistant\n- Integrated Terminal PTY\n`,
      isDirty: false,
    },
  ],
  activeFileId: 'f-backend-server',
  fileTree: INITIAL_FILE_TREE,
  isChatOpen: true,
  chatWidth: 350,
  messages: [
    {
      id: 'msg-init-1',
      role: 'assistant',
      content: `Hello! I am **AugAgent**, your built-in AI coding copilot for AugHome IDE.

How can I help you today?
- Search repository symbols or files
- Explain or refactor code in your open editor
- Generate unified diffs and apply them directly to files`,
      timestamp: Date.now() - 60000,
    },
  ],
  isGenerating: false,
  selectedModel: 'gemini-2.5-flash',
  isTerminalOpen: true,
  terminalHeight: 180,
  activeTerminalTab: 'terminal',
  cursorPosition: { line: 1, column: 1 },
  gitStatus: {
    branch: 'main',
    staged: ['apps/desktop/package.json', 'apps/desktop/src/main.ts'],
    unstaged: ['apps/editor/src/App.tsx'],
    untracked: ['apps/editor/src/components/EditorArea.tsx'],
  },
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  theme: 'vs-dark',
  settings: {
    'editor.theme': 'aughome-dark',
    'editor.fontSize': 13,
    'editor.tabSize': 2,
    'editor.minimap': true,
    'editor.inlineSuggest': true,
    'ai.selectedModel': 'gemini-2.5-flash',
  },
};

function ideReducer(state: IDEState, action: IDEAction): IDEState {
  switch (action.type) {
    case 'SET_ACTIVITY_TAB':
      if (state.activeActivityTab === action.payload) {
        return { ...state, isSidebarOpen: !state.isSidebarOpen };
      }
      return {
        ...state,
        activeActivityTab: action.payload,
        isSidebarOpen: true,
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };

    case 'SET_SIDEBAR_WIDTH':
      return { ...state, sidebarWidth: Math.max(180, Math.min(600, action.payload)) };

    case 'OPEN_FILE': {
      const file = action.payload;
      const existing = state.openFiles.find((f) => f.id === file.id);
      if (existing) {
        return { ...state, activeFileId: file.id };
      }
      const newTab: OpenFileTab = {
        id: file.id,
        path: file.path,
        filename: file.name,
        content: file.content || `// ${file.name}\n`,
        language: file.language || 'typescript',
        isDirty: false,
      };
      return {
        ...state,
        openFiles: [...state.openFiles, newTab],
        activeFileId: file.id,
      };
    }

    case 'CLOSE_FILE': {
      const targetId = action.payload;
      const filtered = state.openFiles.filter((f) => f.id !== targetId);
      let nextActiveId = state.activeFileId;
      if (state.activeFileId === targetId) {
        nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
      }
      return {
        ...state,
        openFiles: filtered,
        activeFileId: nextActiveId,
      };
    }

    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileId: action.payload };

    case 'UPDATE_FILE_CONTENT':
      return {
        ...state,
        openFiles: state.openFiles.map((f) =>
          f.id === action.payload.id
            ? { ...f, content: action.payload.content, isDirty: true }
            : f
        ),
      };

    case 'TOGGLE_CHAT':
      return { ...state, isChatOpen: !state.isChatOpen };

    case 'SET_CHAT_WIDTH':
      return { ...state, chatWidth: Math.max(260, Math.min(700, action.payload)) };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'APPEND_TO_LAST_MESSAGE': {
      if (state.messages.length === 0) return state;
      const lastIndex = state.messages.length - 1;
      const updatedMessages = [...state.messages];
      updatedMessages[lastIndex] = {
        ...updatedMessages[lastIndex],
        content: updatedMessages[lastIndex].content + action.payload,
      };
      return { ...state, messages: updatedMessages };
    }

    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };

    case 'SET_MODEL':
      return { ...state, selectedModel: action.payload };

    case 'TOGGLE_TERMINAL':
      return { ...state, isTerminalOpen: !state.isTerminalOpen };

    case 'SET_TERMINAL_HEIGHT':
      return { ...state, terminalHeight: Math.max(80, Math.min(500, action.payload)) };

    case 'SET_TERMINAL_TAB':
      return { ...state, activeTerminalTab: action.payload };

    case 'SET_CURSOR_POSITION':
      return { ...state, cursorPosition: action.payload };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    case 'APPLY_CODE_TO_ACTIVE_FILE': {
      if (!state.activeFileId) return state;
      return {
        ...state,
        openFiles: state.openFiles.map((f) =>
          f.id === state.activeFileId
            ? { ...f, content: action.payload, isDirty: true }
            : f
        ),
      };
    }

    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, isCommandPaletteOpen: !state.isCommandPaletteOpen };

    case 'SET_COMMAND_PALETTE':
      return { ...state, isCommandPaletteOpen: action.payload };

    case 'TOGGLE_SETTINGS':
      return { ...state, isSettingsOpen: !state.isSettingsOpen };

    case 'SET_SETTINGS_OPEN':
      return { ...state, isSettingsOpen: action.payload };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    default:
      return state;
  }
}

interface IDEContextType {
  state: IDEState;
  dispatch: React.Dispatch<IDEAction>;
}

const IDEContext = createContext<IDEContextType | undefined>(undefined);

export const IDEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ideReducer, INITIAL_STATE);

  return (
    <IDEContext.Provider value={{ state, dispatch }}>
      {children}
    </IDEContext.Provider>
  );
};

export function useIDE(): IDEContextType {
  const context = useContext(IDEContext);
  if (!context) {
    throw new Error('useIDE must be used within an IDEProvider');
  }
  return context;
}
