import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { NodePalette } from './components/Sidebar/NodePalette';
import { StylePanel } from './components/Sidebar/StylePanel';
import { TopBar } from './components/Toolbar/TopBar';
import { ProjectList } from './components/ProjectList';
import { ReactFlowProvider } from '@xyflow/react';
import { useFlowStore } from './store/useFlowStore';
import { useEffect } from 'react';

export default function App() {
  const { theme, currentView, showStylePanel, nodes, edges, mapName, mapId } = useFlowStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-save functionality
  useEffect(() => {
    if (currentView === 'editor') {
      const timeoutId = setTimeout(() => {
        const mapData = { id: mapId, name: mapName, nodes, edges, lastEdited: Date.now() };
        localStorage.setItem(`mindflow_${mapId}`, JSON.stringify(mapData));

        const recentMaps = JSON.parse(localStorage.getItem('mindflow_recent_maps') || '[]');
        const existingIndex = recentMaps.findIndex((m: any) => m.id === mapId);
        const mapMeta = { id: mapId, name: mapName, lastEdited: Date.now(), nodeCount: nodes.length };
        
        if (existingIndex >= 0) {
          recentMaps[existingIndex] = mapMeta;
        } else {
          recentMaps.push(mapMeta);
        }
        
        localStorage.setItem('mindflow_recent_maps', JSON.stringify(recentMaps));
      }, 500); // Debounce save by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, mapName, mapId, currentView]);

  if (currentView === 'projects') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 selection:bg-slate-200 dark:selection:bg-slate-800">
        <ProjectList />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 selection:bg-slate-200 dark:selection:bg-slate-800">
      <ReactFlowProvider>
        <TopBar />
        <div className="flex flex-1 overflow-hidden relative">
          <NodePalette />
          <FlowCanvas />
          {showStylePanel && <StylePanel />}
        </div>
      </ReactFlowProvider>
    </div>
  );
}

