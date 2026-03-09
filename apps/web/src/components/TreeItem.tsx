import { useState } from 'react';
import type { FileNode } from '@umbra/shared-types';
import { useFile } from '../context/FileContext';

interface TreeItemProps {
  node: FileNode;
  depth: number;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
}

export function TreeItem({ node, depth, onRename, onDelete }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const { selectFile } = useFile();
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      selectFile({
        path: node.path,
        content: '',
        modifiedAt: node.modifiedAt || '',
      });
    }
    setShowMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!node.isDirectory) {
      setShowMenu(!showMenu);
    }
  };

  const isSelected = !node.isDirectory && false; // will be determined by context

  return (
    <div className="tree-item-wrapper">
      <div
        className={`tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`tree-expand-icon ${isExpanded ? 'expanded' : ''}`}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
        {!node.isDirectory && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        )}
        <span className="tree-item-label">{node.name}</span>
        {!node.isDirectory && (
          <button 
            className="tree-menu-btn"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            title="Actions"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        )}
      </div>

      {!node.isDirectory && showMenu && (
        <div className="tree-context-menu" onClick={() => setShowMenu(false)}>
          <button onClick={() => onRename(node)}>Rename</button>
          <button onClick={() => onDelete(node)}>Delete</button>
        </div>
      )}

      {node.isDirectory && isExpanded && node.children && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeItem 
              key={child.path} 
              node={child} 
              depth={depth + 1}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <style>{`
        .tree-item-wrapper {
          position: relative;
          user-select: none;
        }

        .tree-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-sm);
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
          min-height: 44px;
          position: relative;
        }

        .tree-item:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .tree-item.selected {
          background: var(--color-accent);
          color: white;
        }

        .tree-item.selected:hover {
          background: var(--color-accent-hover);
          color: white;
        }

        .tree-expand-icon {
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }

        .tree-expand-icon.expanded {
          transform: rotate(0deg);
        }

        .tree-children {
          display: flex;
          flex-direction: column;
        }

        .tree-item-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tree-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast), background var(--transition-fast);
        }

        .tree-item:hover .tree-menu-btn {
          opacity: 1;
        }

        .tree-menu-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .tree-context-menu {
          position: absolute;
          right: 8px;
          top: 100%;
          z-index: 10;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md);
          min-width: 120px;
          overflow: hidden;
        }

        .tree-context-menu button {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          text-align: left;
          font-size: 13px;
          color: var(--color-text-secondary);
          transition: background var(--transition-fast);
        }

        .tree-context-menu button:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .tree-context-menu button:first-child {
          border-bottom: 1px solid var(--color-border-light);
        }
      `}</style>
    </div>
  );
}
