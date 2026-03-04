import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export const IdeaNode = memo(({ data, selected }: NodeProps<MindFlowNode>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // In a real app, we'd update the store here
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'relative min-w-[120px] rounded-lg px-4 py-3 transition-all duration-200',
        'border bg-white dark:bg-slate-900',
        selected ? 'border-slate-800 dark:border-slate-200 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      )}
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
            autoFocus
            className="w-full bg-transparent text-center text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          />
        ) : (
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
        )}
        
        {data.description && (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{data.description}</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 bg-slate-400 border-none rounded-full" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 bg-slate-400 border-none rounded-full" />
    </motion.div>
  );
});
