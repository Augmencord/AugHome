import React, { useState, useRef, useEffect } from 'react';
import { useIDE } from '../context/IDEContext';
import { ChatMessage } from '../types';

export const ChatPanel: React.FC = () => {
  const { state, dispatch } = useIDE();
  const [input, setInput] = useState('');
  const [appliedCodeIndex, setAppliedCodeIndex] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isGenerating]);

  if (!state.isChatOpen) {
    return null;
  }

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || state.isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    if (!textToSend) setInput('');
    dispatch({ type: 'SET_GENERATING', payload: true });

    // Simulate streaming response from Augagent
    setTimeout(() => {
      const assistantMessageId = `assist-${Date.now()}`;
      let responseBody = '';

      if (text.toLowerCase().includes('test') || text.toLowerCase().includes('unit')) {
        responseBody = `Here are the unit tests for the current file:

\`\`\`python
import unittest
from server import app
from fastapi.testclient import TestClient

client = TestClient(app)

class TestServerEndpoints(unittest.TestCase):
    def test_health_check_returns_200(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy", "service": "aughome-backend"})

if __name__ == "__main__":
    unittest.main()
\`\`\`

You can click **Apply to editor** above to load this directly into your active buffer.`;
      } else if (text.toLowerCase().includes('diff') || text.toLowerCase().includes('refactor')) {
        responseBody = `I analyzed your active code. Here is an optimized version:

\`\`\`typescript
export interface PerformanceMetric {
  durationMs: number;
  status: 'ok' | 'error';
  timestamp: string;
}

export async function measureExecution<T>(fn: () => Promise<T>): Promise<{ result: T; metric: PerformanceMetric }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return {
    result,
    metric: {
      durationMs,
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  };
}
\`\`\`

Ready to apply to your active file.`;
      } else {
        responseBody = `I have inspected your request: "${text}".\n\nAugagent connects directly to your workspace AST and local terminal PTY.\n\n\`\`\`typescript\n// Augagent Realtime Intelligence\nexport const AUGHOME_VERSION = '0.1.0';\nconsole.log('Workspace indexed successfully.');\n\`\`\``;
      }

      // Stream chunks into message
      const chunks = responseBody.split(' ');
      const newAssistantMsg: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: newAssistantMsg });

      let currentChunk = 0;
      const interval = setInterval(() => {
        if (currentChunk < chunks.length) {
          const piece = (currentChunk > 0 ? ' ' : '') + chunks[currentChunk];
          dispatch({ type: 'APPEND_TO_LAST_MESSAGE', payload: piece });
          currentChunk++;
        } else {
          clearInterval(interval);
          dispatch({ type: 'SET_GENERATING', payload: false });
        }
      }, 35);
    }, 400);
  };

  const handleApplyToEditor = (code: string, blockId: string) => {
    dispatch({ type: 'APPLY_CODE_TO_ACTIVE_FILE', payload: code });
    setAppliedCodeIndex(blockId);
    setTimeout(() => setAppliedCodeIndex(null), 2500);
  };

  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(blockId);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to parse message text into markdown sections and code blocks
  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        let language = 'text';
        let codeBody = part.slice(3, -3).trim();

        if (lines[0] && !lines[0].includes(' ') && lines.length > 1) {
          language = lines[0].trim();
          codeBody = lines.slice(1).join('\n');
        }

        const blockId = `${msgId}-code-${index}`;
        const isApplied = appliedCodeIndex === blockId;
        const isCopied = copiedCodeIndex === blockId;

        return (
          <div
            key={index}
            style={{
              margin: '8px 0',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #3c3c3c',
              backgroundColor: '#181818',
            }}
          >
            {/* Code Block Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: '#252526',
                borderBottom: '1px solid #333333',
                fontSize: '11px',
                color: '#999999',
              }}
            >
              <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                {language}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleCopyCode(codeBody, blockId)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #444444',
                    borderRadius: '3px',
                    color: isCopied ? '#3fb950' : '#cccccc',
                    padding: '2px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => handleApplyToEditor(codeBody, blockId)}
                  data-testid="apply-to-editor-btn"
                  style={{
                    backgroundColor: isApplied ? '#238636' : '#007acc',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#ffffff',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isApplied ? '✓ Applied to Editor' : '⚡ Apply to Editor'}
                </button>
              </div>
            </div>

            {/* Code Content */}
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: '12px',
                lineHeight: '18px',
                color: '#d4d4d4',
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
            >
              <code>{codeBody}</code>
            </pre>
          </div>
        );
      }

      // Standard text with bold / bullet parsing
      return (
        <div key={index} style={{ whiteSpace: 'pre-wrap', lineHeight: '20px' }}>
          {part}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        width: `${state.chatWidth}px`,
        minWidth: '280px',
        maxWidth: '700px',
        height: '100%',
        backgroundColor: '#1f242c',
        borderLeft: '1px solid #282828',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      data-testid="chat-panel"
    >
      {/* Panel Header */}
      <div
        style={{
          height: '42px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#181818',
          borderBottom: '1px solid #282828',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f0f6fc' }}>
            Augagent AI
          </span>
          <span
            style={{
              fontSize: '10px',
              backgroundColor: '#238636',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: 600,
            }}
          >
            Live
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Model Selector */}
          <select
            value={state.selectedModel}
            onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
            style={{
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '4px',
              color: '#cccccc',
              fontSize: '11px',
              padding: '2px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
            <option value="deepseek-r1">DeepSeek R1</option>
          </select>

          <button
            onClick={() => dispatch({ type: 'CLEAR_MESSAGES' })}
            title="Clear Chat History"
            style={{
              background: 'none',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '2px 4px',
            }}
          >
            🗑
          </button>

          <button
            onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
            title="Close Panel"
            style={{
              background: 'none',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '2px 4px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages Stream Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.role === 'user' ? '88%' : '100%',
              backgroundColor: msg.role === 'user' ? '#1f6feb22' : '#252526',
              border: msg.role === 'user' ? '1px solid #1f6feb55' : '1px solid #333333',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#d4d4d4',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: msg.role === 'user' ? '#58a6ff' : '#7ee787',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {msg.role === 'user' ? 'You' : 'Augagent'}
            </div>
            {renderMessageContent(msg.content, msg.id)}
          </div>
        ))}

        {state.isGenerating && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#58a6ff',
              fontSize: '12px',
              padding: '4px 8px',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>●</span>
            <span>Augagent is generating code...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '6px 12px',
          overflowX: 'auto',
          backgroundColor: '#181818',
          borderTop: '1px solid #282828',
        }}
      >
        {[
          'Generate unit tests',
          'Explain open file',
          'Refactor performance',
          'Find security flaws',
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            style={{
              whiteSpace: 'nowrap',
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '12px',
              color: '#8b949e',
              fontSize: '11px',
              padding: '3px 8px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box Area */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: '#181818',
          borderTop: '1px solid #282828',
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundColor: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: '6px',
            padding: '4px 8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Augagent (Enter to send, Shift+Enter for newline)..."
            rows={2}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              lineHeight: '18px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || state.isGenerating}
            style={{
              backgroundColor: input.trim() && !state.isGenerating ? '#007acc' : '#333333',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '6px 10px',
              cursor: input.trim() && !state.isGenerating ? 'pointer' : 'default',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
