import React, { useState, useEffect } from 'react';
import { useIDE } from '../context/IDEContext';
import { FileItem } from '../types';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useIDE();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f-root-apps': true,
    'f-apps-desktop': true,
    'f-apps-backend': true,
    'f-apps-editor': true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [extensionsList, setExtensionsList] = useState<any[]>([
    { id: 'python-support', name: 'Python Language Support', description: 'Rich language intelligence, linting, syntax diagnostics, and execution support for Python', version: 'v0.1.0', enabled: true },
    { id: 'theme-aughome-dark', name: 'AugHome Dark Theme', description: 'Signature sleek dark aesthetic for AugHome IDE with high-contrast syntax highlighting', version: 'v0.1.0', enabled: true },
    { id: 'git-lens', name: 'GitLens Explorer', description: 'Git blame annotations, commit history explorer, and branch status visualization', version: 'v0.1.0', enabled: true },
  ]);

  useEffect(() => {
    if (state.activeActivityTab === 'extensions') {
      fetch('http://127.0.0.1:8000/v1/extensions')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.extensions && data.extensions.length > 0) {
            setExtensionsList(data.extensions);
          }
        })
        .catch(() => {});
    }
  }, [state.activeActivityTab]);

  const toggleExtension = async (extId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/v1/extensions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extension_id: extId, enabled: !currentEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtensionsList((prev) =>
          prev.map((e) => (e.id === extId ? { ...e, enabled: data.extension.enabled } : e))
        );
      }
    } catch {
      setExtensionsList((prev) =>
        prev.map((e) => (e.id === extId ? { ...e, enabled: !currentEnabled } : e))
      );
    }
  };

  if (!state.isSidebarOpen) {
    return null;
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const getFileIcon = (filename: string, isDir: boolean, isOpen: boolean) => {
    if (isDir) {
      return (
        <span style={{ color: '#dcb67a', marginRight: '6px', fontSize: '13px' }}>
          {isOpen ? '📂' : '📁'}
        </span>
      );
    }
    if (filename.endsWith('.py')) {
      return <span style={{ color: '#3572A5', marginRight: '6px', fontWeight: 600, fontSize: '12px' }}>🐍</span>;
    }
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      return <span style={{ color: '#3178c6', marginRight: '6px', fontWeight: 700, fontSize: '12px' }}>TS</span>;
    }
    if (filename.endsWith('.json')) {
      return <span style={{ color: '#cbcb41', marginRight: '6px', fontWeight: 700, fontSize: '12px' }}>{'{}'}</span>;
    }
    if (filename.endsWith('.md')) {
      return <span style={{ color: '#519aba', marginRight: '6px', fontSize: '12px' }}>📝</span>;
    }
    return <span style={{ color: '#858585', marginRight: '6px', fontSize: '12px' }}>📄</span>;
  };

  const renderFileTree = (items: FileItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders[item.id] ?? false;
      const isSelected = state.activeFileId === item.id;

      if (item.isDir) {
        return (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              onClick={() => toggleFolder(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: `3px 8px 3px ${depth * 14 + 8}px`,
                cursor: 'pointer',
                fontSize: '13px',
                color: '#cccccc',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a2d2e')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ fontSize: '10px', width: '14px', color: '#858585' }}>
                {isExpanded ? '▼' : '►'}
              </span>
              {getFileIcon(item.name, true, isExpanded)}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </span>
            </div>
            {isExpanded && item.children && renderFileTree(item.children, depth + 1)}
          </div>
        );
      }

      return (
        <div
          key={item.id}
          onClick={() => dispatch({ type: 'OPEN_FILE', payload: item })}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `3px 8px 3px ${depth * 14 + 22}px`,
            cursor: 'pointer',
            fontSize: '13px',
            backgroundColor: isSelected ? '#37373d' : 'transparent',
            color: isSelected ? '#ffffff' : '#cccccc',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = '#2a2d2e';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {getFileIcon(item.name, false, false)}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </span>
        </div>
      );
    });
  };

  // Mock search results
  const mockSearchResults = [
    { file: 'apps/backend/server.py', line: 5, text: '@app.get("/health")' },
    { file: 'apps/backend/diff_engine.py', line: 2, text: 'class DiffEngine:' },
    { file: 'apps/desktop/src/main.ts', line: 4, text: 'AugHome Desktop Shell started.' },
  ].filter((r) => !searchQuery || r.text.toLowerCase().includes(searchQuery.toLowerCase()) || r.file.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div
      style={{
        width: `${state.sidebarWidth}px`,
        minWidth: '180px',
        maxWidth: '500px',
        height: '100%',
        backgroundColor: '#252526',
        borderRight: '1px solid #1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      data-testid="sidebar-panel"
    >
      {/* Sidebar Header */}
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          color: '#bbbbbb',
          borderBottom: '1px solid #1e1e1e',
          textTransform: 'uppercase',
        }}
      >
        <span>
          {state.activeActivityTab === 'explorer' && 'Explorer: AugHome'}
          {state.activeActivityTab === 'search' && 'Search'}
          {state.activeActivityTab === 'git' && 'Source Control'}
          {state.activeActivityTab === 'extensions' && 'Extensions'}
          {state.activeActivityTab === 'chat' && 'Augagent AI'}
        </span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title="Collapse Sidebar"
          style={{
            background: 'none',
            border: 'none',
            color: '#858585',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Sidebar Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Explorer View */}
        {state.activeActivityTab === 'explorer' && (
          <div style={{ padding: '6px 0' }}>
            <div
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#aaaaaa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>WORKSPACE ROOT</span>
              <span style={{ fontSize: '11px', color: '#6e7681' }}>AUGHOME</span>
            </div>
            {renderFileTree(state.fileTree)}
          </div>
        )}

        {/* Search View */}
        {state.activeActivityTab === 'search' && (
          <div style={{ padding: '12px' }}>
            <input
              type="text"
              placeholder="Search in files (Press Enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#3c3c3c',
                border: '1px solid #3c3c3c',
                borderRadius: '2px',
                color: '#cccccc',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
            />
            <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px' }}>
              {mockSearchResults.length} results found
            </div>
            {mockSearchResults.map((res, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 8px',
                  borderRadius: '3px',
                  backgroundColor: '#2a2d2e',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <div style={{ color: '#58a6ff', fontWeight: 500 }}>{res.file}</div>
                <div style={{ color: '#858585', fontSize: '11px', marginTop: '2px' }}>
                  Line {res.line}: <code style={{ color: '#ce9178' }}>{res.text}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Source Control View */}
        {state.activeActivityTab === 'git' && (
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ color: '#58a6ff', fontSize: '14px' }}>⎇</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0f6fc' }}>
                {state.gitStatus.branch}
              </span>
            </div>

            <textarea
              placeholder="Message (Ctrl+Enter to commit)"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#3c3c3c',
                border: '1px solid #3c3c3c',
                borderRadius: '2px',
                color: '#cccccc',
                fontSize: '12px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '8px',
              }}
            />

            <button
              onClick={() => {
                if (commitMessage.trim()) {
                  alert(`Committed: ${commitMessage}`);
                  setCommitMessage('');
                }
              }}
              style={{
                width: '100%',
                padding: '6px 0',
                backgroundColor: '#007acc',
                border: 'none',
                borderRadius: '2px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              ✓ Commit & Sync
            </button>

            {/* Staged files */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaaaaa', marginBottom: '4px' }}>
                STAGED CHANGES ({state.gitStatus.staged.length})
              </div>
              {state.gitStatus.staged.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: '12px', color: '#85e89d' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                  <span style={{ fontWeight: 700 }}>A</span>
                </div>
              ))}
            </div>

            {/* Unstaged files */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaaaaa', marginBottom: '4px' }}>
                CHANGES ({state.gitStatus.unstaged.length})
              </div>
              {state.gitStatus.unstaged.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: '12px', color: '#e3b341' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                  <span style={{ fontWeight: 700 }}>M</span>
                </div>
              ))}
            </div>

            {/* Untracked files */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaaaaa', marginBottom: '4px' }}>
                UNTRACKED ({state.gitStatus.untracked.length})
              </div>
              {state.gitStatus.untracked.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: '12px', color: '#79c0ff' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                  <span style={{ fontWeight: 700 }}>U</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extensions View */}
        {state.activeActivityTab === 'extensions' && (
          <div style={{ padding: '12px' }} data-testid="extensions-panel">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#aaaaaa', marginBottom: '8px' }}>
              INSTALLED EXTENSIONS ({extensionsList.length})
            </div>
            {extensionsList.map((ext, idx) => (
              <div
                key={ext.id || idx}
                style={{
                  padding: '10px',
                  backgroundColor: '#2a2d2e',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  border: '1px solid #333333',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#f0f6fc' }}>{ext.name}</span>
                  <button
                    onClick={() => toggleExtension(ext.id, ext.enabled ?? true)}
                    style={{
                      fontSize: '10px',
                      backgroundColor: ext.enabled ? '#1f6feb' : '#444444',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {ext.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div style={{ color: '#858585', fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
                  {ext.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e7681', fontSize: '10px', marginTop: '6px' }}>
                  <span>{ext.version || 'v0.1.0'}</span>
                  <span>{ext.publisher ? `@${ext.publisher}` : 'built-in'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
