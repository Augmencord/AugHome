/**
 * Monaco Inline Completion Provider with 300ms debounce, in-flight request cancellation,
 * and ghost text display.
 */

export interface InlineCompletionConfig {
  debounceMs?: number;
  backendUrl?: string;
}

export class InlineCompletionManager {
  private debounceTimer: any = null;
  private abortController: AbortController | null = null;
  public debounceMs: number;
  public backendUrl: string;

  constructor(config?: InlineCompletionConfig) {
    this.debounceMs = config?.debounceMs ?? 300;
    this.backendUrl = config?.backendUrl ?? 'http://127.0.0.1:8000';
  }

  /**
   * Cancel any pending debounce timer and in-flight HTTP request.
   */
  public cancelInFlight(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Register the inline completion provider with Monaco.
   */
  public register(
    monaco: any,
    editor: any,
    getActiveFile: () => { path: string; language?: string } | null,
    getSelectedModel: () => string
  ): { dispose: () => void } {
    const provider = monaco.languages.registerInlineCompletionsProvider(
      { pattern: '**' },
      {
        provideInlineCompletions: async (
          model: any,
          position: any,
          _context: any,
          token: any
        ) => {
          // 1. Cancel previous in-flight request immediately
          this.cancelInFlight();

          const activeFile = getActiveFile();
          if (!activeFile) {
            return { items: [] };
          }

          // 2. Debounce by 300ms
          return new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
              if (token.isCancellationRequested) {
                return resolve({ items: [] });
              }

              this.abortController = new AbortController();
              const requestId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

              try {
                const content = model.getValue();
                const response = await fetch(`${this.backendUrl}/v1/complete`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: this.abortController.signal,
                  body: JSON.stringify({
                    file_path: activeFile.path,
                    content,
                    cursor_line: position.lineNumber,
                    cursor_column: position.column,
                    language_id: activeFile.language || 'typescript',
                    model: getSelectedModel(),
                    request_id: requestId,
                    max_tokens: 128,
                  }),
                });

                if (!response.ok) {
                  return resolve({ items: [] });
                }

                const data = await response.json();
                const items = (data.items || []).map((item: any) => ({
                  insertText: item.insert_text,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                }));

                resolve({ items });
              } catch (err: any) {
                if (err.name === 'AbortError') {
                  // In-flight request was deliberately aborted by new keystroke
                }
                resolve({ items: [] });
              }
            }, this.debounceMs);
          });
        },
        freeInlineCompletions: () => {},
      }
    );

    // Register Tab to accept and Escape to dismiss inline completions
    editor.addCommand(monaco.KeyCode.Tab, () => {
      editor.trigger('inlineCompletion', 'editor.action.inlineSuggest.commit', {});
    }, 'inlineSuggestionVisible');

    editor.addCommand(monaco.KeyCode.Escape, () => {
      editor.trigger('inlineCompletion', 'editor.action.inlineSuggest.hide', {});
    }, 'inlineSuggestionVisible');

    return provider;
  }
}
