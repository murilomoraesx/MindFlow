import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export const FunnelNode = memo(({ data, selected }: NodeProps<MindFlowNode>) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative flex min-w-[180px] flex-col items-center justify-center rounded-xl p-4 shadow-lg backdrop-blur-md transition-all duration-200',
        'border-2 border-pink-500/30 bg-[#242433]',
        selected && 'border-pink-500 shadow-pink-500/20'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-4 h-2 rounded-sm bg-pink-500" />
      
      <div className="absolute -left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white shadow-md">
        {data.order || 1}
      </div>

      <div className="text-sm font-bold uppercase tracking-widest text-pink-400">
        {data.label}
      </div>
      
      {data.metrics && (
        <div className="mt-2 rounded bg-black/30 px-3 py-1 text-xs font-mono text-white">
          {data.metrics}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-4 h-2 rounded-sm bg-pink-500" />
    </motion.div>
  );
});
