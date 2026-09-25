import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIDE } from '../context/IDEContext';
import { CommandItem } from '../types';

export const CommandPalette: React.FC = () => {
  const { state, dispatch } = useIDE();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input whenever palette opens
  useEffect(() => {
    if (state.isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.isCommandPaletteOpen]);

  // Built-in commands catalog
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'view.toggleSidebar',
      title: 'View: Toggle Primary Side Bar',
      category: 'View',
      shortcut: 'Ctrl+B',
      handler: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    },
    {
      id: 'view.toggleTerminal',
      title: 'View: Toggle Integrated Terminal',
      category: 'View',
      shortcut: 'Ctrl+J',
      handler: () => dispatch({ type: 'TOGGLE_TERMINAL' }),
    },
    {
      id: 'view.toggleChat',
      title: 'View: Toggle AugAgent AI Chat',
      category: 'View',
      shortcut: 'Ctrl+L',
      handler: () => dispatch({ type: 'TOGGLE_CHAT' }),
    },
    {
      id: 'preferences.openSettings',
      title: 'Preferences: Open User Settings',
      category: 'Preferences',
      shortcut: 'Ctrl+,',
      handler: () => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true }),
    },
    {
      id: 'view.explorer',
      title: 'View: Focus File Explorer',
      category: 'View',
      handler: () => dispatch({ type: 'SET_ACTIVITY_TAB', payload: 'explorer' }),
    },
    {
      id: 'view.search',
      title: 'View: Focus Search in Files',
      category: 'View',
      handler: () => dispatch({ type: 'SET_ACTIVITY_TAB', payload: 'search' }),
    },
    {
      id: 'view.git',
      title: 'View: Focus Source Control Git',
      category: 'View',
      handler: () => dispatch({ type: 'SET_ACTIVITY_TAB', payload: 'git' }),
    },
    {
      id: 'view.extensions',
      title: 'View: Focus Extensions Catalog',
      category: 'View',
      handler: () => dispatch({ type: 'SET_ACTIVITY_TAB', payload: 'extensions' }),
    },
    {
      id: 'ai.fixErrors',
      title: 'AugAgent: Fix Errors and Diagnostics with AI',
      category: 'AugAgent',
      handler: () => {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: 'Please inspect the active file LSP diagnostics and propose a fix.',
            timestamp: Date.now(),
          },
        });
        if (!state.isChatOpen) {
          dispatch({ type: 'TOGGLE_CHAT' });
        }
      },
    },
    {
      id: 'theme.aughomeDark',
      title: 'Preferences: Color Theme: AugHome Dark',
      category: 'Theme',
      handler: () => {
        dispatch({ type: 'SET_THEME', payload: 'vs-dark' });
        dispatch({ type: 'UPDATE_SETTINGS', payload: { 'editor.theme': 'aughome-dark' } });
      },
    },
    {
      id: 'theme.vsDark',
      title: 'Preferences: Color Theme: Visual Studio Dark',
      category: 'Theme',
      handler: () => {
        dispatch({ type: 'SET_THEME', payload: 'vs-dark' });
        dispatch({ type: 'UPDATE_SETTINGS', payload: { 'editor.theme': 'vs-dark' } });
      },
    },
    {
      id: 'file.closeActive',
      title: 'File: Close Active Tab',
      category: 'File',
      shortcut: 'Ctrl+W',
      handler: () => {
        if (state.activeFileId) {
          dispatch({ type: 'CLOSE_FILE', payload: state.activeFileId });
        }
      },
    },
    {
      id: 'help.welcome',
      title: 'Help: Open Welcome Screen',
      category: 'Help',
      handler: () => {
        // Closing active file surfaces welcome screen
        if (state.activeFileId) {
          dispatch({ type: 'SET_ACTIVE_FILE', payload: '' });
        }
      },
    },
  ], [dispatch, state.activeFileId, state.isChatOpen]);

  // Filter commands by fuzzy match on title or category
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lower) ||
        (cmd.category && cmd.category.toLowerCase().includes(lower))
    );
  }, [commands, query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      dispatch({ type: 'SET_COMMAND_PALETTE', payload: false });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].handler();
        dispatch({ type: 'SET_COMMAND_PALETTE', payload: false });
      }
    }
  };

  if (!state.isCommandPaletteOpen) {
    return null;
  }

  return (
    <div
      onClick={() => dispatch({ type: 'SET_COMMAND_PALETTE', payload: false })}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '60px',
      }}
      data-testid="command-palette-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '580px',
          maxWidth: '92vw',
          backgroundColor: '#252526',
          borderRadius: '6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          border: '1px solid #3c3c3c',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input field */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333333', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#007acc', fontSize: '13px' }}>&gt;</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
            }}
            data-testid="command-palette-input"
          />
        </div>

        {/* Command list */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '4px 0',
          }}
          data-testid="command-palette-results"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.handler();
                    dispatch({ type: 'SET_COMMAND_PALETTE', payload: false });
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? '#094771' : 'transparent',
                    color: isSelected ? '#ffffff' : '#cccccc',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cmd.category && (
                      <span style={{ color: isSelected ? '#79c0ff' : '#858585', fontSize: '11px' }}>
                        {cmd.category}:
                      </span>
                    )}
                    <span>{cmd.title}</span>
                  </div>
                  {cmd.shortcut && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: isSelected ? '#ffffff' : '#858585',
                        backgroundColor: isSelected ? '#007acc' : '#333333',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#858585', fontSize: '12px' }}>
              No matching commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
