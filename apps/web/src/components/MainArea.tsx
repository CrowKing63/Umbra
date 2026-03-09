import { useFile } from '../context/FileContext';
import { EditorPanel } from './editor/EditorPanel';

export function MainArea() {
  const { selectedFile } = useFile();

  return (
    <main className="main-area">
      {selectedFile ? (
        <EditorPanel />
      ) : (
        <div className="empty-state">
          <div className="empty-state-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h2>Welcome to Umbra</h2>
            <p>Select a document from the sidebar or create a new one to get started.</p>
            <div className="keyboard-hints">
              <div className="hint">
                <kbd>⌘</kbd>
                <kbd>N</kbd>
                <span>New document</span>
              </div>
              <div className="hint">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
                <span>Quick search</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
          background: var(--color-bg);
        }

        .empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-xl);
        }

        .empty-state-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          text-align: center;
          max-width: 500px;
        }

        .empty-state-content svg {
          color: var(--color-border);
          margin-bottom: var(--space-sm);
        }

        .empty-state-content h2 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin: 0;
        }

        .empty-state-content p {
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .keyboard-hints {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-top: var(--space-lg);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border-light);
          width: 100%;
        }

        .hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-text-secondary);
        }

        .hint span {
          margin-left: var(--space-sm);
        }
      `}</style>
    </main>
  );
}
