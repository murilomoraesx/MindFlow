import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';
import { ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { getDefaultIdeaColorByDepth, IDEA_DESCENDANT_TEXT_COLOR } from '../../utils/nodeLayout';

export const IdeaNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(String(data.label || ''));
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleNodeCollapse, edges, nodes, updateNodeData, deleteElements, dropTargetId, theme } = useFlowStore();

  const isDropTarget = id === dropTargetId;

  // Calculate generic depth
  const getDepth = (nodeId: string): number => {
    let depth = 0;
    let currentId = nodeId;
    // Safety break to prevent infinite loops in generic cyclic graphs, though dagre is DAG
    let iterations = 0;
    while (currentId && iterations < 100) {
      const incomingEdge = edges.find(e => e.target === currentId);
      if (!incomingEdge) break;
      depth++;
      currentId = incomingEdge.source;
      iterations++;
    }
    return depth;
  };

  const depth = getDepth(id);
  const color = (data.color as string) || getDefaultIdeaColorByDepth(depth);
  const descendantTextColor = depth >= 2 && color === IDEA_DESCENDANT_TEXT_COLOR && theme === 'dark' ? '#f8fafc' : color;
  const label = String(data.label || '');
  const hasLabel = label.trim().length > 0;
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;

  useEffect(() => {
    if (data.isEditing && !isEditing) {
      setIsEditing(true);
    }
  }, [data.isEditing, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setDraftLabel(String(data.label || ''));
    }
  }, [isEditing, data.label]);

  useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isEditing]);

  // Calculate if this node has children and how many descendants are hidden
  const hasChildren = edges.some(e => e.source === id);
  const isCollapsed = !!data.isCollapsed;

  const countHiddenDescendants = () => {
    let count = 0;
    const currentDescendants = new Set<string>();

    const countRecursive = (parentId: string) => {
      const childrenIds = edges.filter(e => e.source === parentId).map(e => e.target);
      childrenIds.forEach(childId => {
        const childNode = nodes.find(n => n.id === childId);
        // Only count if it's not a funnel, and we haven't counted it yet
        if (childNode && childNode.type !== 'funnel' && !currentDescendants.has(childId)) {
          currentDescendants.add(childId);
          count++;
          countRecursive(childId);
        }
      });
    };

    countRecursive(id);
    return count;
  };

  const hiddenCount = isCollapsed ? countHiddenDescendants() : 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapse(id);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    updateNodeData(id, { isEditing: true }, true);
  };

  const commitEdit = () => {
    const normalizedLabel = draftLabel.trim();
    setIsEditing(false);

    if (!normalizedLabel) {
      const currentNode = nodes.find((node) => node.id === id);
      if (currentNode) {
        deleteElements([currentNode], []);
      } else {
        updateNodeData(id, { isEditing: false }, true);
      }
      return;
    }

    updateNodeData(id, { label: normalizedLabel, isEditing: false }, false);
  };

  let nodeStyles = "";
  let textStyles = "text-sm font-medium text-slate-900 dark:text-slate-100";
  let dynamicInlineStyles: React.CSSProperties = {};

  if (depth === 0) {
    // Level 1: Solid background, Bold text
    textStyles = "text-sm font-bold text-white";
    nodeStyles = "border-2 border-transparent font-bold";
    dynamicInlineStyles = {
      backgroundColor: color,
      boxShadow: selected ? `0 4px 20px -4px ${color}90` : `0 2px 10px -2px ${color}60`
    };
  } else if (depth === 1) {
    // Level 2: Hollow (white/dark bg), colored border
    textStyles = "text-sm font-medium text-slate-900 dark:text-slate-100";
    nodeStyles = "border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 scale-[0.98]";
    dynamicInlineStyles = {
      borderColor: selected ? color : undefined,
      boxShadow: selected ? `0 4px 20px -4px ${color}40` : undefined,
      borderLeftWidth: '4px',
      borderLeftColor: color
    };
  } else {
    // Level 3+: Text only, transparent bg, no border
    textStyles = "text-sm font-medium";
    nodeStyles = "bg-transparent scale-[0.95]";
    dynamicInlineStyles = {
      color: descendantTextColor
    };

    if (!hasLabel || isEditing) {
      nodeStyles += " rounded-md border border-dashed border-slate-300 dark:border-slate-600 min-h-[44px]";
    }
  }

  // Visual Drag State overrides
  if (isDropTarget) {
    nodeStyles += " ring-4 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 scale-105 z-40";
    dynamicInlineStyles.boxShadow = `0 0 30px ${color}80`;
    dynamicInlineStyles.borderColor = color;
    dynamicInlineStyles.borderWidth = depth === 0 ? undefined : '2px';
    (dynamicInlineStyles as Record<string, string>)['--tw-ring-color'] = color;
  }

  return (
    <div
      className={cn(
        'group relative min-w-[120px] rounded-lg px-4 py-3',
        nodeStyles
      )}
      style={dynamicInlineStyles}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} id="top" className="w-2 h-2 bg-slate-400 border-none rounded-full" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 bg-slate-400 border-none rounded-full" />

      <div className="flex flex-col items-center justify-center text-center">
        {data.badge && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white dark:bg-slate-200 dark:text-slate-900">
            {data.badge}
          </span>
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            className={cn("w-full bg-transparent text-center outline-none", textStyles)}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
              }
            }}
            style={depth >= 2 ? { color: descendantTextColor } : {}}
          />
        ) : (
          <div className={textStyles} style={depth >= 2 ? { color: descendantTextColor } : {}}>
            {hasLabel ? label : <span className="opacity-0">.</span>}
          </div>
        )}

        {data.status && (
          <div className={cn(
            "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2",
            depth === 0 ? "border-white/30" : "border-white dark:border-slate-900",
            data.status === 'active' && 'bg-emerald-500',
            data.status === 'pending' && 'bg-amber-500',
            data.status === 'completed' && 'bg-blue-500',
          )} title={data.status === 'active' ? 'Ativo' : data.status === 'pending' ? 'Pendente' : 'Concluído'} />
        )}

        {data.description && (
          <div className={cn("mt-1 text-xs", depth === 0 ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
            {data.description}
          </div>
        )}
      </div>

      {openComments > 0 && (
        <div className="pointer-events-none absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
          <MessageSquare size={10} />
          {openComments}
        </div>
      )}

      {hasChildren && (
        <button
          onClick={handleToggle}
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-transform hover:scale-110 nodrag z-10",
            depth === 0 ? "bg-white/20 border-white/30 text-white backdrop-blur-sm" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500",
            !isCollapsed && "opacity-0 group-hover:opacity-100" // Hide when expanded unless hovered
          )}
          style={depth > 0 ? { borderColor: selected ? color : undefined } : {}}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? (
            <div className="flex items-center">
              <span className={cn("text-[9px] font-bold mr-0.5", depth === 0 ? "text-white" : "text-slate-600 dark:text-slate-300")}>
                {hiddenCount}
              </span>
              <ChevronRight size={12} />
            </div>
          ) : (
            <ChevronLeft size={12} />
          )}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 bg-slate-400 border-none rounded-full" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 bg-slate-400 border-none rounded-full" />
    </div>
  );
});
