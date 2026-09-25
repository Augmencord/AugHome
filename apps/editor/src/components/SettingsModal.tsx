import React, { useState, useEffect } from 'react';
import { useIDE } from '../context/IDEContext';

export const SettingsModal: React.FC = () => {
  const { state, dispatch } = useIDE();
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'keybindings'>('editor');
  const [fontSize, setFontSize] = useState<number>(state.settings['editor.fontSize'] ?? 13);
  const [tabSize, setTabSize] = useState<number>(state.settings['editor.tabSize'] ?? 2);
  const [theme, setTheme] = useState<string>(state.settings['editor.theme'] ?? 'aughome-dark');
  const [minimap, setMinimap] = useState<boolean>(state.settings['editor.minimap'] ?? true);
  const [inlineSuggest, setInlineSuggest] = useState<boolean>(state.settings['editor.inlineSuggest'] ?? true);
  const [selectedModel, setSelectedModel] = useState<string>(state.selectedModel);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    setFontSize(state.settings['editor.fontSize'] ?? 13);
    setTabSize(state.settings['editor.tabSize'] ?? 2);
    setTheme(state.settings['editor.theme'] ?? 'aughome-dark');
    setMinimap(state.settings['editor.minimap'] ?? true);
    setInlineSuggest(state.settings['editor.inlineSuggest'] ?? true);
    setSelectedModel(state.selectedModel);
  }, [state.settings, state.selectedModel]);

  if (!state.isSettingsOpen) {
    return null;
  }

  const handleSave = async () => {
    const updated = {
      'editor.fontSize': fontSize,
      'editor.tabSize': tabSize,
      'editor.theme': theme,
      'editor.minimap': minimap,
      'editor.inlineSuggest': inlineSuggest,
      'ai.selectedModel': selectedModel,
    };

    dispatch({ type: 'UPDATE_SETTINGS', payload: updated });
    dispatch({ type: 'SET_MODEL', payload: selectedModel });

    try {
      await fetch('http://127.0.0.1:8000/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updated }),
      });
      setSaveStatus('Saved to ~/.aughome/settings.json');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch {
      setSaveStatus('Saved locally (backend offline)');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  return (
    <div
      onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      data-testid="settings-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '94vw',
          height: '480px',
          backgroundColor: '#1e1e1e',
          borderRadius: '8px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          border: '1px solid #333333',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: '42px',
            backgroundColor: '#252526',
            borderBottom: '1px solid #333333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⚙</span>
            <span style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '13px' }}>
              AugHome Settings (~/.aughome/settings.json)
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })}
            style={{
              background: 'none',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body: Sidebar + Main Form */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Navigation */}
          <div
            style={{
              width: '160px',
              backgroundColor: '#252526',
              borderRight: '1px solid #333333',
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setActiveTab('editor')}
              style={{
                textAlign: 'left',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: activeTab === 'editor' ? '#37373d' : 'transparent',
                color: activeTab === 'editor' ? '#ffffff' : '#969696',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Editor & Theme
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                textAlign: 'left',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: activeTab === 'ai' ? '#37373d' : 'transparent',
                color: activeTab === 'ai' ? '#ffffff' : '#969696',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              AugAgent AI
            </button>
            <button
              onClick={() => setActiveTab('keybindings')}
              style={{
                textAlign: 'left',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: activeTab === 'keybindings' ? '#37373d' : 'transparent',
                color: activeTab === 'keybindings' ? '#ffffff' : '#969696',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Keybindings
            </button>
          </div>

          {/* Form Options */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {activeTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cccccc', marginBottom: '6px' }}>
                    Color Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      backgroundColor: '#3c3c3c',
                      color: '#ffffff',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <option value="aughome-dark">AugHome Dark (Signature)</option>
                    <option value="vs-dark">Visual Studio Dark</option>
                    <option value="hc-black">High Contrast Black</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cccccc', marginBottom: '6px' }}>
                      Font Size
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={28}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        backgroundColor: '#3c3c3c',
                        color: '#ffffff',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cccccc', marginBottom: '6px' }}>
                      Tab Size (Spaces)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={tabSize}
                      onChange={(e) => setTabSize(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        backgroundColor: '#3c3c3c',
                        color: '#ffffff',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={minimap}
                      onChange={(e) => setMinimap(e.target.checked)}
                    />
                    Display Editor Minimap
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={inlineSuggest}
                      onChange={(e) => setInlineSuggest(e.target.checked)}
                    />
                    Enable Ghost-Text Inline Code Completions (Tab to Accept)
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cccccc', marginBottom: '6px' }}>
                    Default Coding Model Tier
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      backgroundColor: '#3c3c3c',
                      color: '#ffffff',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default · Ultra Fast)</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Advanced Architecture)</option>
                    <option value="gpt-4o">GPT-4o (Reasoning & Systems)</option>
                    <option value="ollama-local">Ollama Local (Offline Zero-Cloud)</option>
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: '#858585', lineHeight: 1.5 }}>
                  AugHome IDE supports multi-model cascading. If a primary cloud provider rate limits or experiences latency, requests automatically fall back to local Ollama.
                </div>
              </div>
            )}

            {activeTab === 'keybindings' && (
              <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#f0f6fc', marginBottom: '10px' }}>
                  VS Code Compatible Keybindings
                </div>
                {[
                  { action: 'Command Palette', key: 'Ctrl+Shift+P / F1' },
                  { action: 'Quick Open File', key: 'Ctrl+P' },
                  { action: 'Toggle Sidebar', key: 'Ctrl+B' },
                  { action: 'Toggle Terminal', key: 'Ctrl+J' },
                  { action: 'Toggle AI Chat', key: 'Ctrl+L' },
                  { action: 'Open User Settings', key: 'Ctrl+,' },
                  { action: 'Accept Inline Completion', key: 'Tab' },
                  { action: 'Trigger Completion Menu', key: 'Ctrl+Space' },
                  { action: 'Go to Definition', key: 'Ctrl+Click / F12' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid #2a2a2a',
                    }}
                  >
                    <span style={{ color: '#cccccc' }}>{item.action}</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        color: '#79c0ff',
                        backgroundColor: '#2a2d2e',
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {item.key}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            height: '44px',
            backgroundColor: '#252526',
            borderTop: '1px solid #333333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <span style={{ color: '#3fb950', fontSize: '11px' }}>{saveStatus}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })}
              style={{
                padding: '5px 12px',
                backgroundColor: '#3c3c3c',
                border: 'none',
                color: '#cccccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '5px 14px',
                backgroundColor: '#007acc',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
