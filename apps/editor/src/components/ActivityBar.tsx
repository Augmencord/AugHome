import React from 'react';
import { useIDE } from '../context/IDEContext';
import { ActivityTab } from '../types';

export const ActivityBar: React.FC = () => {
  const { state, dispatch } = useIDE();

  const gitChangeCount =
    state.gitStatus.staged.length +
    state.gitStatus.unstaged.length +
    state.gitStatus.untracked.length;

  const handleTabClick = (tab: ActivityTab) => {
    if (tab === 'chat') {
      if (!state.isChatOpen) {
        dispatch({ type: 'TOGGLE_CHAT' });
      }
    }
    dispatch({ type: 'SET_ACTIVITY_TAB', payload: tab });
  };

  const navItems: { id: ActivityTab; label: string; icon: JSX.Element; badge?: number }[] = [
    {
      id: 'explorer',
      label: 'Explorer (Ctrl+Shift+E)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'Search (Ctrl+Shift+F)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      id: 'git',
      label: 'Source Control (Ctrl+Shift+G)',
      badge: gitChangeCount > 0 ? gitChangeCount : undefined,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      ),
    },
    {
      id: 'extensions',
      label: 'Extensions (Ctrl+Shift+X)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
          <rect x="14" y="2" width="8" height="8" rx="1.5" />
          <rect x="2" y="14" width="8" height="8" rx="1.5" />
          <path d="M14 18h4m-2-2v4" />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Augagent AI Chat (Ctrl+Alt+A)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" />
          <path d="M5.5 12h13a3.5 3.5 0 0 1 3.5 3.5v1.5a3 3 0 0 1-3 3h-1.5l-3 3-3-3H9a3 3 0 0 1-3-3v-1.5A3.5 3.5 0 0 1 5.5 12z" />
          <circle cx="9" cy="16" r="1" fill="currentColor" />
          <circle cx="15" cy="16" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        width: '48px',
        minWidth: '48px',
        maxWidth: '48px',
        height: '100%',
        backgroundColor: '#181818',
        borderRight: '1px solid #282828',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        zIndex: 10,
        boxSizing: 'border-box',
      }}
      data-testid="activity-bar"
    >
      {/* Top action items */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = state.isSidebarOpen && state.activeActivityTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
                color: isActive ? '#ffffff' : '#858585',
                cursor: 'pointer',
                transition: 'color 0.15s ease, background-color 0.15s ease',
                padding: 0,
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#cccccc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#858585';
              }}
            >
              {item.icon}
              {item.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#007acc',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '1px 5px',
                    lineHeight: '12px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom utility items */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_TERMINAL' })}
          title="Toggle Terminal (`Ctrl+`)"
          style={{
            width: '48px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: state.isTerminalOpen ? '#58a6ff' : '#858585',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
          title="Toggle AI Chat Panel"
          style={{
            width: '48px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: state.isChatOpen ? '#3fb950' : '#858585',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
