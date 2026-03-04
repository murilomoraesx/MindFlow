import React from 'react';
import { NodeType } from '../../types';
import { cn } from '../../utils/cn';
import { Lightbulb, Filter, Folder, StickyNote, Image as ImageIcon } from 'lucide-react';

const PALETTE_ITEMS: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'idea', label: 'Ideia', icon: Lightbulb, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { type: 'funnel', label: 'Funil', icon: Filter, color: 'text-pink-500 bg-pink-500/10 border-pink-500/30' },
  { type: 'group', label: 'Grupo', icon: Folder, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { type: 'note', label: 'Nota', icon: StickyNote, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { type: 'image', label: 'Imagem', icon: ImageIcon, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
];

export const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-60 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-6 dark:border-slate-800 dark:bg-slate-900/50 transition-colors duration-300">
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Nodes</h2>
        <div className="flex flex-col gap-2">
          {PALETTE_ITEMS.map((item) => (
            <div
              key={item.type}
              className="flex cursor-grab items-center gap-3 rounded-md border border-slate-200 bg-white p-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
            >
              <item.icon size={16} className="text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
