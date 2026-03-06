import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { NodePalette } from './components/Sidebar/NodePalette';
import { StylePanel } from './components/Sidebar/StylePanel';
import { TopBar } from './components/Toolbar/TopBar';
import { ProjectList } from './components/ProjectList';
import { ShortcutsModal } from './components/ShortcutsModal';
import { CommandPalette } from './components/CommandPalette';
import { HistoryPanel } from './components/HistoryPanel';
import { StructurePanel } from './components/StructurePanel';
import { ReactFlowProvider } from '@xyflow/react';
import { useFlowStore } from './store/useFlowStore';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CURRENT_SCHEMA_VERSION, DEFAULT_MAP_SETTINGS } from './utils/mapSchema';

export default function App() {
  const {
    theme,
    canvasTheme,
    currentView,
    showStylePanel,
    presentationMode,
    sidebarCollapsed,
    structurePanelOpen,
    cleanMode,
    nodes,
    edges,
    mapName,
    mapId,
    mapProjectId,
    settings,
  } = useFlowStore();

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
      useFlowStore.getState().setSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        try {
          const mapData = {
            id: mapId,
            name: mapName,
            nodes,
            edges,
            lastEdited: Date.now(),
            schemaVersion: CURRENT_SCHEMA_VERSION,
            settings: settings || DEFAULT_MAP_SETTINGS,
            projectId: mapProjectId || undefined,
          };
          localStorage.setItem(`mindflow_${mapId}`, JSON.stringify(mapData));

          const recentMaps = JSON.parse(localStorage.getItem('mindflow_recent_maps') || '[]');
          const existingIndex = recentMaps.findIndex((m: any) => m.id === mapId);
          const mapMeta = { id: mapId, name: mapName, lastEdited: Date.now(), nodeCount: nodes.length, projectId: mapProjectId || undefined };

          if (existingIndex >= 0) {
            recentMaps[existingIndex] = mapMeta;
          } else {
            recentMaps.push(mapMeta);
          }

          localStorage.setItem('mindflow_recent_maps', JSON.stringify(recentMaps));
          useFlowStore.getState().setSaveStatus('saved');
        } catch (error) {
          console.error('Falha ao salvar mapa localmente:', error);
          useFlowStore.getState().setSaveStatus('unsaved');
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, mapName, mapId, mapProjectId, currentView, settings]);

  if (currentView === 'projects') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 selection:bg-slate-200 dark:selection:bg-slate-800">
        <ProjectList />
      </div>
    );
  }

  return (
    <div
      data-canvas-theme={canvasTheme}
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 selection:bg-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-slate-800"
    >
      <ReactFlowProvider>
        {!presentationMode && <TopBar />}
        <div className="flex flex-1 overflow-hidden relative">
          <AnimatePresence initial={false}>
            {!presentationMode && !cleanMode && (
              <>
                {structurePanelOpen && (
                  <motion.div
                    key="structure-panel"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -24, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <StructurePanel />
                  </motion.div>
                )}
                <motion.div
                  key="node-palette"
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="h-full"
                >
                  <NodePalette collapsed={sidebarCollapsed} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <FlowCanvas />
          <AnimatePresence initial={false}>
            {!presentationMode && showStylePanel && !cleanMode && (
              <motion.div
                key="style-panel"
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 24, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="h-full"
              >
                <StylePanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!presentationMode && <CommandPalette />}
        {!presentationMode && <HistoryPanel />}
      </ReactFlowProvider>
      <ShortcutsModal />
    </div>
  );
}
