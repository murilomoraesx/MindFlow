import { CSSProperties, memo, useMemo } from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CheckSquare2, MessageSquare, Pin, Square, StickyNote } from 'lucide-react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';

type NoteVariant = 'glass' | 'sticky' | 'outline';
type NotePriority = 'low' | 'medium' | 'high';

const PRIORITY_META: Record<NotePriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-emerald-600 bg-emerald-500/12 border-emerald-500/30' },
  medium: { label: 'Média', color: 'text-amber-600 bg-amber-500/12 border-amber-500/30' },
  high: { label: 'Alta', color: 'text-rose-600 bg-rose-500/12 border-rose-500/30' },
};

export const NoteNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const { dropTargetId } = useFlowStore();

  const isDropTarget = id === dropTargetId;

  const label = String(data.label || 'Nova Nota');
  const description = String(data.description || '').trim();
  const noteColor = typeof data.color === 'string' && data.color.trim().length > 0 ? data.color : '#F59E0B';
  const variant = ((data.noteVariant as NoteVariant) || 'sticky') as NoteVariant;
  const priority = ((data.notePriority as NotePriority) || 'medium') as NotePriority;
  const isPinned = !!data.notePinned;
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;

  const checklistItems = useMemo(
    () =>
      String(data.noteChecklist || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const isDone = /^\[x\]\s*/i.test(line) || /^-\s*\[x\]\s*/i.test(line);
          return {
            isDone,
            text: line.replace(/^-\s*/g, '').replace(/^\[[x ]\]\s*/i, ''),
          };
        })
        .slice(0, 7),
    [data.noteChecklist],
  );

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
    glass: 'border backdrop-blur-sm',
    sticky: 'border backdrop-blur-sm',
    outline: 'border backdrop-blur-sm',
  };

  const variantStyle: CSSProperties = useMemo(() => {
    if (variant === 'glass') {
      return {
        borderColor: toAlpha(0.45),
        background: `radial-gradient(120% 140% at 10% 10%, ${toAlpha(0.32)}, rgba(255,255,255,0.45) 42%, ${toAlpha(0.12)} 74%)`,
        boxShadow: `0 16px 30px ${toAlpha(0.2)}`,
      };
    }
    if (variant === 'outline') {
      return {
        borderColor: toAlpha(0.62),
        background: `linear-gradient(165deg, ${toAlpha(0.16)}, ${toAlpha(0.08)})`,
        boxShadow: `inset 0 0 0 1px ${toAlpha(0.32)}`,
      };
    }
    return {
      borderColor: toAlpha(0.62),
      background: `linear-gradient(160deg, ${toAlpha(0.26)}, ${toAlpha(0.14)} 52%, ${toAlpha(0.08)} 100%)`,
      boxShadow: `0 14px 22px ${toAlpha(0.24)}`,
    };
  }, [variant, parsedColor]);

  return (
    <div
      className={cn(
        'relative min-w-[210px] max-w-[300px] rounded-lg px-4 pb-3 pt-3',
        'w-[220px]',
        variantClasses[variant],
        selected && 'ring-2 ring-violet-500/45',
        isDropTarget && 'ring-4 ring-blue-400/40',
      )}
      style={{
        ...variantStyle,
        transform: variant === 'sticky' ? 'rotate(-0.8deg)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} id="top" className="h-2.5 w-2.5 rounded-full border-none bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left" className="h-2.5 w-2.5 rounded-full border-none bg-slate-400" />

      <div
        className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-l border-b bg-white/35 [clip-path:polygon(100%_0,0_0,100%_100%)] dark:bg-white/10"
        style={{ borderColor: toAlpha(0.45) }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_23px,rgba(100,116,139,0.14)_24px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_23px,rgba(148,163,184,0.12)_24px)]" />

      <div className="relative z-10 mb-2 flex items-start justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">
          <StickyNote size={12} />
          Nota
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isPinned && (
            <span className="rounded-md border border-violet-500/30 bg-violet-500/10 p-1 text-violet-600 dark:text-violet-300" title="Nota fixada">
              <Pin size={11} />
            </span>
          )}
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PRIORITY_META[priority].color)}>
            {PRIORITY_META[priority].label}
          </span>
        </div>
      </div>

      <div className="relative z-10 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{label || 'Sem título'}</div>
      {description && (
        <p className="relative z-10 mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      )}

      {checklistItems.length > 0 && (
        <div className="relative z-10 mt-2 space-y-1 rounded-lg border border-slate-200/80 bg-white/60 p-2 dark:border-slate-700/70 dark:bg-slate-950/40">
          {checklistItems.map((item, index) => (
            <div key={`${item.text}-${index}`} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              {item.isDone ? <CheckSquare2 size={12} className="text-emerald-500" /> : <Square size={12} className="text-slate-400" />}
              <span className={cn(item.isDone && 'line-through opacity-70')}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {openComments > 0 && (
        <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
          <MessageSquare size={10} />
          {openComments}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" className="h-2.5 w-2.5 rounded-full border-none bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right" className="h-2.5 w-2.5 rounded-full border-none bg-slate-400" />
    </div>
  );
});
