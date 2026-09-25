import React from 'react';
import { useIDE } from '../context/IDEContext';

export const StatusBar: React.FC = () => {
  const { state, dispatch } = useIDE();
  const activeFile = state.openFiles.find((f) => f.id === state.activeFileId);

  const getLanguageLabel = (lang?: string) => {
    if (!lang) return 'Plain Text';
    if (lang === 'typescript') return 'TypeScript';
    if (lang === 'javascript') return 'JavaScript';
    if (lang === 'python') return 'Python';
    if (lang === 'markdown') return 'Markdown';
    if (lang === 'json') return 'JSON';
    return lang;
  };

  return (
    <div
      style={{
        height: '22px',
        minHeight: '22px',
        backgroundColor: '#007acc',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '11px',
        userSelect: 'none',
        zIndex: 20,
      }}
      data-testid="status-bar"
    >
      {/* Left items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVITY_TAB', payload: 'git' })}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            padding: 0,
          }}
          title="Checkout branch or inspect Git status"
        >
          <span>⎇</span>
          <span>{state.gitStatus.branch}*</span>
        </button>

        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🔄</span>
          <span>0↓ 0↑</span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>✕ 0</span>
          <span>⚠ 0</span>
        </span>
      </div>

      {/* Right items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Model Name */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            padding: 0,
          }}
          title="Active LLM Model"
          data-testid="status-bar-model"
        >
          <span>🤖</span>
          <span>{state.selectedModel}</span>
        </button>

        {/* Cursor Position */}
        <span data-testid="status-bar-cursor">
          Ln {state.cursorPosition.line}, Col {state.cursorPosition.column}
        </span>

        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>LF</span>

        {/* Active Language */}
        <span data-testid="status-bar-language">
          {getLanguageLabel(activeFile?.language)}
        </span>

        {/* Augagent Service Status */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            padding: 0,
          }}
          title="Augagent AI Pairing Service: Online"
        >
          <span style={{ color: '#7ee787' }}>●</span>
          <span>Augagent</span>
        </button>
      </div>
    </div>
  );
};
