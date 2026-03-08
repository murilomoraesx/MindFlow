import { CSSProperties, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { CheckCircle2, Circle, MessageSquare, Pin, Plus, StickyNote } from 'lucide-react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';

type NoteVariant = 'glass' | 'sticky' | 'outline';
type NotePriority = 'low' | 'medium' | 'high';
type NoteLayout = 'compact' | 'expanded';

const PRIORITY_META: Record<NotePriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/18' },
  medium: { label: 'Média', color: 'text-amber-700 bg-amber-500/10 border-amber-500/18' },
  high: { label: 'Alta', color: 'text-rose-700 bg-rose-500/10 border-rose-500/18' },
};

const HANDLE_CLASS =
  'h-3 w-3 rounded-full border border-white/70 bg-white/85 shadow-[0_2px_10px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-400/45 dark:bg-slate-900/72';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseChecklistItems = (rawChecklist: string) =>
  rawChecklist
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isDone = /^\[x\]\s*/i.test(line) || /^-\s*\[x\]\s*/i.test(line);
      return {
        isDone,
        text: line.replace(/^-\s*/g, '').replace(/^\[[x ]\]\s*/i, ''),
      };
    });

export const NoteNode = memo(({ id, data, selected, width, height }: NodeProps<MindFlowNode>) => {
  const { dropTargetId, setShowStylePanel, updateNodeData } = useFlowStore();
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isBodyEditing, setIsBodyEditing] = useState(false);
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
  const [draftTitle, setDraftTitle] = useState(String(data.label || 'Nova Nota'));
  const [draftDescription, setDraftDescription] = useState(String(data.description || ''));
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  const isDropTarget = id === dropTargetId;

  const label = String(data.label || 'Nova Nota');
  const description = String(data.description || '').trim();
  const noteColor = typeof data.color === 'string' && data.color.trim().length > 0 ? data.color : '#F59E0B';
  const variant = ((data.noteVariant as NoteVariant) || 'sticky') as NoteVariant;
  const priority = ((data.notePriority as NotePriority) || 'medium') as NotePriority;
  const layout = ((data.noteLayout as NoteLayout) || 'compact') as NoteLayout;
  const showDescription = data.noteShowDescription !== false;
  const showChecklist = data.noteShowChecklist !== false;
  const isPinned = !!data.notePinned;
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;
  const baseWidth = layout === 'expanded' ? 268 : 232;
  const baseHeight = layout === 'expanded' ? 176 : 132;
  const nodeWidth = clamp(Number(width || data.width || baseWidth), 220, 720);

  const checklistItems = useMemo(
    () => parseChecklistItems(String(data.noteChecklist || '')),
    [data.noteChecklist],
  );
  const rawChecklistItems = useMemo(
    () =>
      String(data.noteChecklist || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    [data.noteChecklist],
  );

  const approxCharsPerLine = Math.max(18, Math.floor((nodeWidth - 60) / 7.4));
  const descriptionLineCount = useMemo(() => {
    if (!showDescription || !description) return 0;
    return description.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / approxCharsPerLine)), 0);
  }, [approxCharsPerLine, description, showDescription]);
  const checklistLineCount = useMemo(() => {
    if (!showChecklist || checklistItems.length === 0) return 0;
    return checklistItems.reduce((total, item) => total + Math.max(1, Math.ceil(item.text.length / Math.max(14, approxCharsPerLine - 4))), 0);
  }, [approxCharsPerLine, checklistItems, showChecklist]);
  const shouldShowChecklistCard = showChecklist && (checklistItems.length > 0 || isAddingChecklistItem || selected);
  const autoHeight = Math.max(
    baseHeight,
    86 +
      (showDescription && description ? descriptionLineCount * 16 + 12 : 0) +
      (shouldShowChecklistCard ? Math.max(56, checklistLineCount * 22 + 52) : 0) +
      (layout === 'expanded' ? 24 : 0),
  );
  const nodeHeight = Math.max(clamp(Number(height || data.height || baseHeight), baseHeight, 960), autoHeight);

  const parsedColor = useMemo(() => {
    const normalized = noteColor.trim();
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
  }, [noteColor]);

  const toAlpha = (alpha: number) => {
    if (!parsedColor) return `rgba(245,158,11,${alpha})`;
    return `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${alpha})`;
  };

  const variantClasses: Record<NoteVariant, string> = {
    glass: 'border backdrop-blur-md',
    sticky: 'border backdrop-blur-sm',
    outline: 'border backdrop-blur-sm',
  };

  const variantStyle: CSSProperties = useMemo(() => {
    if (variant === 'glass') {
      return {
        borderColor: toAlpha(0.16),
        background: `linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58) 52%, ${toAlpha(0.1)} 100%)`,
        boxShadow: `0 18px 38px ${toAlpha(0.12)}`,
      };
    }
    if (variant === 'outline') {
      return {
        borderColor: toAlpha(0.3),
        background: 'rgba(255,255,255,0.52)',
        boxShadow: `inset 0 0 0 1px ${toAlpha(0.1)}`,
      };
    }
    return {
      borderColor: toAlpha(0.18),
      background: `linear-gradient(180deg, rgba(255,252,238,0.98), rgba(255,248,221,0.94) 64%, rgba(250,238,201,0.92) 100%)`,
      boxShadow: `0 14px 28px ${toAlpha(0.08)}`,
    };
  }, [variant, parsedColor]);

  useEffect(() => {
    if (!isTitleEditing) {
      setDraftTitle(String(data.label || 'Nova Nota'));
    }
  }, [data.label, isTitleEditing]);

  useEffect(() => {
    if (!isBodyEditing) {
      setDraftDescription(String(data.description || ''));
    }
  }, [data.description, isBodyEditing]);

  useEffect(() => {
    if (!isTitleEditing) return;
    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isTitleEditing]);

  useEffect(() => {
    if (!isBodyEditing) return;
    const frame = requestAnimationFrame(() => {
      descriptionInputRef.current?.focus();
      descriptionInputRef.current?.setSelectionRange(draftDescription.length, draftDescription.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [draftDescription.length, isBodyEditing]);

  useEffect(() => {
    if (!isAddingChecklistItem) return;
    const frame = requestAnimationFrame(() => {
      checklistInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isAddingChecklistItem]);

  const commitTitle = () => {
    const normalizedTitle = draftTitle.trim();
    updateNodeData(id, { label: normalizedTitle || 'Nova Nota' }, false);
    setIsTitleEditing(false);
  };

  const commitDescription = () => {
    updateNodeData(id, { description: draftDescription.trim() }, false);
    setIsBodyEditing(false);
  };

  const commitNewChecklistItem = () => {
    const normalizedItem = newChecklistItem.trim();
    if (!normalizedItem) {
      setIsAddingChecklistItem(false);
      setNewChecklistItem('');
      return;
    }

    updateNodeData(
      id,
      {
        noteChecklist: rawChecklistItems.concat(normalizedItem).join('\n'),
      },
      false,
    );
    setIsAddingChecklistItem(false);
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (index: number) => {
    const nextItems = parseChecklistItems(String(data.noteChecklist || '')).map((item, itemIndex) =>
      itemIndex === index ? { ...item, isDone: !item.isDone } : item,
    );

    updateNodeData(
      id,
      {
        noteChecklist: nextItems.map((item) => `${item.isDone ? '[x] ' : ''}${item.text}`).join('\n'),
      },
      false,
    );
  };

  return (
    <div
      className={cn(
        'relative overflow-visible transition-all duration-200',
        variantClasses[variant],
        selected && 'ring-2 ring-amber-400/30 ring-offset-2 ring-offset-transparent',
        isDropTarget && 'ring-4 ring-blue-400/40',
      )}
      style={{ width: nodeWidth, height: nodeHeight }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setShowStylePanel(true);
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={baseHeight}
        maxWidth={720}
        maxHeight={960}
        lineClassName="!border-amber-400/40"
        handleClassName="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-amber-500 dark:!border-slate-950"
        onResizeEnd={(_, params) => {
          updateNodeData(
            id,
            {
              width: Math.round(params.width),
              height: Math.round(params.height),
            },
            false,
          );
        }}
      />
      <div
        className="relative h-full overflow-hidden rounded-[22px] px-4 pb-3 pt-3.5"
        style={{
          ...variantStyle,
        }}
      >
      <Handle type="target" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left" className={HANDLE_CLASS} />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-white/10" />
      <div
        className="pointer-events-none absolute bottom-4 left-0 top-4 w-1.5 rounded-r-full"
        style={{ background: variant === 'outline' ? toAlpha(0.44) : toAlpha(0.7) }}
      />
      {variant === 'sticky' && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px] opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(148,163,184,0.16) 28px, transparent 29px)',
          }}
        />
      )}
      {variant === 'glass' && (
        <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
      )}
      {variant === 'outline' && (
        <div className="pointer-events-none absolute inset-[10px] rounded-[16px] border border-white/25 dark:border-white/6" />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/72 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-slate-900/38 dark:text-slate-300">
            <StickyNote size={11} />
            Nota
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {openComments > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/72 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-900/38 dark:text-slate-300">
              <MessageSquare size={10} />
              {openComments}
            </span>
          )}
          {isPinned && (
            <span className="rounded-full border border-slate-200/70 bg-white/72 p-1 text-slate-500 dark:border-white/10 dark:bg-slate-900/38 dark:text-slate-300" title="Nota em evidência">
              <Pin size={11} />
            </span>
          )}
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PRIORITY_META[priority].color)}>
            {PRIORITY_META[priority].label}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-1 break-words pr-1 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-50">
        {isTitleEditing ? (
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTitle();
              }
              if (event.key === 'Escape') {
                setDraftTitle(label || 'Nova Nota');
                setIsTitleEditing(false);
              }
            }}
            className="nodrag nopan w-full border-none bg-transparent px-0 py-0 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 outline-none dark:text-slate-50"
          />
        ) : (
          <button
            type="button"
            className="nodrag nopan w-full cursor-text break-words text-left"
            onDoubleClick={(event) => {
              event.stopPropagation();
              setIsTitleEditing(true);
            }}
          >
            {label || 'Nova Nota'}
          </button>
        )}
      </div>

      {showDescription && (
        <div className="relative z-10 mt-1.5">
          {isBodyEditing ? (
            <textarea
              ref={descriptionInputRef}
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              onBlur={commitDescription}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  commitDescription();
                }
                if (event.key === 'Escape') {
                  setDraftDescription(description);
                  setIsBodyEditing(false);
                }
              }}
              placeholder="Escreva sua nota aqui..."
              className="nodrag nopan min-h-[72px] w-full resize-none border-none bg-transparent px-0 py-0 text-xs leading-relaxed text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
            />
          ) : description ? (
            <button
              type="button"
              className="nodrag nopan w-full cursor-text whitespace-pre-wrap break-words text-left text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              onDoubleClick={(event) => {
                event.stopPropagation();
                setIsBodyEditing(true);
              }}
            >
              {description}
            </button>
          ) : (
            <button
              type="button"
              className="nodrag nopan w-full cursor-text rounded-xl border border-dashed border-slate-200/80 px-2.5 py-2 text-left text-[11px] text-slate-400 transition-colors hover:border-amber-300/60 hover:text-slate-500 dark:border-white/10 dark:text-slate-500 dark:hover:border-amber-400/30 dark:hover:text-slate-300"
              onDoubleClick={(event) => {
                event.stopPropagation();
                setIsBodyEditing(true);
              }}
            >
              Clique duas vezes para escrever um texto livre
            </button>
          )}
        </div>
      )}

      {shouldShowChecklistCard && (
        <div className="relative z-10 mt-3 space-y-1.5 rounded-2xl border border-slate-200/70 bg-white/72 p-2.5 dark:border-white/10 dark:bg-slate-950/34">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Checklist</div>
            <button
              type="button"
              className="nodrag nopan inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/78 px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:border-amber-300/70 hover:text-amber-600 dark:border-white/10 dark:bg-slate-900/48 dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
              onClick={(event) => {
                event.stopPropagation();
                setIsAddingChecklistItem(true);
              }}
            >
              <Plus size={11} />
              Novo item
            </button>
          </div>
          {checklistItems.map((item, index) => (
            <div key={`${item.text}-${index}`} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleChecklistItem(index);
                }}
                className="mt-0.5 shrink-0 rounded-full text-slate-300 transition-transform duration-150 hover:scale-110 dark:text-slate-500"
                aria-label={item.isDone ? 'Desmarcar item' : 'Concluir item'}
              >
                {item.isDone ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Circle size={15} />}
              </button>
              <span className={cn('leading-relaxed', item.isDone && 'text-emerald-700 line-through opacity-70 dark:text-emerald-300')}>
                {item.text}
              </span>
            </div>
          ))}
          {isAddingChecklistItem && (
            <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <Circle size={15} className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-500" />
              <input
                ref={checklistInputRef}
                value={newChecklistItem}
                onChange={(event) => setNewChecklistItem(event.target.value)}
                onBlur={commitNewChecklistItem}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitNewChecklistItem();
                  }
                  if (event.key === 'Escape') {
                    setIsAddingChecklistItem(false);
                    setNewChecklistItem('');
                  }
                }}
                placeholder="Digite o novo item"
                className="nodrag nopan w-full border-none bg-transparent px-0 py-0 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
              />
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={HANDLE_CLASS} />
      </div>
    </div>
  );
});
