import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export const NoteNode = memo(({ data, selected }: NodeProps<MindFlowNode>) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: Math.random() * 6 - 3 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative min-w-[150px] max-w-[250px] p-4 shadow-xl transition-all duration-200',
        'bg-amber-200 text-amber-900',
        selected && 'ring-4 ring-amber-500/50'
      )}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
      }}
    >
      <div className="absolute bottom-0 right-0 h-5 w-5 bg-amber-300 shadow-[-2px_-2px_4px_rgba(0,0,0,0.1)]" />
      <div className="font-medium leading-relaxed" style={{ fontFamily: 'cursive' }}>
        {data.label}
      </div>
    </motion.div>
  );
});
