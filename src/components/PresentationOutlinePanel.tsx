import { ListOrdered, MoveDown, MoveUp, MonitorPlay, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useFlowStore } from '../store/useFlowStore';
import {
  getPresentationPosition,
  getPresentationSequence,
  movePresentationNode,
  setNodePresentationIncluded,
  setNodePresentationAuto,
} from '../utils/presentation';

export const PresentationOutlinePanel = () => {
  const {
    nodes,
    showPresentationPanel,
    setShowPresentationPanel,
    focusNode,
    setNodes,
    updateNodeData,
    pushHistory,
    setSaveStatus,
    startPresentation,
  } = useFlowStore();

  const sequence = getPresentationSequence(nodes, { selectedPreference: false });
  const outsideSequence = nodes
    .filter((node) => !node.hidden && node.data.presentationIncluded === false)
    .sort((a, b) => {
      const orderA = typeof a.data.creationOrder === 'number' ? a.data.creationOrder : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.data.creationOrder === 'number' ? b.data.creationOrder : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

  const handleMove = (nodeId: string, direction: 'up' | 'down') => {
    pushHistory();
    setSaveStatus('unsaved');
    setNodes((currentNodes) => movePresentationNode(currentNodes, nodeId, direction));
  };

  const handleToggleIncluded = (nodeId: string, included: boolean) => {
    pushHistory();
    setSaveStatus('unsaved');
    setNodes((currentNodes) => setNodePresentationIncluded(currentNodes, nodeId, included));
  };

  const handleToggleAuto = (nodeId: string, automatic: boolean) => {
    pushHistory();
    setSaveStatus('unsaved');
    setNodes((currentNodes) => setNodePresentationAuto(currentNodes, nodeId, automatic));
  };

  const handleZoomPreset = (nodeId: string, zoom: number) => {
    updateNodeData(nodeId, { presentationZoom: zoom }, false);
  };

  return (
    <AnimatePresence>
      {showPresentationPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[55] flex justify-end bg-slate-950/18"
          onClick={() => setShowPresentationPanel(false)}
        >
          <motion.div
            initial={{ x: 28, opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700/70 dark:bg-slate-900/82 backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered size={16} className="text-violet-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Roteiro da apresentação</h2>
                  <div className="text-[11px] text-slate-400">Ordem prática para navegar e apresentar o mapa</div>
                </div>
              </div>
              <button
                onClick={() => setShowPresentationPanel(false)}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {sequence.length} etapa{sequence.length === 1 ? '' : 's'} incluída{sequence.length === 1 ? '' : 's'}
              </div>
              <button
                onClick={startPresentation}
                className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-violet-500"
              >
                <MonitorPlay size={12} />
                Apresentar
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Em apresentação</div>
              {sequence.map((node, index) => {
                const position = getPresentationPosition(nodes, node.id) || index + 1;
                const automatic = node.data.presentationAutoOrder !== false;
                const zoom = typeof node.data.presentationZoom === 'number' ? node.data.presentationZoom : 1.2;
                return (
                  <div
                    key={node.id}
                    className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition-colors hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => focusNode(node.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Etapa {position}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{String(node.data.label || 'Sem título')}</div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {automatic ? 'Automático por criação' : 'Manual no roteiro'}
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(node.id, 'up')}
                          className="rounded-md border border-slate-200 p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          title="Subir"
                        >
                          <MoveUp size={12} />
                        </button>
                        <button
                          onClick={() => handleMove(node.id, 'down')}
                          className="rounded-md border border-slate-200 p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          title="Descer"
                        >
                          <MoveDown size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAuto(node.id, !automatic)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          automatic
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {automatic ? 'Auto' : 'Manual'}
                      </button>
                      <button
                        onClick={() => handleToggleIncluded(node.id, false)}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Remover do roteiro
                      </button>
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Zoom</span>
                        <span className="text-[11px] font-semibold text-violet-500">{Math.round(zoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={220}
                        step={5}
                        value={Math.round(zoom * 100)}
                        onChange={(event) => updateNodeData(node.id, { presentationZoom: Number(event.target.value) / 100 }, true)}
                        onMouseUp={(event) =>
                          updateNodeData(node.id, { presentationZoom: Number((event.target as HTMLInputElement).value) / 100 }, false)
                        }
                        onTouchEnd={(event) =>
                          updateNodeData(node.id, { presentationZoom: Number((event.target as HTMLInputElement).value) / 100 }, false)
                        }
                        className="mb-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-500 dark:bg-slate-800"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { value: 1, label: '100%' },
                          { value: 1.2, label: '120%' },
                          { value: 1.45, label: '145%' },
                          { value: 1.75, label: '175%' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleZoomPreset(node.id, option.value)}
                            className={`rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors ${
                              Math.abs(zoom - option.value) < 0.001
                                ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {outsideSequence.length > 0 && (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Fora do roteiro</div>
                  <div className="space-y-2">
                    {outsideSequence.map((node) => (
                      <div
                        key={node.id}
                        className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <button onClick={() => focusNode(node.id)} className="min-w-0 flex-1 text-left">
                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {String(node.data.label || 'Sem título')}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">Ainda não incluído na apresentação</div>
                          </button>
                          <button
                            onClick={() => handleToggleIncluded(node.id, true)}
                            className="rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet-500"
                          >
                            Incluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sequence.length === 0 && outsideSequence.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
                  Nenhum nó incluído na apresentação.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
