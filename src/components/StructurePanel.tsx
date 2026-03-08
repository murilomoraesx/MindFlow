import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Filter, Folder, Image as ImageIcon, Lightbulb, Search, StickyNote } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import type { MindFlowNode, NodeType } from '../types';
import { isStructuralEdge } from '../utils/nodeLayout';

const TYPE_ICON: Record<NodeType, typeof Lightbulb> = {
  idea: Lightbulb,
  funnel: Filter,
  group: Folder,
  note: StickyNote,
  image: ImageIcon,
};

const TYPE_LABEL: Record<NodeType, string> = {
  idea: 'Ideia',
  funnel: 'Funil',
  group: 'Grupo',
  note: 'Nota',
  image: 'Imagem',
};

type TreeBranchProps = {
  node: MindFlowNode;
  allNodes: MindFlowNode[];
  childrenByParent: Map<string, MindFlowNode[]>;
  edgesBySource: Map<string, MindFlowNode[]>;
  level?: number;
  search: string;
  onSelect: (nodeId: string) => void;
};

const TreeBranch: FC<TreeBranchProps> = ({ node, allNodes, childrenByParent, edgesBySource, level = 0, search, onSelect }) => {
  const [open, setOpen] = useState(true);
  const Icon = TYPE_ICON[node.type];
  const structuralChildren = (edgesBySource.get(node.id) || []).concat(childrenByParent.get(node.id) || []);
  const uniqueChildren = structuralChildren.filter((child, index, list) => list.findIndex((candidate) => candidate.id === child.id) === index);
  const normalizedSearch = search.trim().toLowerCase();
  const nodeLabel = String(node.data.label || TYPE_LABEL[node.type]);
  const nodeDescription = String(node.data.description || '');

  const childMatches = uniqueChildren.some((child) => {
    const label = String(child.data.label || '').toLowerCase();
    const description = String(child.data.description || '').toLowerCase();
    return label.includes(normalizedSearch) || description.includes(normalizedSearch);
  });

  const matchesSearch =
    !normalizedSearch ||
    nodeLabel.toLowerCase().includes(normalizedSearch) ||
    nodeDescription.toLowerCase().includes(normalizedSearch) ||
    childMatches;

  if (!matchesSearch) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onSelect(node.id)}
        className="group flex items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        {uniqueChildren.length > 0 ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="inline-flex h-5 w-5" />
        )}
        <span
          className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          style={{ borderColor: node.data.color ? `${String(node.data.color)}55` : undefined, color: String(node.data.color || '#475569') }}
        >
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{nodeLabel || 'Sem título'}</span>
          <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">{TYPE_LABEL[node.type]}</span>
        </span>
      </button>
      {open &&
        uniqueChildren.map((child) => (
          <TreeBranch
            key={`${node.id}-${child.id}`}
            node={allNodes.find((candidate) => candidate.id === child.id) || child}
            allNodes={allNodes}
            childrenByParent={childrenByParent}
            edgesBySource={edgesBySource}
            level={level + 1}
            search={search}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
};

export const StructurePanel = () => {
  const { nodes, edges, focusNode, cleanMode } = useFlowStore();
  const [search, setSearch] = useState('');

  const visibleNodes = useMemo(() => nodes.filter((node) => !node.hidden), [nodes]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, MindFlowNode[]>();
    visibleNodes.forEach((node) => {
      if (!node.parentId) return;
      const current = map.get(node.parentId) || [];
      current.push(node);
      map.set(node.parentId, current);
    });
    return map;
  }, [visibleNodes]);

  const edgesBySource = useMemo(() => {
    const bySource = new Map<string, MindFlowNode[]>();
    edges
      .filter((edge) => isStructuralEdge(edge))
      .forEach((edge) => {
        const target = visibleNodes.find((node) => node.id === edge.target);
        if (!target) return;
        const current = bySource.get(edge.source) || [];
        current.push(target);
        bySource.set(edge.source, current);
      });
    return bySource;
  }, [edges, visibleNodes]);

  const incomingTargets = useMemo(() => new Set(edges.filter((edge) => isStructuralEdge(edge)).map((edge) => edge.target)), [edges]);
  const rootNodes = useMemo(
    () => visibleNodes.filter((node) => !incomingTargets.has(node.id) && !node.parentId),
    [incomingTargets, visibleNodes],
  );

  if (cleanMode) return null;

  return (
    <aside
      className="h-full w-[clamp(16rem,19vw,20rem)] flex-shrink-0 border-r border-slate-200 bg-white/82 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estrutura</div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/92">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar no mapa..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400">
          <span>{visibleNodes.length} nós visíveis</span>
          <span>{rootNodes.length} raízes</span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {rootNodes.length === 0 ? (
            <div className="px-3 py-6 text-xs text-slate-400">Nenhuma estrutura disponível neste mapa.</div>
          ) : (
            rootNodes.map((node) => (
              <TreeBranch
                key={node.id}
                node={node}
                allNodes={visibleNodes}
                childrenByParent={childrenByParent}
                edgesBySource={edgesBySource}
                search={search}
                onSelect={(nodeId) => focusNode(nodeId, 1.05)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
