import { MouseEvent, memo } from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { Focus, Layers3, Minimize2, PackagePlus, Sparkles, Trash2, Unlink2 } from 'lucide-react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';
import { captureNodesIntoGroup, fitGroupToChildren, releaseGroupChildren } from '../../utils/grouping';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const GroupNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const { nodes, setNodes, deleteElements, pushHistory, setSaveStatus, setShowStylePanel } = useFlowStore();

  const width = clamp(Number(data.groupWidth || 420), 260, 1800);
  const height = clamp(Number(data.groupHeight || 280), 180, 1400);
  const label = String(data.label || 'Grupo');
  const description = String(data.description || '');
  const variant = (data.groupVariant as 'glass' | 'solid' | 'outline') || 'glass';
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;

  const childNodes = nodes.filter((node) => node.parentId === id && !node.hidden);
  const selectedChildCount = childNodes.filter((node) => node.selected).length;
  const selectableNodes = nodes.filter((node) => node.selected && node.id !== id && node.type !== 'group');

  const variantClasses: Record<typeof variant, string> = {
    glass:
      'border-cyan-300/55 bg-[linear-gradient(160deg,rgba(224,242,254,0.66),rgba(255,255,255,0.48))] shadow-[0_14px_34px_rgba(14,165,233,0.18)] dark:border-cyan-500/40 dark:bg-[linear-gradient(160deg,rgba(8,47,73,0.45),rgba(15,23,42,0.38))]',
    solid:
      'border-teal-300/50 bg-[linear-gradient(170deg,#ecfeff,#d1fae5)] shadow-[0_14px_30px_rgba(20,184,166,0.18)] dark:border-teal-500/35 dark:bg-[linear-gradient(170deg,rgba(15,118,110,0.24),rgba(6,78,59,0.24))]',
    outline: 'border-2 border-dashed border-indigo-300/65 bg-white/70 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.24)] dark:border-indigo-500/45 dark:bg-slate-900/35',
  };

  const applyMutation = (nextNodes: MindFlowNode[], changed: boolean) => {
    if (!changed) return;
    pushHistory();
    setSaveStatus('unsaved');
    setNodes(nextNodes);
  };

  const handleSelectChildren = (event: MouseEvent) => {
    event.stopPropagation();
    setNodes((current) =>
      current.map((node) => {
        if (node.id === id) return { ...node, selected: true } as MindFlowNode;
        if (node.parentId === id) return { ...node, selected: true } as MindFlowNode;
        return { ...node, selected: false } as MindFlowNode;
      }),
    );
  };

  const handleCaptureSelection = (event: MouseEvent) => {
    event.stopPropagation();
    const result = captureNodesIntoGroup({
      nodes,
      groupId: id,
      nodeIds: selectableNodes.map((node) => node.id),
    });
    applyMutation(result.nodes, result.changed);
  };

  const handleFitContent = (event: MouseEvent) => {
    event.stopPropagation();
    const result = fitGroupToChildren({ nodes, groupId: id });
    applyMutation(result.nodes, result.changed);
  };

  const handleReleaseChildren = (event: MouseEvent) => {
    event.stopPropagation();
    const result = releaseGroupChildren({ nodes, groupId: id });
    applyMutation(result.nodes, result.changed);
  };

  const handleDeleteGroup = (event: MouseEvent) => {
    event.stopPropagation();
    const currentGroup = nodes.find((node) => node.id === id);
    if (!currentGroup) return;
    deleteElements([currentGroup], []);
  };

  return (
    <div
      className={cn(
        'group relative overflow-visible rounded-2xl border backdrop-blur-sm',
        variantClasses[variant],
        selected && 'ring-2 ring-sky-500/45',
      )}
      style={{ width, height, minWidth: width, minHeight: height }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setShowStylePanel(true);
      }}
    >
      <Handle type="target" position={Position.Left} id="left" className="h-3 w-3 rounded-full border-none bg-sky-500" />
      <Handle type="source" position={Position.Right} id="right" className="h-3 w-3 rounded-full border-none bg-sky-500" />

      <div className="flex h-14 items-center justify-between border-b border-slate-200/70 px-3 dark:border-slate-700/60">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-100">{label}</div>
          <div className="truncate text-[11px] text-slate-500 dark:text-slate-300">
            {childNodes.length} itens no grupo{description ? ` • ${description}` : ''}
          </div>
        </div>
        <div className="ml-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300">
          <Layers3 size={11} />
          {selectedChildCount > 0 ? `${selectedChildCount} sel.` : 'Frame'}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-14 rounded-b-2xl border-t border-dashed border-slate-300/50 p-4 dark:border-slate-700/60">
        {childNodes.length === 0 && (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-500 dark:text-slate-400">
            Arraste nós para dentro do grupo ou use "capturar seleção"
          </div>
        )}
      </div>

      {openComments > 0 && (
        <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
          <Sparkles size={10} />
          {openComments}
        </div>
      )}

      <div className="absolute left-2 right-2 bottom-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleSelectChildren}
          className="nodrag rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Selecionar nós do grupo"
        >
          <span className="inline-flex items-center gap-1">
            <Focus size={11} />
            Selecionar
          </span>
        </button>
        <button
          onClick={handleCaptureSelection}
          className="nodrag rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/45"
          title="Mover seleção atual para dentro do grupo"
        >
          <span className="inline-flex items-center gap-1">
            <PackagePlus size={11} />
            Capturar
          </span>
        </button>
        <button
          onClick={handleFitContent}
          className="nodrag rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Ajustar o tamanho do grupo ao conteúdo"
        >
          <span className="inline-flex items-center gap-1">
            <Minimize2 size={11} />
            Autoajustar
          </span>
        </button>
        <button
          onClick={handleReleaseChildren}
          className="nodrag rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/35"
          title="Remover todos os itens do grupo"
        >
          <span className="inline-flex items-center gap-1">
            <Unlink2 size={11} />
            Soltar
          </span>
        </button>
        <button
          onClick={handleDeleteGroup}
          className="nodrag col-span-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/35"
          title="Excluir grupo e todo o conteúdo dele"
        >
          <span className="inline-flex items-center gap-1">
            <Trash2 size={11} />
            Excluir grupo
          </span>
        </button>
      </div>
    </div>
  );
});
