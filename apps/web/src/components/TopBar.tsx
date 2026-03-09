import { useTheme } from '../context/ThemeContext';
import { useFile } from '../context/FileContext';
import { useAuth } from '../context/AuthContext';
import { exportFile } from '../services/fileService';
import { useState } from 'react';
import type { ExportFormat } from '@umbra/shared-types';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

interface TopBarProps {
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

export function TopBar({ rightPanelOpen, onToggleRightPanel }: TopBarProps = {}) {
  const { theme, toggleTheme } = useTheme();
  const { selectedFile, editorState } = useFile();
  const { isAuthenticated, logout } = useAuth();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleSearchClick = () => {
    if (onToggleRightPanel) {
      onToggleRightPanel();
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!selectedFile) {
      alert('No file selected');
      return;
    }

    const fileName = selectedFile.path.split('/').pop() || selectedFile.path;

    try {
      const response = await exportFile(selectedFile.path, format);
      if (response.success && response.data) {
        const { content, format: fmt } = response.data;

        if (fmt === 'txt') {
          // Download as text file
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName + '.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // html or pdf: render markdown to HTML and open in new window
          const html = await renderMarkdownToHtml(content);
          const printStyles = `
            <style>
              body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
              h1, h2, h3 { margin-top: 1.5rem; }
              code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
              pre { background: #f4f4f4; padding: 1em; overflow-x: auto; border-radius: 5px; }
              blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 0.5rem; }
              img { max-width: 100%; }
              @media print {
                body { margin: 0; }
              }
            </style>
          `;
          const doc = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>${fileName}</title>
                ${printStyles}
              </head>
              <body>
                ${html}
                <script>
                  window.onload = function() {
                    ${fmt === 'pdf' ? 'window.print();' : ''}
                  };
                </script>
              </body>
            </html>
          `;
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(doc);
            newWindow.document.close();
          } else {
            alert('Failed to open export window. Please check popup blocker.');
          }
        }
      } else {
        alert(response.error || 'Export failed');
      }
    } catch (err) {
      alert('Export error');
    } finally {
      setShowExportMenu(false);
    }
  };

  const renderMarkdownToHtml = async (markdown: string): Promise<string> => {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(rehypeRaw)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(markdown);

    return String(result);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="app-info">
          <span className="app-name">Umbra</span>
          {selectedFile && (
            <div className="file-info">
              <span className="file-name">{selectedFile.path}</span>
              <span className={`save-status-indicator ${editorState.isDirty ? 'dirty' : editorState.isSaving ? 'saving' : 'saved'}`}>
                {editorState.isSaving ? 'Saving...' : editorState.isDirty ? '● Unsaved' : '✓ Saved'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="topbar-center">
        <div 
          className={`search-box ${rightPanelOpen ? 'active' : ''}`}
          onClick={handleSearchClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input 
            type="text" 
            placeholder="Search documents..." 
            readOnly 
          />
          <kbd>⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {isAuthenticated && (
          <button 
            className="logout-btn"
            onClick={logout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
        
        {selectedFile && (
          <div className="export-dropdown-container">
            <button
              className="export-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-label="Export file"
              title="Export"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleExport('txt')}>Text (.txt)</button>
                <button onClick={() => handleExport('html')}>HTML (.html)</button>
                <button onClick={() => handleExport('pdf')}>PDF (.pdf)</button>
              </div>
            )}
          </div>
        )}
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <button className="icon-btn" aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <style>{`
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--topbar-height);
          padding: 0 var(--space-md);
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
          gap: var(--space-md);
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          min-width: 160px;
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        .app-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .app-name {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 12px;
        }

        .file-name {
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .save-status-indicator {
          font-size: 11px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .save-status-indicator.saved {
          color: var(--color-success, #22c55e);
        }

        .save-status-indicator.dirty {
          color: var(--color-warning, #f59e0b);
        }

        .save-status-indicator.saving {
          color: var(--color-accent);
        }

        .topbar-center {
          flex: 1;
          max-width: 480px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          cursor: pointer;
        }

        .search-box:hover {
          border-color: var(--color-accent);
        }

        .search-box svg {
          color: var(--color-text-muted);
          flex-shrink: 0;
        }

        .search-box input {
          flex: 1;
          min-width: 0;
          color: var(--color-text);
          font-size: 14px;
          background: transparent;
          border: none;
          outline: none;
          cursor: pointer;
        }

        .search-box input::placeholder {
          color: var(--color-text-muted);
        }

        .search-box kbd {
          padding: 2px 6px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--color-text-muted);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .export-dropdown-container {
          position: relative;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
          height: 36px;
        }

        .export-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: var(--space-xs);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          min-width: 160px;
          z-index: 100;
          overflow: hidden;
        }

        .export-menu button {
          display: block;
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: none;
          color: var(--color-text);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .export-menu button:hover {
          background: var(--color-surface-hover);
        }

        .export-menu button:first-child {
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .export-menu button:last-child {
          border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .theme-toggle, .icon-btn, .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: background var(--transition-fast), color var(--transition-fast);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .theme-toggle:hover, .icon-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        @media (max-width: 640px) {
          .topbar-center {
            display: none;
          }

          .app-name {
            display: none;
          }

          .file-name {
            max-width: 120px;
          }
        }
      `}</style>
    </header>
  );
}
