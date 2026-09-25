import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useIDE } from '../context/IDEContext';
import { InlineCompletionManager } from '../services/inlineCompletion';
import { LSPService } from '../services/lspService';
import { WelcomeScreen } from './WelcomeScreen';

export const EditorArea: React.FC = () => {
  const { state, dispatch } = useIDE();
  const activeFile = state.openFiles.find((f) => f.id === state.activeFileId) || null;
  const inlineManagerRef = useRef<InlineCompletionManager>(new InlineCompletionManager());
  const lspServiceRef = useRef<LSPService>(new LSPService());
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (monacoRef.current && editorRef.current && activeFile) {
      lspServiceRef.current.updateDiagnostics(
        monacoRef.current,
        editorRef.current.getModel(),
        activeFile.path,
        activeFile.language
      );
    }
  }, [activeFile?.id]);

  useEffect(() => {
    return () => {
      lspServiceRef.current.dispose();
      inlineManagerRef.current.cancelInFlight();
    };
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register cursor position change listener
    editor.onDidChangeCursorPosition((e) => {
      dispatch({
        type: 'SET_CURSOR_POSITION',
        payload: {
          line: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    // Register Inline Completion Provider with 300ms debounce and in-flight cancel
    inlineManagerRef.current.register(
      monaco,
      editor,
      () => activeFile,
      () => state.selectedModel
    );

    // Register LSP Language Features (Hover tooltips, Ctrl+Click definitions, Ctrl+Space autocomplete)
    lspServiceRef.current.registerHoverProvider(monaco);
    lspServiceRef.current.registerDefinitionProvider(monaco);
    lspServiceRef.current.registerCompletionProvider(monaco);

    // Trigger initial diagnostics for active file
    if (activeFile) {
      lspServiceRef.current.updateDiagnostics(
        monaco,
        editor.getModel(),
        activeFile.path,
        activeFile.language
      );
    }
  };

  const handleContentChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      dispatch({
        type: 'UPDATE_FILE_CONTENT',
        payload: {
          id: activeFile.id,
          content: value,
        },
      });

      // Update LSP diagnostics on content change (debounced)
      if (monacoRef.current && editorRef.current) {
        lspServiceRef.current.scheduleDiagnosticsUpdate(
          monacoRef.current,
          editorRef.current.getModel(),
          activeFile.path,
          activeFile.language
        );
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        backgroundColor: '#1e1e1e',
        overflow: 'hidden',
      }}
      data-testid="editor-area"
    >
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#252526',
          borderBottom: '1px solid #1e1e1e',
          overflowX: 'auto',
          height: '35px',
          alignItems: 'flex-end',
          userSelect: 'none',
        }}
        data-testid="editor-tabs"
      >
        {state.openFiles.map((tab) => {
          const isActive = tab.id === state.activeFileId;
          return (
            <div
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_FILE', payload: tab.id })}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                height: '34px',
                backgroundColor: isActive ? '#1e1e1e' : '#2d2d2d',
                borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
                borderRight: '1px solid #1e1e1e',
                color: isActive ? '#ffffff' : '#969696',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                gap: '8px',
              }}
            >
              <span>{tab.filename}</span>
              {tab.isDirty && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                  }}
                  title="Unsaved changes"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'CLOSE_FILE', payload: tab.id });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#858585',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#858585')}
                title="Close"
              >
                ✕
              </button>
            </div>
          );
        })}
        {state.openFiles.length === 0 && (
          <div
            style={{
              padding: '0 16px',
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              color: '#6e7681',
              fontSize: '12px',
            }}
          >
            No open files
          </div>
        )}
      </div>

      {/* Breadcrumbs Bar */}
      {activeFile && (
        <div
          style={{
            height: '24px',
            backgroundColor: '#1e1e1e',
            borderBottom: '1px solid #282828',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: '11px',
            color: '#a0a0a0',
            gap: '6px',
          }}
          data-testid="editor-breadcrumbs"
        >
          {activeFile.path.split('/').map((segment, idx, arr) => (
            <React.Fragment key={idx}>
              <span style={{ color: idx === arr.length - 1 ? '#ffffff' : '#858585' }}>
                {segment}
              </span>
              {idx < arr.length - 1 && <span style={{ color: '#555555' }}>›</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor Center Container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeFile ? (
          <Editor
            height="100%"
            language={activeFile.language || 'typescript'}
            value={activeFile.content}
            theme="vs-dark"
            options={{
              fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: true, side: 'right' },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              wordWrap: 'on',
              padding: { top: 8, bottom: 8 },
              inlineSuggest: {
                enabled: true,
                mode: 'subwordSmart',
              },
              suggest: {
                preview: true,
              },
            }}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            loading={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#858585',
                  fontSize: '13px',
                }}
              >
                Initializing Monaco Editor...
              </div>
            }
          />
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};
