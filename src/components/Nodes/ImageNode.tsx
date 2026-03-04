import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export const ImageNode = memo(({ data, selected }: NodeProps<MindFlowNode>) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-[#242433] shadow-lg transition-all duration-200',
        'border-2 border-white/10',
        selected && 'border-blue-500 shadow-blue-500/20'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-white border-2 border-blue-500" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-blue-500" />
      
      <div className="flex flex-col">
        <div className="relative h-40 w-60 bg-black/50">
          {data.imageUrl ? (
            <img src={data.imageUrl} alt={data.label} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
              No Image
            </div>
          )}
        </div>
        
        <div className="p-3 text-center text-sm font-medium text-white">
          {data.label}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-2 border-blue-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-white border-2 border-blue-500" />
    </motion.div>
  );
});
