import React, { useState } from 'react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  messages,
  isLoading,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div style={{
      width: '320px',
      height: '100%',
      borderLeft: '1px solid #30363d',
      backgroundColor: '#161b22',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
        fontWeight: 600,
        color: '#f0f6fc',
        fontSize: '13px',
      }}>
        Augagent Assistant
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#8b949e', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
            Ask Augagent about your codebase, request refactorings, or generate tests.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: msg.role === 'user' ? '#1f242c' : '#21262d',
              color: '#c9d1d9',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              border: '1px solid #30363d',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{ color: '#58a6ff', fontSize: '12px' }}>Augagent is thinking...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '12px', borderTop: '1px solid #30363d' }}>
        <input
          type="text"
          value={input}
          placeholder="Ask Augagent..."
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '6px',
            color: '#f0f6fc',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </form>
    </div>
  );
};
