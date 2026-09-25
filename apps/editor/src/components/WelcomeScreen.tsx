import React from 'react';
import { useIDE } from '../context/IDEContext';

export const WelcomeScreen: React.FC = () => {
  const { state, dispatch } = useIDE();

  const handleOpenSampleFile = (path: string, name: string, lang: string) => {
    // Find in fileTree or create tab
    dispatch({
      type: 'OPEN_FILE',
      payload: {
        id: `file-${name.replace('.', '-')}`,
        name,
        path,
        isDir: false,
        language: lang,
      },
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#cccccc',
        padding: '32px',
        overflowY: 'auto',
      }}
      data-testid="welcome-screen"
    >
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Banner */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ color: '#58a6ff' }}>⚡</span>
            <span style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>AugHome IDE</span>
          </div>
          <div style={{ fontSize: '14px', color: '#858585' }}>
            AI-native, open-source code editor powered by <strong>Augagent</strong> and Language Server Protocol.
          </div>
        </div>

        {/* 3 Columns Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {/* Card 1: Start & Quick Open */}
          <div
            style={{
              backgroundColor: '#252526',
              padding: '18px',
              borderRadius: '6px',
              border: '1px solid #333333',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '13px', marginBottom: '12px' }}>
              📁 Quick Open
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div
                onClick={() => handleOpenSampleFile('apps/backend/server.py', 'server.py', 'python')}
                style={{ color: '#58a6ff', cursor: 'pointer', padding: '4px 0' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                apps/backend/server.py
              </div>
              <div
                onClick={() => handleOpenSampleFile('apps/desktop/src/main.ts', 'main.ts', 'typescript')}
                style={{ color: '#58a6ff', cursor: 'pointer', padding: '4px 0' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                apps/desktop/src/main.ts
              </div>
              <div
                onClick={() => handleOpenSampleFile('README.md', 'README.md', 'markdown')}
                style={{ color: '#58a6ff', cursor: 'pointer', padding: '4px 0' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                README.md
              </div>
            </div>
          </div>

          {/* Card 2: AI Model Setup */}
          <div
            style={{
              backgroundColor: '#252526',
              padding: '18px',
              borderRadius: '6px',
              border: '1px solid #333333',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '13px', marginBottom: '12px' }}>
              🤖 AI Copilot Model
            </div>
            <select
              value={state.selectedModel}
              onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#3c3c3c',
                color: '#ffffff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '10px',
              }}
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="ollama-local">Ollama Local (Offline)</option>
            </select>
            <div style={{ fontSize: '11px', color: '#858585', lineHeight: 1.4 }}>
              Active model handles inline FIM ghost-text completions and chat refactoring.
            </div>
          </div>

          {/* Card 3: Keybindings Cheatsheet */}
          <div
            style={{
              backgroundColor: '#252526',
              padding: '18px',
              borderRadius: '6px',
              border: '1px solid #333333',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '13px', marginBottom: '12px' }}>
              ⌨ Shortcuts Cheatsheet
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#858585' }}>Command Palette</span>
                <span style={{ fontFamily: 'monospace', color: '#79c0ff' }}>Ctrl+Shift+P</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#858585' }}>User Settings</span>
                <span style={{ fontFamily: 'monospace', color: '#79c0ff' }}>Ctrl+,</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#858585' }}>Toggle Sidebar</span>
                <span style={{ fontFamily: 'monospace', color: '#79c0ff' }}>Ctrl+B</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#858585' }}>Toggle Terminal</span>
                <span style={{ fontFamily: 'monospace', color: '#79c0ff' }}>Ctrl+J</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#858585' }}>Toggle AI Chat</span>
                <span style={{ fontFamily: 'monospace', color: '#79c0ff' }}>Ctrl+L</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
