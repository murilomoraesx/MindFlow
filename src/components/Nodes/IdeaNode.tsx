import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';
import { ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { getDefaultIdeaColorByDepth, getNodeDepth, IDEA_DESCENDANT_TEXT_COLOR, isStructuralEdge } from '../../utils/nodeLayout';

const IDEA_HANDLE_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  borderColor: 'rgba(148, 163, 184, 0.58)',
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12), inset 0 0 0 1px rgba(255,255,255,0.42)',
  backdropFilter: 'blur(10px)',
};

export const IdeaNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(String(data.label || ''));
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleNodeCollapse, edges, nodes, updateNodeData, deleteElements, dropTargetId, theme } = useFlowStore();

  const isDropTarget = id === dropTargetId;

  const depth = getNodeDepth(id, edges);
  const color = (data.color as string) || getDefaultIdeaColorByDepth(depth);
  const parsedColor = useMemo(() => {
    const normalized = color.trim();
    const source = normalized.startsWith('#') ? normalized.slice(1) : normalized;
    const hex = source.length === 3 ? source.split('').map((char) => `${char}${char}`).join('') : source;
    if (hex.length !== 6) return null;
    const int = Number.parseInt(hex, 16);
    if (Number.isNaN(int)) return null;
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }, [color]);
  const toAlpha = (alpha: number) => {
    if (!parsedColor) return `rgba(139,92,246,${alpha})`;
    return `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${alpha})`;
  };
  const descendantTextColor = depth >= 2 && color === IDEA_DESCENDANT_TEXT_COLOR && theme === 'dark' ? '#f8fafc' : color;
  const label = String(data.label || '');
  const hasLabel = label.trim().length > 0;
  const isCompactIdea = !!data.isEditing && !hasLabel && !data.descendantFrame;
  const hasDescendantFrame = depth >= 2 && !!data.descendantFrame;
  const textBold = !!data.textBold;
  const textItalic = !!data.textItalic;
  const textUnderline = !!data.textUnderline;
  const textStrike = !!data.textStrike;
  const textDecoration = [textUnderline ? 'underline' : '', textStrike ? 'line-through' : ''].filter(Boolean).join(' ');
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
  const hasChildren = edges.some((edge) => isStructuralEdge(edge) && edge.source === id);
  const isCollapsed = !!data.isCollapsed;

  const countHiddenDescendants = () => {
    let count = 0;
    const currentDescendants = new Set<string>();

    const countRecursive = (parentId: string) => {
      const childrenIds = edges.filter((edge) => isStructuralEdge(edge) && edge.source === parentId).map((edge) => edge.target);
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
  const labelInlineStyles: React.CSSProperties = {
    fontWeight: textBold ? 700 : undefined,
    fontStyle: textItalic ? 'italic' : undefined,
    textDecoration,
  };

  if (depth === 0) {
    // Level 1: Gradient background with glass shimmer
    textStyles = "text-sm font-bold text-white";
    nodeStyles = "border border-white/20 font-bold backdrop-blur-sm";
    dynamicInlineStyles = {
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}bb 100%)`,
      boxShadow: selected
        ? `0 8px 32px -4px ${color}80, 0 0 0 2px ${color}40, inset 0 1px 0 rgb(255 255 255 / 0.18)`
        : `0 4px 18px -4px ${color}60, inset 0 1px 0 rgb(255 255 255 / 0.14)`,
    };
  } else if (depth === 1) {
    // Level 2: Hollow (white/dark bg), colored border
    textStyles = "text-sm font-medium text-slate-900 dark:text-slate-100";
    nodeStyles = "border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 scale-[0.98]";
    dynamicInlineStyles = {
      borderColor: selected ? color : toAlpha(theme === 'dark' ? 0.38 : 0.26),
      background: `linear-gradient(135deg, ${toAlpha(theme === 'dark' ? 0.16 : 0.12)} 0%, ${
        theme === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)'
      } 68%)`,
      boxShadow: selected ? `0 4px 20px -4px ${color}40` : `0 10px 24px -18px ${toAlpha(0.65)}`,
      borderLeftWidth: '4px',
      borderLeftColor: color,
    };
  } else {
    if (hasDescendantFrame) {
      textStyles = "text-[15px] font-medium";
      nodeStyles = "border border-slate-200 bg-white/90 shadow-none dark:border-slate-800 dark:bg-slate-900/88";
      dynamicInlineStyles = {
        color: descendantTextColor,
        background: `linear-gradient(135deg, ${toAlpha(theme === 'dark' ? 0.12 : 0.08)} 0%, ${
          theme === 'dark' ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)'
        } 72%)`,
        borderColor: toAlpha(theme === 'dark' ? 0.34 : 0.22),
        borderLeftWidth: '3px',
        borderLeftColor: color,
      };
    } else {
      // Level 3+: Text only, transparent bg, no border
      textStyles = "text-[15px] font-medium";
      nodeStyles = "bg-transparent scale-[0.95] rounded-none border-none shadow-none";
      dynamicInlineStyles = {
        color: descendantTextColor,
        textShadow: `0 0 0 ${toAlpha(0.001)}`,
        boxShadow: 'none',
        background: 'transparent',
      };
    }
  }

  if (depth >= 2 && selected) {
    if (hasDescendantFrame) {
      dynamicInlineStyles.boxShadow = `0 0 0 1.5px ${toAlpha(0.34)}, 0 12px 28px -18px ${toAlpha(0.38)}`;
    } else {
      nodeStyles += " rounded-full";
      dynamicInlineStyles.background = toAlpha(theme === 'dark' ? 0.18 : 0.12);
      dynamicInlineStyles.boxShadow = `0 0 0 1.5px ${toAlpha(0.28)}, 0 10px 24px -18px ${toAlpha(0.3)}`;
      dynamicInlineStyles.paddingLeft = '0.85rem';
      dynamicInlineStyles.paddingRight = '0.85rem';
      dynamicInlineStyles.paddingTop = '0.35rem';
      dynamicInlineStyles.paddingBottom = '0.35rem';
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
        depth >= 2
          ? hasDescendantFrame
            ? 'group relative min-w-[140px] max-w-[240px] rounded-lg px-3 py-2.5'
            : 'group relative min-w-[72px] max-w-[360px] px-4 py-1.5'
          : isCompactIdea
            ? 'group relative min-w-[132px] max-w-[160px] rounded-lg px-3 py-2'
            : 'group relative min-w-[120px] max-w-[280px] rounded-lg px-4 py-3',
        nodeStyles
      )}
      style={dynamicInlineStyles}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="h-3.5 w-3.5 rounded-full border opacity-90 transition-all duration-150 group-hover:scale-110 group-hover:opacity-100"
        style={IDEA_HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="pointer-events-none h-px w-px rounded-full border-0 opacity-0"
        style={{ background: 'transparent' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={cn("h-3.5 w-3.5 rounded-full border opacity-90 transition-all duration-150 group-hover:scale-110 group-hover:opacity-100", depth >= 2 ? "-left-3.5" : "-left-2")}
        style={IDEA_HANDLE_STYLE}
      />

      <div className={cn("flex w-full flex-col justify-center", depth >= 2 ? "items-start text-left" : "items-center text-center")}> 
        {data.badge && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white dark:bg-slate-200 dark:text-slate-900">
            {data.badge}
          </span>
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            className={cn(
              depth >= 2
                ? hasDescendantFrame
                  ? "w-full border-b border-dashed border-slate-300 bg-transparent px-0 py-0.5 text-left outline-none dark:border-slate-600"
                  : "min-w-[64px] border-b border-dashed border-slate-300 bg-transparent px-0 py-0.5 text-left outline-none dark:border-slate-600"
                : isCompactIdea
                  ? "w-full bg-transparent text-center outline-none"
                : "w-full bg-transparent text-center outline-none",
              textStyles,
            )}
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
            style={{
              ...labelInlineStyles,
              ...(depth >= 2 ? { color: descendantTextColor } : {}),
            }}
          />
        ) : (
          <div
            className={cn(textStyles, depth >= 2 ? 'w-full break-words text-left' : 'w-full break-words')}
            style={{
              ...labelInlineStyles,
              ...(depth >= 2 ? { color: descendantTextColor } : {}),
            }}
          >
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
          <div
            className={cn(
              "mt-1 w-full whitespace-pre-wrap break-words text-xs leading-relaxed",
              depth === 0 ? "text-white/80" : "text-slate-500 dark:text-slate-400",
            )}
          >
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

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="h-3.5 w-3.5 rounded-full border opacity-90 transition-all duration-150 group-hover:scale-110 group-hover:opacity-100"
        style={IDEA_HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="pointer-events-none h-px w-px rounded-full border-0 opacity-0"
        style={{ background: 'transparent' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn("h-3.5 w-3.5 rounded-full border opacity-90 transition-all duration-150 group-hover:scale-110 group-hover:opacity-100", depth >= 2 ? "-right-3.5" : "-right-2")}
        style={IDEA_HANDLE_STYLE}
      />
    </div>
  );
});
