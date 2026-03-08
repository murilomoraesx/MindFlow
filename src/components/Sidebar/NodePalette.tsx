import React from 'react';
import { NodeType } from '../../types';
import { cn } from '../../utils/cn';
import { Lightbulb, Filter, Folder, StickyNote, Image as ImageIcon } from 'lucide-react';

const PALETTE_ITEMS: { type: NodeType; label: string; hint: string; icon: React.ElementType; color: string }[] = [
  { type: 'idea', label: 'Ideia', hint: 'Ramo principal', icon: Lightbulb, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { type: 'funnel', label: 'Funil', hint: 'Métricas e etapas', icon: Filter, color: 'text-pink-500 bg-pink-500/10 border-pink-500/30' },
  { type: 'group', label: 'Grupo', hint: 'Agrupa nós por tema', icon: Folder, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { type: 'note', label: 'Nota', hint: 'Checklist e prioridade', icon: StickyNote, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { type: 'image', label: 'Imagem', hint: 'Frame, filtro e fonte', icon: ImageIcon, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
];

export const NodePalette = ({ collapsed = false }: { collapsed?: boolean }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={cn(
      "min-h-0 h-full self-stretch flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-6 dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-300",
      collapsed ? "w-16" : "w-[clamp(14rem,18vw,18rem)]"
    )}>
      <div>
        {!collapsed && <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Nós</h2>}
        <div className="flex flex-col gap-2">
          {PALETTE_ITEMS.map((item) => (
            <div
              key={item.type}
              className={cn(
                "flex cursor-grab items-center rounded-md border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700",
                collapsed ? "justify-center p-2" : "gap-3 p-2.5"
              )}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              title={item.label}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md border", item.color)}>
                <item.icon size={14} />
              </span>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.hint}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
