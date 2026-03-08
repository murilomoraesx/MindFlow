import { memo } from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import type { EdgeAnimationDirection, EdgeAnimationStyle } from '../../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildReferenceCurvePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}) => {
  const dx = targetX - sourceX;
  const direction = dx >= 0 ? 1 : -1;
  const absDx = Math.abs(dx);
  const lead = clamp(absDx * 0.36, 38, 116);
  const sourceControlX = sourceX + lead * direction;
  const targetControlX = targetX - lead * direction;

  return `M ${sourceX} ${sourceY} C ${sourceControlX} ${sourceY}, ${targetControlX} ${targetY}, ${targetX} ${targetY}`;
};

export const ReferenceEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected,
}: EdgeProps) => {
  const { edgeAnimationStyle: globalAnimationStyle } = useFlowStore((state) => state.settings);
  const referenceColor = (data?.color as string | undefined) || '#22C55E';
  const edgeVariant = (data?.variant as 'solid' | 'dashed' | 'glow' | undefined) || 'dashed';
  const thicknessClass = String(data?.thickness || '1');
  const thicknessMap: Record<string, number> = { thin: 1, normal: 2, thick: 4, '1': 1, '2': 2, '3': 3, '4': 4 };
  const strokeWidth = thicknessMap[thicknessClass] || parseInt(thicknessClass, 10) || 1;
  const animationStyle = ((data?.animationStyle as EdgeAnimationStyle | undefined) || globalAnimationStyle || 'subtle') as EdgeAnimationStyle;
  const animationDirection = ((data?.animationDirection as EdgeAnimationDirection | undefined) || 'forward') as EdgeAnimationDirection;
  const animationEnabled = data?.animationEnabled !== false;
  const naturalDirection: EdgeAnimationDirection = sourceX <= targetX ? 'forward' : 'reverse';
  const resolvedDirection: EdgeAnimationDirection = animationDirection === 'reverse'
    ? (naturalDirection === 'forward' ? 'reverse' : 'forward')
    : naturalDirection;
  const keyPoints = resolvedDirection === 'forward' ? '0;1' : '1;0';
  const edgePath = buildReferenceCurvePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const dashPattern = edgeVariant === 'solid' ? undefined : edgeVariant === 'glow' ? '2 8' : '1.5 9';
  const particleDuration = animationStyle === 'tech' ? '2.35s' : animationStyle === 'energy' ? '2.65s' : '2.9s';
  const pulseDuration = animationStyle === 'tech' ? '1.95s' : '2.35s';

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? strokeWidth + 0.35 : strokeWidth,
          stroke: referenceColor,
          strokeDasharray: dashPattern,
          strokeLinecap: 'round',
          opacity: selected ? 0.58 : edgeVariant === 'glow' ? 0.48 : 0.38,
          filter: edgeVariant === 'glow' ? `drop-shadow(0 0 5px ${referenceColor}18)` : `drop-shadow(0 0 2px ${referenceColor}0f)`,
        }}
      />
      <circle cx={sourceX} cy={sourceY} r={strokeWidth > 2 ? "3" : "2.6"} fill="rgba(255,255,255,0.72)" stroke={referenceColor} strokeWidth={strokeWidth > 2 ? "1.45" : "1.25"} opacity="0.54" />
      <circle cx={targetX} cy={targetY} r={strokeWidth > 2 ? "3" : "2.6"} fill="rgba(255,255,255,0.72)" stroke={referenceColor} strokeWidth={strokeWidth > 2 ? "1.45" : "1.25"} opacity="0.54" />
      {animationEnabled && (
        <>
          <circle r="1.55" fill={referenceColor} opacity="0.52">
            <animateMotion dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
            <animate attributeName="opacity" values="0.08;0.52;0.08" dur={pulseDuration} repeatCount="indefinite" />
          </circle>
          <circle r="0.82" fill="#ffffff" opacity="0.48">
            <animateMotion dur={particleDuration} begin="-1.1s" keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
            <animate attributeName="opacity" values="0.04;0.38;0.04" dur={pulseDuration} begin="-1.1s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </>
  );
});
