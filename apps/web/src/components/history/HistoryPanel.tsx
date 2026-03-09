import { useState, useEffect } from 'react';
import type { HistoryEntry, Snapshot } from '@umbra/shared-types';
import { getHistory, getSnapshotContent, restoreSnapshot, createSnapshot } from '../../services/historyService';
import { useFile } from '../../context/FileContext';

interface HistoryPanelProps {
  onRestore?: () => void;
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const { selectedFile, editorState, updateContent } = useFile();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [snapshotContent, setSnapshotContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      loadHistory(selectedFile.path);
    } else {
      setHistory([]);
      setSelectedSnapshot(null);
      setSnapshotContent(null);
    }
  }, [selectedFile]);

  const loadHistory = async (filePath: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getHistory(filePath);
      setHistory(result.entries);
    } catch (err) {
      setError('Failed to load history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshotSelect = async (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setSnapshotContent(null);
    setError(null);

    try {
      const result = await getSnapshotContent(snapshot.id);
      setSnapshotContent(result.content);
    } catch (err) {
      setError('Failed to load snapshot content');
      console.error(err);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot || !selectedFile) return;

    setRestoring(true);
    setError(null);

    try {
      const success = await restoreSnapshot(selectedSnapshot.id, selectedFile.path);
      if (success) {
        // Update current editor content
        if (snapshotContent) {
          updateContent(snapshotContent);
        }
        onRestore?.();
        // Reload history to show new snapshot
        loadHistory(selectedFile.path);
      } else {
        setError('Failed to restore snapshot');
      }
    } catch (err) {
      setError('Failed to restore snapshot');
      console.error(err);
    } finally {
      setRestoring(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedFile) return;

    setCreatingSnapshot(true);
    setError(null);

    try {
      await createSnapshot(selectedFile.path);
      await loadHistory(selectedFile.path);
    } catch (err) {
      setError('Failed to create snapshot');
      console.error(err);
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!selectedFile) {
    return (
      <div className="history-empty">
        <p>Select a file to view its history</p>
        <style>{`
          .history-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--color-text-muted);
            font-size: 14px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>History</h3>
        <button 
          className="snapshot-btn"
          onClick={handleCreateSnapshot}
          disabled={creatingSnapshot || !editorState.isDirty}
        >
          {creatingSnapshot ? 'Saving...' : 'Create Snapshot'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="dismiss-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="history-content">
        {loading ? (
          <div className="loading">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="no-history">
            <p>No snapshots yet</p>
            <small>Create a snapshot to save the current state</small>
          </div>
        ) : (
          <>
            <div className="history-list">
              {history.map((entry) => (
                <div 
                  key={entry.snapshot.id}
                  className={`history-item ${selectedSnapshot?.id === entry.snapshot.id ? 'selected' : ''}`}
                  onClick={() => handleSnapshotSelect(entry.snapshot)}
                >
                  <div className="item-header">
                    <span className="timestamp">{formatDate(entry.snapshot.timestamp)}</span>
                    <span className="size">{formatSize(entry.snapshot.size)}</span>
                  </div>
                  {entry.changeDescription && (
                    <div className="description">{entry.changeDescription}</div>
                  )}
                </div>
              ))}
            </div>

            {selectedSnapshot && snapshotContent && (
              <div className="history-diff">
                <div className="diff-header">
                  <h4>Snapshot Content</h4>
                  <button 
                    className="restore-btn"
                    onClick={handleRestore}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring...' : 'Restore This Version'}
                  </button>
                </div>
                <pre className="diff-content">
                  {snapshotContent}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .history-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-sm) 0;
          margin-bottom: var(--space-md);
        }

        .history-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text);
        }

        .snapshot-btn {
          padding: var(--space-xs) var(--space-sm);
          font-size: 12px;
          font-weight: 500;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .snapshot-btn:hover:not(:disabled) {
          background: var(--color-accent-dark);
        }

        .snapshot-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          padding: var(--space-sm);
          background: var(--color-error-light);
          color: var(--color-error);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-md);
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: var(--color-error);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .history-content {
          flex: 1;
          overflow-y: auto;
        }

        .loading, .no-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--color-text-muted);
          font-size: 14px;
          text-align: center;
          gap: var(--space-xs);
        }

        .no-history small {
          font-size: 12px;
        }

        .history-list {
          margin-bottom: var(--space-md);
        }

        .history-item {
          padding: var(--space-sm);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-xs);
          cursor: pointer;
          transition: background var(--transition-fast), border-color var(--transition-fast);
        }

        .history-item:hover {
          background: var(--color-surface-hover);
        }

        .history-item.selected {
          border-color: var(--color-accent);
          background: var(--color-surface-hover);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timestamp {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text);
        }

        .size {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .description {
          margin-top: var(--space-xs);
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .history-diff {
          border-top: 1px solid var(--color-border-light);
          padding-top: var(--space-md);
        }

        .diff-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }

        .diff-header h4 {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .restore-btn {
          padding: var(--space-xs) var(--space-sm);
          font-size: 12px;
          font-weight: 500;
          background: var(--color-success);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .restore-btn:hover:not(:disabled) {
          background: var(--color-success-dark);
        }

        .restore-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .diff-content {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          margin: 0;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          color: var(--color-text);
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 400px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}