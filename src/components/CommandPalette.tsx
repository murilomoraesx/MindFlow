import { ReactElement, useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Command, LayoutTemplate, Map, MonitorPlay, PanelRight, Search, Unlink2, WandSparkles, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatePresence, motion } from 'motion/react';
import { useFlowStore } from '../store/useFlowStore';
import { MindFlowNode } from '../types';
import { getNextRootIdeaColor, resolveNodeCollision } from '../utils/nodeLayout';

type CommandAction = {
  id: string;
  label: string;
  keywords: string;
  icon: ReactElement;
  run: () => void;
};

export const CommandPalette = () => {
  const {
    showCommandPalette,
    setShowCommandPalette,
    nodes,
    edges,
    addNode,
    setNodes,
    autoLayout,
    autoLayoutSubtree,
    selectionModeEnabled,
    setSelectionModeEnabled,
    showMinimap,
    setShowMinimap,
    showStylePanel,
    setShowStylePanel,
    cleanMode,
    setCleanMode,
    focusModeEnabled,
    setFocusModeEnabled,
    structurePanelOpen,
    setStructurePanelOpen,
    startPresentation,
    focusNode,
  } = useFlowStore();
  const { screenToFlowPosition } = useReactFlow();
  const [query, setQuery] = useState('');

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const actions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'new-root-idea',
        label: 'Criar nova ideia mãe',
        keywords: 'nova ideia mae root create',
        icon: <WandSparkles size={14} />,
        run: () => {
          const flowCenter = screenToFlowPosition({
            x: window.innerWidth * 0.56,
            y: window.innerHeight * 0.5,
          });
          const position = resolveNodeCollision({
            basePosition: flowCenter,
            nodeType: 'idea',
            nodes: nodes as MindFlowNode[],
          });
          const newId = uuidv4();
          addNode({
            id: newId,
            type: 'idea',
            position,
            selected: true,
            data: {
              label: '',
              color: getNextRootIdeaColor(nodes as MindFlowNode[], edges),
              isEditing: true,
            },
          });
          setNodes((current) => current.map((node) => ({ ...node, selected: node.id === newId }) as MindFlowNode));
        },
      },
      {
        id: 'layout-all',
        label: 'Reorganizar mapa completo',
        keywords: 'layout organizar mapa auto',
        icon: <LayoutTemplate size={14} />,
        run: () => autoLayout({ recordHistory: true, fitView: true }),
      },
      {
        id: 'layout-subtree',
        label: 'Reorganizar subárvore do nó selecionado',
        keywords: 'layout subtree subarvore ramo selecionado',
        icon: <LayoutTemplate size={14} />,
        run: () => {
          if (!selectedNode) return;
          autoLayoutSubtree(selectedNode.id);
        },
      },
      {
        id: 'toggle-minimap',
        label: showMinimap ? 'Ocultar minimapa' : 'Mostrar minimapa',
        keywords: 'minimap mapa visualizacao',
        icon: <Map size={14} />,
        run: () => setShowMinimap(!showMinimap),
      },
      {
        id: 'toggle-properties',
        label: showStylePanel ? 'Ocultar painel de propriedades' : 'Mostrar painel de propriedades',
        keywords: 'painel propriedades style sidebar',
        icon: <PanelRight size={14} />,
        run: () => setShowStylePanel(!showStylePanel),
      },
      {
        id: 'toggle-selection-mode',
        label: selectionModeEnabled ? 'Desativar seleção por área' : 'Ativar seleção por área',
        keywords: 'selecao area multipla',
        icon: <Search size={14} />,
        run: () => setSelectionModeEnabled(!selectionModeEnabled),
      },
      {
        id: 'toggle-focus-mode',
        label: focusModeEnabled ? 'Desativar modo foco' : 'Ativar modo foco',
        keywords: 'foco ramo destaque contexto',
        icon: <Search size={14} />,
        run: () => setFocusModeEnabled(!focusModeEnabled),
      },
      {
        id: 'toggle-clean-mode',
        label: cleanMode ? 'Desativar modo clean' : 'Ativar modo clean',
        keywords: 'clean imersivo sem paineis',
        icon: <PanelRight size={14} />,
        run: () => setCleanMode(!cleanMode),
      },
      {
        id: 'toggle-structure-panel',
        label: structurePanelOpen ? 'Ocultar painel de estrutura' : 'Mostrar painel de estrutura',
        keywords: 'estrutura arvore outline sidebar',
        icon: <PanelRight size={14} />,
        run: () => setStructurePanelOpen(!structurePanelOpen),
      },
      {
        id: 'disconnect-selected',
        label: 'Desconectar nós selecionados',
        keywords: 'desconectar conexao unlink',
        icon: <Unlink2 size={14} />,
        run: () => {
          const selectedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
          if (selectedIds.size === 0) return;
          const store = useFlowStore.getState();
          store.pushHistory();
          store.setSaveStatus('unsaved');
          store.setEdges((currentEdges) => currentEdges.filter((edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target)));
        },
      },
      {
        id: 'start-presentation',
        label: 'Iniciar apresentação',
        keywords: 'apresentar roteiro',
        icon: <MonitorPlay size={14} />,
        run: () => startPresentation(),
      },
    ],
    [
      addNode,
      autoLayout,
      autoLayoutSubtree,
      edges,
      nodes,
      screenToFlowPosition,
      selectedNode,
      selectionModeEnabled,
      cleanMode,
      focusModeEnabled,
      setNodes,
      setCleanMode,
      setFocusModeEnabled,
      setSelectionModeEnabled,
      setShowMinimap,
      setShowStylePanel,
      setStructurePanelOpen,
      showMinimap,
      showStylePanel,
      structurePanelOpen,
      startPresentation,
    ],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return actions;
    return actions.filter((action) => `${action.label} ${action.keywords}`.toLowerCase().includes(normalizedQuery));
  }, [actions, normalizedQuery]);

  const filteredNodes = useMemo(() => {
    if (!normalizedQuery) return nodes.slice(0, 8);
    return nodes
      .filter((node) => {
        const label = String(node.data.label || '').toLowerCase();
        const description = String(node.data.description || '').toLowerCase();
        const comments = Array.isArray(node.data.comments)
          ? node.data.comments.map((comment) => String((comment as { text?: string }).text || '')).join(' ').toLowerCase()
          : '';
        return label.includes(normalizedQuery) || description.includes(normalizedQuery) || comments.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [nodes, normalizedQuery]);

  useEffect(() => {
    if (!showCommandPalette) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setShowCommandPalette, showCommandPalette]);

  useEffect(() => {
    if (!showCommandPalette) {
      setQuery('');
    }
  }, [showCommandPalette]);

  const runAction = (action: CommandAction) => {
    action.run();
    setShowCommandPalette(false);
  };

  return (
    <AnimatePresence>
      {showCommandPalette && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/45 px-4 pt-20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <Command size={16} className="text-violet-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nós ou executar ações..."
                className="h-9 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <button
                onClick={() => setShowCommandPalette(false)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid max-h-[68vh] grid-cols-2 divide-x divide-slate-200 overflow-y-auto dark:divide-slate-700">
              <div className="p-2">
                <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Ações</div>
                <div className="space-y-1">
                  {filteredActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => runAction(action)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span className="text-slate-400">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                  {filteredActions.length === 0 && <div className="px-2 py-2 text-xs text-slate-400">Nenhuma ação encontrada.</div>}
                </div>
              </div>
              <div className="p-2">
                <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Nós</div>
                <div className="space-y-1">
                  {filteredNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => {
                        focusNode(node.id);
                        setShowCommandPalette(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span className="truncate">{String(node.data.label || 'Sem título')}</span>
                      <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {node.type}
                      </span>
                    </button>
                  ))}
                  {filteredNodes.length === 0 && <div className="px-2 py-2 text-xs text-slate-400">Nenhum nó encontrado.</div>}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
