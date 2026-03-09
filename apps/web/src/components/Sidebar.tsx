import { useState, useEffect, useRef, useCallback } from 'react';
import type { FileNode } from '@umbra/shared-types';
import { TreeItem } from './TreeItem';
import { useFile } from '../context/FileContext';
import { importFiles } from '../services/fileService';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectFile } = useFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTreeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/tree');
      const result = await response.json();

      if (result.success) {
        setTreeData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load file tree');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreeData();
  }, [fetchTreeData]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];

    const importFilesArray = fileArray.map(file => ({
      name: file.name,
      content: '' as string, // will be filled asynchronously
      targetDir: '' // import to root
    }));

    // Read all file contents
    const readPromises = fileArray.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsText(file);
      });
    });

    try {
      const contents = await Promise.all(readPromises);
      const filesWithContent = importFilesArray.map((f, i) => ({
        name: f.name,
        content: contents[i],
        targetDir: ''
      }));

      const response = await importFiles(filesWithContent, 'keep_both');
      if (response.success) {
        fetchTreeData();
        // Optionally show success message with imported/skipped counts
        console.log('Import complete:', response.data);
      } else {
        alert(response.error);
      }
    } catch (err) {
      alert('Failed to import files');
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNewFile = async () => {
    const name = prompt('Enter file name (with .md or .txt extension):');
    if (!name) return;

    try {
      const response = await fetch('/api/v1/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name }),
      });
      const result = await response.json();
      if (result.success) {
        fetchTreeData();
        selectFile(result.data);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to create file');
    }
  };

  const handleNewFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      const response = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name }),
      });
      const result = await response.json();
      if (result.success) {
        fetchTreeData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to create folder');
    }
  };

  const handleRename = async (node: FileNode) => {
    const newName = prompt('Enter new name:', node.name);
    if (!newName || newName === node.name) return;

    try {
      const endpoint = node.isDirectory ? '/api/v1/folders/rename' : '/api/v1/files/rename';
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: node.path, newName }),
      });
      const result = await response.json();
      if (result.success) {
        fetchTreeData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to rename');
    }
  };

  const handleDelete = async (node: FileNode) => {
    if (!confirm(`Delete ${node.name}?`)) return;

    try {
      let endpoint: string;
      if (node.isDirectory) {
        endpoint = `/api/v1/folders?path=${encodeURIComponent(node.path)}`;
      } else {
        endpoint = `/api/v1/files?path=${encodeURIComponent(node.path)}`;
      }

      const response = await fetch(endpoint, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        fetchTreeData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  if (isCollapsed) {
    return (
      <aside className={`sidebar collapsed`}>
        <button
          className="collapse-btn expand-only"
          onClick={onToggle}
          aria-label="Expand sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <style>{`
          .sidebar.collapsed {
            width: var(--sidebar-collapsed-width);
            min-width: var(--sidebar-collapsed-width);
          }

          .expand-only {
            position: absolute;
            right: -32px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border-light);
            box-shadow: var(--shadow-sm);
          }
        `}</style>
      </aside>
    );
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span>Files</span>
        </div>
        <button
          className="collapse-btn"
          onClick={onToggle}
          aria-label="Collapse sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="action-btn" onClick={handleNewFile} title="New file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>New</span>
        </button>
        <button className="action-btn" onClick={handleNewFolder} title="New folder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <span>Folder</span>
        </button>
        <button className="action-btn" onClick={handleImportClick} title="Import files">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="sidebar-content">
        {isLoading ? (
          <div className="loading-message">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : treeData.length === 0 ? (
          <div className="tree-empty">
            <p>No documents yet</p>
          </div>
        ) : (
          <div className="file-tree">
            {treeData.map((node) => (
              <TreeItem 
                key={node.path} 
                node={node} 
                depth={0}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          height: 100%;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border-light);
          transition: width var(--transition-normal), min-width var(--transition-normal);
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
          min-width: var(--sidebar-collapsed-width);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .sidebar-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }

        .collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .collapse-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .sidebar-actions {
          display: flex;
          gap: var(--space-xs);
          padding: var(--space-sm);
          border-bottom: 1px solid var(--color-border-light);
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: var(--space-sm);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
          min-height: 36px;
        }

        .action-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-sm);
        }

        .file-tree {
          display: flex;
          flex-direction: column;
        }

        .tree-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-xl) var(--space-md);
          text-align: center;
          color: var(--color-text-muted);
          font-size: 14px;
        }

        .loading-message,
        .error-message {
          padding: var(--space-md);
          text-align: center;
          color: var(--color-text-muted);
          font-size: 14px;
        }

        .error-message {
          color: var(--color-danger);
        }

        @media (max-width: 768px) {
          .sidebar {
            position: absolute;
            left: 0;
            top: var(--topbar-height);
            bottom: 0;
            z-index: 100;
            box-shadow: var(--shadow-lg);
          }

          .sidebar.collapsed {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </aside>
  );
}
