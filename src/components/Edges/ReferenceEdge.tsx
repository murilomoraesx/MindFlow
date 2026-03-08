import { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export const ReferenceEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) => {
  const referenceColor = (data?.color as string | undefined) || '#22C55E';
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.38,
  });

  const markerId = `mf-reference-arrow-${id}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={referenceColor} opacity="0.92" />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          ...style,
          strokeWidth: 3,
          stroke: referenceColor,
          strokeDasharray: '1 8',
          strokeLinecap: 'round',
          opacity: 0.92,
          filter: `drop-shadow(0 0 8px ${referenceColor}33)`,
        }}
      />
      <circle cx={sourceX} cy={sourceY} r="6.5" fill="#ffffff" stroke={referenceColor} strokeWidth="3" opacity="0.96" />
      <circle cx={targetX} cy={targetY} r="6.5" fill="#ffffff" stroke={referenceColor} strokeWidth="3" opacity="0.96" />
      <circle cx={labelX} cy={labelY} r="4.5" fill={referenceColor} opacity="0.92" />
    </>
  );
});
