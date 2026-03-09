import { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MainArea } from './MainArea';
import { RightPanel } from './RightPanel';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  return (
    <div className="layout">
      <TopBar 
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
      />
      <div className="layout-body">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="layout-main">
          <MainArea />
          <RightPanel 
            isOpen={rightPanelOpen} 
            onToggle={() => setRightPanelOpen(!rightPanelOpen)} 
          />
        </div>
      </div>

      <style>{`
        .layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        
        .layout-body {
          display: flex;
          flex: 1;
          min-height: 0;
          position: relative;
        }
        
        .layout-main {
          display: flex;
          flex: 1;
          min-width: 0;
          position: relative;
        }
        
        @media (max-width: 768px) {
          .layout-body {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
