/**
 * Language Server Protocol (LSP) Client Integration Service for Monaco Editor.
 *
 * Implements:
 * - Real-time diagnostics with Monaco squiggly underlines (setModelMarkers)
 * - Hover documentation tooltips (registerHoverProvider)
 * - Definition navigation (registerDefinitionProvider, Ctrl+Click / F12)
 * - Autocomplete suggestions (registerCompletionItemProvider, Ctrl+Space)
 */

export interface LSPConfig {
  backendUrl?: string;
  diagnosticsDebounceMs?: number;
}

export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number; // 1: Error, 2: Warning, 3: Information, 4: Hint
  message: string;
  source?: string;
}

export interface LSPDefinition {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface LSPCompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insert_text?: string;
}

export class LSPService {
  public backendUrl: string;
  public diagnosticsDebounceMs: number;
  private diagnosticsTimer: any = null;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(config?: LSPConfig) {
    this.backendUrl = config?.backendUrl ?? 'http://127.0.0.1:8000';
    this.diagnosticsDebounceMs = config?.diagnosticsDebounceMs ?? 400;
  }

  /**
   * Schedule debounced diagnostics update on document content change.
   */
  public scheduleDiagnosticsUpdate(
    monaco: any,
    model: any,
    filePath: string,
    languageId?: string
  ): void {
    if (this.diagnosticsTimer) {
      clearTimeout(this.diagnosticsTimer);
    }
    this.diagnosticsTimer = setTimeout(async () => {
      await this.updateDiagnostics(monaco, model, filePath, languageId);
    }, this.diagnosticsDebounceMs);
  }

  /**
   * Fetch diagnostics from backend and render squiggly underlines via Monaco markers.
   */
  public async updateDiagnostics(
    monaco: any,
    model: any,
    filePath: string,
    languageId?: string
  ): Promise<void> {
    if (!monaco || !model || !filePath) return;

    try {
      const content = model.getValue();
      const lang = languageId || (typeof model.getLanguageId === 'function' ? model.getLanguageId() : 'python');
      const response = await fetch(`${this.backendUrl}/v1/lsp/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          content,
          language_id: lang,
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const diagnostics: LSPDiagnostic[] = data.diagnostics || [];

      // Convert LSP severity (1: Error, 2: Warning, 3: Info, 4: Hint)
      // to Monaco MarkerSeverity (8: Error, 4: Warning, 2: Info, 1: Hint)
      const markers = diagnostics.map((diag) => {
        let monacoSeverity = 8; // Error by default
        if (diag.severity === 2) monacoSeverity = 4; // Warning
        else if (diag.severity === 3) monacoSeverity = 2; // Info
        else if (diag.severity === 4) monacoSeverity = 1; // Hint

        return {
          severity: monacoSeverity,
          startLineNumber: Math.max(1, diag.range?.start?.line ?? 1),
          startColumn: Math.max(1, diag.range?.start?.character ?? 1),
          endLineNumber: Math.max(1, diag.range?.end?.line ?? 1),
          endColumn: Math.max(1, diag.range?.end?.character ?? 80),
          message: diag.message,
          source: diag.source || 'lsp',
        };
      });

      monaco.editor.setModelMarkers(model, 'lsp', markers);
    } catch {
      // Graceful fallback if backend unavailable
    }
  }

  /**
   * Register Monaco Hover provider for tooltips on hover.
   */
  public registerHoverProvider(monaco: any): { dispose: () => void } {
    const provider = monaco.languages.registerHoverProvider({ pattern: '**' }, {
      provideHover: async (model: any, position: any) => {
        try {
          const lang = typeof model.getLanguageId === 'function' ? model.getLanguageId() : 'python';
          const response = await fetch(`${this.backendUrl}/v1/lsp/hover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: model.uri?.path || 'file',
              line: position.lineNumber,
              column: position.column,
              content: model.getValue(),
              language_id: lang,
            }),
          });

          if (!response.ok) return null;

          const data = await response.json();
          if (!data || !data.contents) return null;

          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: model.getLineMaxColumn ? model.getLineMaxColumn(position.lineNumber) : 80,
            },
            contents: [
              { value: data.contents },
            ],
          };
        } catch {
          return null;
        }
      },
    });

    this.disposables.push(provider);
    return provider;
  }

  /**
   * Register Monaco Definition provider for Ctrl+Click / F12 navigation.
   */
  public registerDefinitionProvider(monaco: any): { dispose: () => void } {
    const provider = monaco.languages.registerDefinitionProvider({ pattern: '**' }, {
      provideDefinition: async (model: any, position: any) => {
        try {
          const lang = typeof model.getLanguageId === 'function' ? model.getLanguageId() : 'python';
          const response = await fetch(`${this.backendUrl}/v1/lsp/definition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: model.uri?.path || 'file',
              line: position.lineNumber,
              column: position.column,
              content: model.getValue(),
              language_id: lang,
            }),
          });

          if (!response.ok) return [];

          const data = await response.json();
          const definitions: LSPDefinition[] = data.definitions || [];

          return definitions.map((def) => ({
            uri: def.uri ? (def.uri.startsWith('file://') ? monaco.Uri.parse(def.uri) : monaco.Uri.file(def.uri)) : model.uri,
            range: {
              startLineNumber: Math.max(1, def.range?.start?.line ?? 1),
              startColumn: Math.max(1, def.range?.start?.character ?? 1),
              endLineNumber: Math.max(1, def.range?.end?.line ?? 1),
              endColumn: Math.max(1, def.range?.end?.character ?? 80),
            },
          }));
        } catch {
          return [];
        }
      },
    });

    this.disposables.push(provider);
    return provider;
  }

  /**
   * Register Monaco Completion provider for Ctrl+Space suggestions.
   */
  public registerCompletionProvider(monaco: any): { dispose: () => void } {
    const provider = monaco.languages.registerCompletionItemProvider({ pattern: '**' }, {
      triggerCharacters: ['.', ':', '"', '/', '@', '_'],
      provideCompletionItems: async (model: any, position: any) => {
        try {
          const lang = typeof model.getLanguageId === 'function' ? model.getLanguageId() : 'python';
          const response = await fetch(`${this.backendUrl}/v1/lsp/completion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: model.uri?.path || 'file',
              line: position.lineNumber,
              column: position.column,
              content: model.getValue(),
              language_id: lang,
            }),
          });

          if (!response.ok) return { suggestions: [] };

          const data = await response.json();
          const items: LSPCompletionItem[] = data.items || [];
          const word = model.getWordUntilPosition ? model.getWordUntilPosition(position) : null;
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: word ? word.startColumn : position.column,
            endLineNumber: position.lineNumber,
            endColumn: word ? word.endColumn : position.column,
          };

          const suggestions = items.map((item) => ({
            label: item.label,
            kind: item.kind ?? 6, // 14: Keyword, 6: Variable, 3: Function, etc.
            detail: item.detail,
            documentation: item.documentation,
            insertText: item.insert_text || item.label,
            range,
          }));

          return { suggestions };
        } catch {
          return { suggestions: [] };
        }
      },
    });

    this.disposables.push(provider);
    return provider;
  }

  /**
   * Dispose all registered language features and clear timers.
   */
  public dispose(): void {
    if (this.diagnosticsTimer) {
      clearTimeout(this.diagnosticsTimer);
      this.diagnosticsTimer = null;
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
