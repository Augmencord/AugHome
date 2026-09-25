export type ActivityTab = 'explorer' | 'search' | 'git' | 'extensions' | 'chat';

export type TerminalTab = 'terminal' | 'output' | 'debug' | 'problems';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  children?: FileItem[];
  content?: string;
  language?: string;
}

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
}

export interface GitStatusState {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface IDEState {
  activeActivityTab: ActivityTab;
  isSidebarOpen: boolean;
  sidebarWidth: number;
  openFiles: OpenFileTab[];
  activeFileId: string | null;
  fileTree: FileItem[];
  isChatOpen: boolean;
  chatWidth: number;
  messages: ChatMessage[];
  isGenerating: boolean;
  selectedModel: string;
  isTerminalOpen: boolean;
  terminalHeight: number;
  activeTerminalTab: TerminalTab;
  cursorPosition: { line: number; column: number };
  gitStatus: GitStatusState;
}

export type IDEAction =
  | { type: 'SET_ACTIVITY_TAB'; payload: ActivityTab }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_WIDTH'; payload: number }
  | { type: 'OPEN_FILE'; payload: FileItem }
  | { type: 'CLOSE_FILE'; payload: string }
  | { type: 'SET_ACTIVE_FILE'; payload: string }
  | { type: 'UPDATE_FILE_CONTENT'; payload: { id: string; content: string } }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_CHAT_WIDTH'; payload: number }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'APPEND_TO_LAST_MESSAGE'; payload: string }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'SET_TERMINAL_HEIGHT'; payload: number }
  | { type: 'SET_TERMINAL_TAB'; payload: TerminalTab }
  | { type: 'SET_CURSOR_POSITION'; payload: { line: number; column: number } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'APPLY_CODE_TO_ACTIVE_FILE'; payload: string };
