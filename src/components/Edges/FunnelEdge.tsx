import { memo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export const FunnelEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20,
  });

  const thicknessClass = String(data?.thickness || '4');
  const thicknessMap: Record<string, number> = { 'thin': 1, 'normal': 2, 'thick': 4, '1': 1, '2': 2, '3': 3, '4': 4 };
  const strokeWidth = thicknessMap[thicknessClass] || parseInt(thicknessClass, 10) || 4;
  const edgeVariant = (data?.variant as 'solid' | 'dashed' | 'glow' | undefined) || 'dashed';
  const strokeDasharray = edgeVariant === 'solid' ? undefined : edgeVariant === 'glow' ? '8, 6' : '10, 10';
  const filter = edgeVariant === 'glow' ? `drop-shadow(0 0 8px ${String((data?.color as string | undefined) || '#EC4899')}66)` : undefined;

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth,
        stroke: (data?.color as string | undefined) || '#EC4899',
        strokeDasharray,
        filter,
        animation: strokeDasharray ? 'dash 1s linear infinite' : undefined,
      }}
      className="react-flow__edge-path"
    />
  );
});
