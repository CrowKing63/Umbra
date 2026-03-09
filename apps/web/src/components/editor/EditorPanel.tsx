import { useEffect, useState } from 'react';
import { useFile } from '../../context/FileContext';
import { useDebounce } from '../../hooks/useDebounce';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from '../preview/MarkdownPreview';

type ViewMode = 'editor' | 'preview' | 'split';

export function EditorPanel() {
  const { editorState, updateContent, saveContent } = useFile();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving'>('saved');

  const debouncedSave = useDebounce(async () => {
    const success = await saveContent();
    setSaveStatus(success ? 'saved' : 'dirty');
  }, 1000);

  useEffect(() => {
    if (editorState.isDirty) {
      setSaveStatus('dirty');
    }
  }, [editorState.isDirty]);

  useEffect(() => {
    if (editorState.isSaving) {
      setSaveStatus('saving');
    }
  }, [editorState.isSaving]);

  const handleContentChange = (newContent: string) => {
    updateContent(newContent);
    debouncedSave();
  };

  const handleManualSave = async () => {
    const success = await saveContent();
    setSaveStatus(success ? 'saved' : 'dirty');
  };

  if (!editorState.content) {
    return (
      <div className="editor-panel">
        <div className="empty-state">
          <p>Select a file to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
          >
            Editor
          </button>
          <button
            className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
          <button
            className={`toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
        </div>

        <div className="editor-stats">
          <span className="word-count">{editorState.wordCount} words</span>
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'dirty' && '● Unsaved'}
            {saveStatus === 'saving' && '⟳ Saving...'}
          </span>
        </div>

        <button
          className="save-button"
          onClick={handleManualSave}
          disabled={!editorState.isDirty || editorState.isSaving}
        >
          {editorState.isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className={`editor-content ${viewMode}`}>
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className="editor-pane">
            <MarkdownEditor
              content={editorState.content}
              onChange={handleContentChange}
              editable={true}
            />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="preview-pane">
            <MarkdownPreview content={editorState.content} />
          </div>
        )}
      </div>

      <style>{`
        .editor-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border-light);
          background: var(--color-surface);
        }

        .view-toggle {
          display: flex;
          gap: var(--space-xs);
        }

        .toggle-btn {
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          background: var(--color-surface-hover);
        }

        .toggle-btn.active {
          background: var(--color-accent);
          color: white;
          border-color: var(--color-accent);
        }

        .editor-stats {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          font-size: 13px;
          color: var(--color-text-muted);
        }

        .word-count {
          font-family: var(--font-mono);
        }

        .save-status {
          font-weight: 500;
        }

        .save-status.saved {
          color: var(--color-success, #22c55e);
        }

        .save-status.dirty {
          color: var(--color-warning, #f59e0b);
        }

        .save-status.saving {
          color: var(--color-accent);
        }

        .save-button {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .editor-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .editor-content.editor {
          flex-direction: row;
        }

        .editor-content.preview {
          flex-direction: row;
        }

        .editor-content.split {
          flex-direction: row;
        }

        .editor-pane, .preview-pane {
          flex: 1;
          overflow: auto;
          min-width: 0;
        }

        .editor-pane {
          border-right: 1px solid var(--color-border-light);
        }

        .preview-pane {
          padding: var(--space-lg);
        }

        .editor-pane .markdown-editor {
          height: 100%;
        }

        .preview-pane .markdown-preview {
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.7;
        }

        .empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
