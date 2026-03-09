import { useState } from 'react';
import { Search } from './search/Search';
import { HistoryPanel } from './history/HistoryPanel';
import { PasswordSettings } from './PasswordSettings';
import { NetworkSettings } from './NetworkSettings';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function RightPanel({ isOpen, onToggle }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'history' | 'settings'>('search');

  return (
    <>
      <button 
        className={`panel-toggle ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
      
      {isOpen && (
        <aside className="right-panel">
          <div className="panel-header">
            <div className="panel-tabs">
              <button 
                className={`tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                Search
              </button>
              <button 
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
              <button 
                className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
            <button className="close-btn" onClick={onToggle} aria-label="Close panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          
          <div className="panel-content">
            {activeTab === 'search' && <Search />}
            
            {activeTab === 'history' && (
              <HistoryPanel />
            )}
            
          {activeTab === 'settings' && (
            <>
              <PasswordSettings />
              <NetworkSettings />
            </>
          )}
          </div>

          <style>{`
            .right-panel {
              display: flex;
              flex-direction: column;
              width: var(--panel-width, 320px);
              min-width: var(--panel-width, 320px);
              height: 100%;
              background: var(--color-surface);
              border-left: 1px solid var(--color-border-light);
              animation: slideIn 0.2s ease;
            }
            
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            
            .panel-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: var(--space-sm) var(--space-md);
              border-bottom: 1px solid var(--color-border-light);
            }
            
            .panel-tabs {
              display: flex;
              gap: var(--space-xs);
            }
            
            .tab {
              padding: var(--space-sm) var(--space-md);
              font-size: 13px;
              font-weight: 500;
              color: var(--color-text-muted);
              border-radius: var(--radius-sm);
              transition: background var(--transition-fast), color var(--transition-fast);
              min-height: 36px;
            }
            
            .tab:hover {
              background: var(--color-surface-hover);
              color: var(--color-text);
            }
            
            .tab.active {
              background: var(--color-bg-secondary);
              color: var(--color-text);
            }
            
            .close-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              border-radius: var(--radius-sm);
              color: var(--color-text-muted);
              transition: background var(--transition-fast), color var(--transition-fast);
            }
            
            .close-btn:hover {
              background: var(--color-surface-hover);
              color: var(--color-text);
            }
            
            .panel-content {
              flex: 1;
              overflow-y: auto;
              padding: var(--space-md);
            }
            
            .info-empty {
              padding: var(--space-lg);
              text-align: center;
              background: var(--color-bg-secondary);
              border-radius: var(--radius-md);
            }
            
            .info-empty p {
              color: var(--color-text-muted);
              font-size: 14px;
            }
          `}</style>
        </aside>
      )}
      
      <style>{`
        .panel-toggle {
          position: absolute;
          right: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          border: 1px solid var(--color-border-light);
          color: var(--color-text-secondary);
          transition: background var(--transition-fast), color var(--transition-fast);
          z-index: 10;
        }
        
        .panel-toggle:hover, .panel-toggle.active {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }
        
        .panel-toggle.active {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        
        @media (max-width: 1024px) {
          .panel-toggle {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
