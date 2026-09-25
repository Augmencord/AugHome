import React from 'react';
import { OpenFileTab } from '../types';

interface EditorProps {
  activeFile: OpenFileTab | null;
  onChangeContent: (newContent: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ activeFile, onChangeContent }) => {
  if (!activeFile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6e7681',
        fontSize: '14px',
        backgroundColor: '#0d1117'
      }}>
        <h2>AugHome IDE</h2>
        <p>Open a file or prompt Augagent to begin coding.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#0d1117' }}>
      {/* Monaco editor mounting container */}
      <textarea
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'Consolas, "Fira Code", monospace',
          fontSize: '13px',
          border: 'none',
          padding: '16px',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box'
        }}
        value={activeFile.content}
        onChange={(e) => onChangeContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};
