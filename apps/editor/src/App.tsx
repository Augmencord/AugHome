import React, { useRef, useCallback, useEffect } from 'react';
import { IDEProvider, useIDE } from './context/IDEContext';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { ChatPanel } from './components/ChatPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';

const MainLayout: React.FC = () => {
  const { state, dispatch } = useIDE();
  const activeFile = state.openFiles.find((f) => f.id === state.activeFileId);

  // Global VS Code-compatible keybindings listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+P or F1: Command Palette
      if ((isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') || e.key === 'F1') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      }
      // Ctrl+,: Open Settings
      else if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SETTINGS' });
      }
      // Ctrl+B: Toggle Sidebar
      else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SIDEBAR' });
      }
      // Ctrl+J: Toggle Terminal
      else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_TERMINAL' });
      }
      // Ctrl+L: Toggle AI Chat
      else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_CHAT' });
      }
      // Ctrl+S: Prevent default browser save dialog
      else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [dispatch]);

  // Resize handler for Sidebar (Horizontal)
  const handleSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = state.sidebarWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        dispatch({ type: 'SET_SIDEBAR_WIDTH', payload: startWidth + deltaX });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
      };

      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [state.sidebarWidth, dispatch]
  );

  // Resize handler for AI Chat Panel (Horizontal)
  const handleChatResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = state.chatWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        dispatch({ type: 'SET_CHAT_WIDTH', payload: startWidth + deltaX });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
      };

      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [state.chatWidth, dispatch]
  );

  // Resize handler for Terminal (Vertical)
  const handleTerminalResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = state.terminalHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = startY - moveEvent.clientY;
        dispatch({ type: 'SET_TERMINAL_HEIGHT', payload: startHeight + deltaY });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
      };

      document.body.style.cursor = 'row-resize';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [state.terminalHeight, dispatch]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#cccccc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        userSelect: 'none',
      }}
      data-testid="ide-container"
    >
      {/* Top Application Bar / Window Header */}
      <div
        style={{
          height: '35px',
          minHeight: '35px',
          backgroundColor: '#181818',
          borderBottom: '1px solid #282828',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          fontSize: '12px',
        }}
        data-testid="top-titlebar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', color: '#58a6ff' }}>⚡</span>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>AugHome</span>
          </div>
          {/* Quick Menu items */}
          <div style={{ display: 'flex', gap: '12px', color: '#999999', fontSize: '12px' }}>
            <span style={{ cursor: 'pointer' }}>File</span>
            <span style={{ cursor: 'pointer' }}>Edit</span>
            <span style={{ cursor: 'pointer' }}>Selection</span>
            <span style={{ cursor: 'pointer' }}>View</span>
            <span style={{ cursor: 'pointer' }}>Terminal</span>
            <span style={{ cursor: 'pointer' }}>Help</span>
          </div>
        </div>

        {/* Center Title Display */}
        <div
          style={{
            color: '#8b949e',
            fontSize: '12px',
            backgroundColor: '#252526',
            padding: '3px 20px',
            borderRadius: '4px',
            border: '1px solid #333333',
            minWidth: '220px',
            textAlign: 'center',
          }}
        >
          {activeFile ? `${activeFile.filename} — AugHome IDE` : 'AugHome IDE — Workspace'}
        </div>

        {/* Right Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#3fb950', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> Augagent Connected
          </span>
        </div>
      </div>

      {/* Main Workspace Panels Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Activity Bar (48px fixed) */}
        <ActivityBar />

        {/* Sidebar (Resizable, 250px default) */}
        <Sidebar />

        {/* Sidebar Drag Handle */}
        {state.isSidebarOpen && (
          <div
            onMouseDown={handleSidebarResize}
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#007acc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          />
        )}

        {/* Center Area: Editor + Terminal */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Editor Area (Monaco + Tabs + Breadcrumbs) */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <EditorArea />
          </div>

          {/* Terminal Drag Handle */}
          {state.isTerminalOpen && (
            <div
              onMouseDown={handleTerminalResize}
              style={{
                height: '4px',
                cursor: 'row-resize',
                backgroundColor: 'transparent',
                transition: 'background-color 0.15s ease',
                zIndex: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#007acc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            />
          )}

          {/* Terminal Panel (Bottom PTY) */}
          <TerminalPanel />
        </div>

        {/* Chat Drag Handle */}
        {state.isChatOpen && (
          <div
            onMouseDown={handleChatResize}
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#007acc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          />
        )}

        {/* AI Chat Sidecar Panel (Right, 350px default) */}
        <ChatPanel />
      </div>

      {/* Status Bar (22px fixed) */}
      <StatusBar />

      {/* Global Modals and Overlays */}
      <CommandPalette />
      <SettingsModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <IDEProvider>
      <MainLayout />
    </IDEProvider>
  );
};
