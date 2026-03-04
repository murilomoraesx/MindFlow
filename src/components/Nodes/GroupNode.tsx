import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export const GroupNode = memo(({ data, selected, width, height }: NodeProps<MindFlowNode>) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative rounded-2xl border-2 border-dashed transition-all duration-200',
        selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500/30 bg-emerald-500/5'
      )}
      style={{
        width: width || 400,
        height: height || 300,
      }}
    >
      <div className="absolute -top-3 left-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
        {data.label}
      </div>
    </motion.div>
  );
});
