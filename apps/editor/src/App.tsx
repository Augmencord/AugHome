import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { ChatPanel } from './components/ChatPanel';
import { OpenFileTab, ChatMessage } from './types';

export const App: React.FC = () => {
  const [activeFile, setActiveFile] = useState<OpenFileTab | null>({
    id: '1',
    path: 'src/index.ts',
    filename: 'index.ts',
    content: '// Welcome to AugHome IDE\nconsole.log("Hello, AugHome!");\n',
    language: 'typescript',
    isDirty: false,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulate backend response
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Augagent received: "${text}". Ready to assist with coding and code intelligence.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 600);
  };

  const handleContentChange = (newContent: string) => {
    if (activeFile) {
      setActiveFile({ ...activeFile, content: newContent, isDirty: true });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0d1117',
      color: '#c9d1d9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div style={{
        height: '38px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '12px',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 600, color: '#f0f6fc' }}>AugHome IDE</div>
        <div>{activeFile ? activeFile.filename : 'No File Opened'}</div>
        <div style={{ color: '#3fb950' }}>● Augagent Connected</div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor Area */}
        <div style={{ flex: 1, height: '100%' }}>
          <Editor activeFile={activeFile} onChangeContent={handleContentChange} />
        </div>

        {/* AI Chat Sidecar Panel */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Status Bar */}
      <div style={{
        height: '24px',
        backgroundColor: '#090d13',
        borderTop: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '11px',
        color: '#8b949e',
        gap: '16px',
      }}>
        <span>UTF-8</span>
        <span>TypeScript</span>
        <span>Tier 1: Gemini 2.5 Flash (Default)</span>
      </div>
    </div>
  );
};
