import { memo } from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import type { EdgeAnimationDirection, EdgeAnimationStyle } from '../../types';
import { DEFAULT_EDGE_COLOR } from '../../utils/colors';
import { EDGE_SYNC_MOTION_DURATION, EDGE_SYNC_PULSE_DURATION, getSynchronizedAnimationBegin } from '../../utils/edgeAnimationSync';

type AnimatedEdgeProps = EdgeProps & { className?: string };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildMindflowCurvePath = ({
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
  const dy = targetY - sourceY;
  const absDx = Math.abs(dx);

  if (absDx <= 1 && Math.abs(dy) <= 1) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  const direction = dx >= 0 ? 1 : -1;
  const lead = clamp(absDx * 0.42, 42, 132);
  const sourceControlX = sourceX + lead * direction;
  const targetControlX = targetX - lead * direction;

  return `M ${sourceX} ${sourceY} C ${sourceControlX} ${sourceY}, ${targetControlX} ${targetY}, ${targetX} ${targetY}`;
};

export const AnimatedEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  className,
  data,
  selected,
}: AnimatedEdgeProps) => {
  const { edgeAnimationsEnabled, edgeAnimationStyle: globalAnimationStyle } = useFlowStore((state) => state.settings);
  const edgePath = buildMindflowCurvePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const isFunnelConnection = sourceHandleId?.startsWith('stage-');

  // Custom user data overrides default styles
  const thicknessClass = String(data?.thickness || (isFunnelConnection ? '3' : '1'));
  const thicknessMap: Record<string, number> = { 'thin': 1, 'normal': 2, 'thick': 4, '1': 1, '2': 2, '3': 3, '4': 4 };
  const strokeW = thicknessMap[thicknessClass] || parseInt(thicknessClass, 10) || 2;
  const edgeVariant = (data?.variant as 'solid' | 'dashed' | 'glow' | undefined) || 'glow';

  const customColor = (data?.color as string | undefined) || (!isFunnelConnection ? DEFAULT_EDGE_COLOR : undefined);
  const animationStyle = ((data?.animationStyle as EdgeAnimationStyle | undefined) || globalAnimationStyle || 'energy') as EdgeAnimationStyle;
  const animationDirection = ((data?.animationDirection as EdgeAnimationDirection | undefined) || 'forward') as EdgeAnimationDirection;
  const animationEnabled = data?.animationEnabled === true || (data?.animationEnabled !== false && edgeAnimationsEnabled);

  const particleColor = customColor || (isFunnelConnection ? '#ec4899' : DEFAULT_EDGE_COLOR);
  // If custom color is provided, we use inline style instead of Tailwind class
  const edgeColorClass = customColor ? '' : (isFunnelConnection ? 'text-pink-400 dark:text-pink-500' : '');
  const strokeOpacity = selected ? 0.85 : edgeVariant === 'glow' ? (isFunnelConnection ? 0.75 : 0.5) : isFunnelConnection ? 0.5 : 0.35;
  const strokeDasharray = edgeVariant === 'dashed' ? '8 8' : undefined;
  const filter = edgeVariant === 'glow' ? `drop-shadow(0 0 8px ${particleColor}55)` : undefined;
  const particleDuration = EDGE_SYNC_MOTION_DURATION;
  const edgeClassName = [className, edgeColorClass].filter(Boolean).join(' ');
  const particleRadius = isFunnelConnection ? 4.15 : 3.15;
  const auraRadius = isFunnelConnection ? 7.6 : 6.1;
  const haloRadius = isFunnelConnection ? 11.5 : 8.8;
  const pulseDuration = EDGE_SYNC_PULSE_DURATION;
  const motionBegin = getSynchronizedAnimationBegin(particleDuration);
  const pulseBegin = getSynchronizedAnimationBegin(pulseDuration);
  const haloFilter = `blur(${isFunnelConnection ? 1.8 : 1.3}px) drop-shadow(0 0 ${isFunnelConnection ? 16 : 12}px ${particleColor}99)`;
  const auraFilter = `drop-shadow(0 0 ${isFunnelConnection ? 12 : 9}px ${particleColor}cc)`;
  const coreFilter = `drop-shadow(0 0 ${isFunnelConnection ? 10 : 8}px ${particleColor}dd)`;
  const naturalDirection: EdgeAnimationDirection = sourceX <= targetX ? 'forward' : 'reverse';
  const resolvedDirection: EdgeAnimationDirection = animationDirection === 'reverse'
    ? (naturalDirection === 'forward' ? 'reverse' : 'forward')
    : naturalDirection;
  const keyPoints = resolvedDirection === 'forward' ? '0;1' : '1;0';

  const renderAnimatedPayload = () => {
    if (!animationEnabled) return null;

    if (animationStyle === 'subtle') {
      return (
        <g className={[className, 'mf-edge-particle-group', 'mf-edge-particle-group-subtle'].filter(Boolean).join(' ')}>
          <rect x="-4.9" y="-1.7" width="9.8" height="3.4" rx="1.2" fill={particleColor} className="mf-edge-tech-packet mf-edge-subtle-packet" style={{ filter: `drop-shadow(0 0 7px ${particleColor}77)` }}>
            <animate attributeName="opacity" values="0.2;0.38;0.2" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
          <rect x="-1.9" y="-0.82" width="3.8" height="1.64" rx="0.65" fill="#fff" className="mf-edge-tech-core mf-edge-subtle-core" style={{ filter: `drop-shadow(0 0 5px ${particleColor}66)` }}>
            <animate attributeName="opacity" values="0.3;0.58;0.3" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
          <rect x="-6.4" y="-1.1" width="5.2" height="2.2" rx="0.8" fill={particleColor} className="mf-edge-subtle-trail" style={{ filter: `blur(0.6px)` }}>
            <animate attributeName="opacity" values="0.06;0.16;0.06" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
        </g>
      );
    }

    if (animationStyle === 'tech') {
      return (
        <g className={[className, 'mf-edge-particle-group', 'mf-edge-particle-group-tech'].filter(Boolean).join(' ')}>
          <rect
            x="-5"
            y="-1.8"
            width="10"
            height="3.6"
            rx="1.1"
            fill={particleColor}
            className="mf-edge-tech-packet"
            style={{ filter: `drop-shadow(0 0 9px ${particleColor}aa)` }}
          >
            <animate attributeName="opacity" values="0.28;0.7;0.28" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
          <rect
            x="-1.8"
            y="-0.8"
            width="3.6"
            height="1.6"
            rx="0.65"
            fill="#fff"
            className="mf-edge-tech-core"
            style={{ filter: `drop-shadow(0 0 6px ${particleColor}cc)` }}
          >
            <animate attributeName="opacity" values="0.4;0.95;0.4" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
          <rect
            x="-3.3"
            y="-1.15"
            width="6.6"
            height="2.3"
            rx="0.8"
            fill={particleColor}
            className="mf-edge-tech-packet-trail"
            style={{ filter: `blur(0.7px)` }}
          >
            <animate attributeName="opacity" values="0.08;0.22;0.08" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
          <rect
            x="-2.6"
            y="-0.95"
            width="5.2"
            height="1.9"
            rx="0.7"
            fill={particleColor}
            className="mf-edge-tech-packet-trail"
            style={{ filter: `blur(0.6px)` }}
          >
            <animate attributeName="opacity" values="0.06;0.18;0.06" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
            <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" rotate="auto" repeatCount="indefinite" path={edgePath} />
          </rect>
        </g>
      );
    }

    return (
      <g className={[className, 'mf-edge-particle-group'].filter(Boolean).join(' ')}>
        <circle
          r={String(haloRadius)}
          fill={particleColor}
          className="mf-edge-energy-halo"
          style={{ filter: haloFilter }}
        >
          <animate attributeName="r" values={`${haloRadius * 0.82};${haloRadius};${haloRadius * 0.82}`} begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.3;0.12" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
        </circle>
        <circle
          r={String(auraRadius)}
          fill={particleColor}
          className="mf-edge-energy-aura"
          style={{ filter: auraFilter }}
        >
          <animate attributeName="r" values={`${auraRadius * 0.92};${auraRadius};${auraRadius * 0.92}`} begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.28;0.52;0.28" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
        </circle>
        <circle
          r={String(particleRadius)}
          fill={particleColor}
          className={['mf-edge-particle', edgeVariant === 'glow' ? 'drop-shadow-lg' : ''].filter(Boolean).join(' ')}
          style={{ filter: auraFilter }}
        >
          <animate attributeName="opacity" values="0.88;1;0.88" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
        </circle>
        <circle r="1.9" fill="#fff" className="mf-edge-particle-core" style={{ filter: coreFilter }}>
          <animate attributeName="opacity" values="0.95;1;0.95" begin={pulseBegin} dur={pulseDuration} repeatCount="indefinite" />
          <animateMotion begin={motionBegin} dur={particleDuration} keyPoints={keyPoints} keyTimes="0;1" repeatCount="indefinite" path={edgePath} />
        </circle>
      </g>
    );
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: strokeW,
          stroke: customColor || 'currentColor',
          opacity: strokeOpacity,
          strokeDasharray,
          filter,
        }}
        className={edgeClassName}
      />
      {renderAnimatedPayload()}
    </>
  );
});
