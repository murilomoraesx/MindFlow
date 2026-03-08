import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { NodePalette } from './components/Sidebar/NodePalette';
import { StylePanel } from './components/Sidebar/StylePanel';
import { TopBar } from './components/Toolbar/TopBar';
import { ProjectList } from './components/ProjectList';
import { ShortcutsModal } from './components/ShortcutsModal';
import { CommandPalette } from './components/CommandPalette';
import { HistoryPanel } from './components/HistoryPanel';
import { StructurePanel } from './components/StructurePanel';
import { PresentationOutlinePanel } from './components/PresentationOutlinePanel';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { ReactFlowProvider } from '@xyflow/react';
import { useFlowStore } from './store/useFlowStore';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CURRENT_SCHEMA_VERSION, DEFAULT_MAP_SETTINGS } from './utils/mapSchema';
import { getMindflowSession } from './utils/auth';
import { persistMapData } from './utils/persistence';
import { apiGetMap, apiSaveMap } from './utils/serverApi';
import type { AuthUser } from './types';

const CURRENT_VIEW_STORAGE_KEY = 'mindflow_current_view';
const LAST_OPEN_MAP_STORAGE_KEY = 'mindflow_last_open_map_id';

export default function App() {
  const {
    theme,
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
    currentUser,
    setCurrentUser,
    loadMap,
    setCurrentView,
  } = useFlowStore();
  const [sessionState, setSessionState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const syncSession = async () => {
      const user = await getMindflowSession();
      if (!mounted) return;
      setCurrentUser(user);
      setSessionState(user ? 'authenticated' : 'unauthenticated');
    };
    void syncSession();
    return () => {
      mounted = false;
    };
  }, [setCurrentUser]);

  useEffect(() => {
    if (sessionState !== 'authenticated' || !currentUser || typeof window === 'undefined') return;

    const storedView = window.sessionStorage.getItem(CURRENT_VIEW_STORAGE_KEY);
    const lastOpenMapId = window.sessionStorage.getItem(LAST_OPEN_MAP_STORAGE_KEY);
    if (storedView !== 'editor' || !lastOpenMapId || mapId === lastOpenMapId) return;

    let cancelled = false;
    const restoreLastMap = async () => {
      try {
        const map = await apiGetMap(lastOpenMapId);
        if (cancelled) return;
        loadMap(map);
        setCurrentView('editor');
      } catch (error) {
        console.error('Falha ao restaurar o mapa aberto:', error);
        if (!cancelled) {
          window.sessionStorage.removeItem(LAST_OPEN_MAP_STORAGE_KEY);
          window.sessionStorage.setItem(CURRENT_VIEW_STORAGE_KEY, 'projects');
          setCurrentView('projects');
        }
      }
    };

    void restoreLastMap();
    return () => {
      cancelled = true;
    };
  }, [currentUser, loadMap, mapId, sessionState, setCurrentView]);

  // Auto-save functionality
  useEffect(() => {
    if (currentView === 'editor') {
      useFlowStore.getState().setSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        const run = async () => {
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
          try {
            await apiSaveMap(mapData);
            persistMapData(mapData);
            useFlowStore.getState().setSaveStatus('saved');
          } catch (error) {
            console.error('Falha ao salvar mapa remoto:', error);
            persistMapData(mapData, { forceBackup: true });
            useFlowStore.getState().setSaveStatus('unsaved');
          }
        };
        void run();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, mapName, mapId, mapProjectId, currentView, settings]);

  if (sessionState === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-[#061223] dark:text-slate-300">
        Verificando sessão...
      </div>
    );
  }

  if (sessionState === 'unauthenticated' || !currentUser) {
    return <LoginScreen onSuccess={(user: AuthUser) => {
      setCurrentUser(user);
      setSessionState('authenticated');
    }} />;
  }

  if (currentView === 'projects') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#061223] dark:text-slate-100 transition-colors duration-300 selection:bg-slate-200 dark:selection:bg-slate-800">
        <ProjectList />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#061223] dark:text-slate-100 transition-colors duration-300 selection:bg-slate-200 dark:selection:bg-slate-800">
        <AdminPanel />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 selection:bg-slate-200 dark:bg-[#061223] dark:text-slate-100 dark:selection:bg-slate-800"
    >
      <ReactFlowProvider>
        {!presentationMode && <TopBar />}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
                    className="flex h-full self-stretch"
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
                  className="flex h-full self-stretch"
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
                className="flex h-full self-stretch"
              >
                <StylePanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!presentationMode && <CommandPalette />}
        {!presentationMode && <HistoryPanel />}
        {!presentationMode && <PresentationOutlinePanel />}
      </ReactFlowProvider>
      <ShortcutsModal />
    </div>
  );
}
