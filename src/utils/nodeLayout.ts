import type { XYPosition } from '@xyflow/react';
import type { MindFlowEdge, MindFlowNode, NodeType } from '../types';

export const IDEA_ROOT_COLOR = '#2563EB';
export const IDEA_CHILD_COLOR = '#8B5CF6';
export const IDEA_DESCENDANT_TEXT_COLOR = '#111827';
export const ROOT_IDEA_COLOR_CYCLE = ['#2563EB', '#10B981', '#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#EF4444'];
export const CANVAS_GRID_SIZE = 24;
export const isStructuralEdge = (edge: MindFlowEdge) => edge.type !== 'reference' && !edge.hidden;

const NODE_SIZE_BY_TYPE: Record<NodeType, { width: number; height: number }> = {
  idea: { width: 180, height: 80 },
  funnel: { width: 280, height: 220 },
  group: { width: 400, height: 300 },
  note: { width: 232, height: 132 },
  image: { width: 280, height: 220 },
};

export const getNodeSize = (node: Pick<MindFlowNode, 'type' | 'measured' | 'data'>) => {
  const fallback = NODE_SIZE_BY_TYPE[node.type];
  const groupWidth = node.type === 'group' && typeof node.data?.groupWidth === 'number' ? node.data.groupWidth : undefined;
  const groupHeight = node.type === 'group' && typeof node.data?.groupHeight === 'number' ? node.data.groupHeight : undefined;
  const noteWidth = node.type === 'note' && typeof node.data?.width === 'number' ? node.data.width : undefined;
  const noteHeight = node.type === 'note' && typeof node.data?.height === 'number' ? node.data.height : undefined;
  const noteLayout = node.type === 'note' && node.data?.noteLayout === 'expanded' ? 'expanded' : 'compact';
  const isCompactIdea =
    node.type === 'idea' &&
    !!node.data?.isEditing &&
    String(node.data?.label || '').trim().length === 0 &&
    !node.data?.descendantFrame;
  const hasFramedDescendant = node.type === 'idea' && !!node.data?.descendantFrame;
  return {
    width:
      node.measured?.width ||
      noteWidth ||
      groupWidth ||
      (node.type === 'note'
        ? noteLayout === 'expanded'
          ? 268
          : fallback.width
        : isCompactIdea
          ? 132
          : hasFramedDescendant
            ? 156
            : fallback.width),
    height:
      node.measured?.height ||
      noteHeight ||
      groupHeight ||
      (node.type === 'note'
        ? noteLayout === 'expanded'
          ? 176
          : fallback.height
        : isCompactIdea
          ? 64
          : hasFramedDescendant
            ? 64
            : fallback.height),
  };
};

export const snapValueToGrid = (value: number, gridSize = CANVAS_GRID_SIZE) => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPositionToGrid = (position: XYPosition, gridSize = CANVAS_GRID_SIZE): XYPosition => {
  return {
    x: snapValueToGrid(position.x, gridSize),
    y: snapValueToGrid(position.y, gridSize),
  };
};

const collidesWithAnyNode = (
  position: XYPosition,
  nodeType: NodeType,
  nodes: MindFlowNode[],
  ignoreNodeId?: string,
  padding = 28,
) => {
  const candidateSize = NODE_SIZE_BY_TYPE[nodeType];
  const candidateLeft = position.x - padding;
  const candidateTop = position.y - padding;
  const candidateRight = position.x + candidateSize.width + padding;
  const candidateBottom = position.y + candidateSize.height + padding;

  return nodes.some((node) => {
    if (node.hidden || node.id === ignoreNodeId) return false;

    const { width, height } = getNodeSize(node);
    const left = node.position.x;
    const top = node.position.y;
    const right = node.position.x + width;
    const bottom = node.position.y + height;

    const separated = candidateRight < left || candidateLeft > right || candidateBottom < top || candidateTop > bottom;
    return !separated;
  });
};

export const resolveNodeCollision = ({
  basePosition,
  nodeType,
  nodes,
  ignoreNodeId,
  stepY = 56,
  maxAttempts = 120,
}: {
  basePosition: XYPosition;
  nodeType: NodeType;
  nodes: MindFlowNode[];
  ignoreNodeId?: string;
  stepY?: number;
  maxAttempts?: number;
}): XYPosition => {
  let next = { ...basePosition };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!collidesWithAnyNode(next, nodeType, nodes, ignoreNodeId)) {
      return next;
    }
    next = { x: next.x, y: next.y + stepY };
  }

  return next;
};

export const getIncomingEdge = (nodeId: string, edges: MindFlowEdge[]) => {
  return edges.find((edge) => isStructuralEdge(edge) && edge.target === nodeId);
};

export const getNodeDepth = (nodeId: string, edges: MindFlowEdge[]) => {
  let depth = 0;
  let currentId = nodeId;
  let iterations = 0;

  while (currentId && iterations < 100) {
    const incomingEdge = getIncomingEdge(currentId, edges);
    if (!incomingEdge) break;
    depth += 1;
    currentId = incomingEdge.source;
    iterations += 1;
  }

  return depth;
};

export const getDefaultIdeaColorByDepth = (depth: number) => {
  if (depth <= 0) return IDEA_ROOT_COLOR;
  if (depth === 1) return IDEA_CHILD_COLOR;
  return IDEA_DESCENDANT_TEXT_COLOR;
};

export const getNextRootIdeaColor = (nodes: MindFlowNode[], edges: MindFlowEdge[]) => {
  const incomingTargets = new Set(edges.filter((edge) => isStructuralEdge(edge)).map((edge) => edge.target));
  const rootIdeas = nodes.filter((node) => node.type === 'idea' && !node.hidden && !incomingTargets.has(node.id));
  return ROOT_IDEA_COLOR_CYCLE[rootIdeas.length % ROOT_IDEA_COLOR_CYCLE.length];
};

export const isDescendant = (nodeId: string, ancestorId: string, edges: MindFlowEdge[]) => {
  if (nodeId === ancestorId) return false;

  const stack = [ancestorId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (!isStructuralEdge(edge)) continue;
      if (edge.source !== current) continue;
      if (edge.target === nodeId) return true;
      stack.push(edge.target);
    }
  }

  return false;
};

export const getNextChildBasePosition = ({
  parentNode,
  nodes,
  edges,
  horizontalGap = 80,
  verticalGap = 60,
}: {
  parentNode: MindFlowNode;
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  horizontalGap?: number;
  verticalGap?: number;
}): XYPosition => {
  const children = edges
    .filter((edge) => isStructuralEdge(edge) && edge.source === parentNode.id)
    .map((edge) => nodes.find((node) => node.id === edge.target))
    .filter((node): node is MindFlowNode => !!node && !node.hidden);

  const parentSize = getNodeSize(parentNode);
  const childX = parentNode.position.x + parentSize.width + horizontalGap;

  if (children.length === 0) {
    return snapPositionToGrid({
      x: childX,
      y: parentNode.position.y,
    });
  }

  const lastChild = [...children].sort((a, b) => a.position.y - b.position.y)[children.length - 1];
  return snapPositionToGrid({
    x: childX,
    y: lastChild.position.y + verticalGap,
  });
};
