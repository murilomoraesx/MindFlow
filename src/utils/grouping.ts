import { MindFlowNode } from '../types';
import { getNodeSize } from './nodeLayout';

const GROUP_MIN_WIDTH = 260;
const GROUP_MAX_WIDTH = 1800;
const GROUP_MIN_HEIGHT = 180;
const GROUP_MAX_HEIGHT = 1400;
const GROUP_MIN_PADDING = 12;
const GROUP_MAX_PADDING = 120;
const GROUP_HEADER_HEIGHT = 56;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getGroupConfig = (groupNode: MindFlowNode) => ({
  width: clamp(Number(groupNode.data.groupWidth || 420), GROUP_MIN_WIDTH, GROUP_MAX_WIDTH),
  height: clamp(Number(groupNode.data.groupHeight || 280), GROUP_MIN_HEIGHT, GROUP_MAX_HEIGHT),
  padding: clamp(Number(groupNode.data.groupPadding || 24), GROUP_MIN_PADDING, GROUP_MAX_PADDING),
});

const wouldCreateParentCycle = (nodeId: string, parentId: string, nodesById: Map<string, MindFlowNode>) => {
  let currentParentId: string | undefined = parentId;
  let guard = 0;
  while (currentParentId && guard < 50) {
    if (currentParentId === nodeId) return true;
    const parent = nodesById.get(currentParentId);
    if (!parent) break;
    currentParentId = parent.parentId;
    guard += 1;
  }
  return false;
};

export const getAbsoluteNodePosition = (node: MindFlowNode, allNodes: MindFlowNode[]) => {
  const nodesById = new Map(allNodes.map((item) => [item.id, item]));
  let x = node.position.x;
  let y = node.position.y;
  let currentParentId = node.parentId;
  let guard = 0;

  while (currentParentId && guard < 50) {
    const parent = nodesById.get(currentParentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    currentParentId = parent.parentId;
    guard += 1;
  }

  return { x, y };
};

type GroupMutationResult = {
  nodes: MindFlowNode[];
  changed: boolean;
};

export const captureNodesIntoGroup = ({
  nodes,
  groupId,
  nodeIds,
}: {
  nodes: MindFlowNode[];
  groupId: string;
  nodeIds: string[];
}): GroupMutationResult => {
  const groupNode = nodes.find((node) => node.id === groupId && node.type === 'group');
  if (!groupNode) return { nodes, changed: false };

  const targetIds = new Set(nodeIds.filter((id) => id !== groupId));
  if (targetIds.size === 0) return { nodes, changed: false };

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const groupAbsolute = getAbsoluteNodePosition(groupNode, nodes);
  const { width, height, padding } = getGroupConfig(groupNode);
  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (!targetIds.has(node.id) || node.type === 'group') return node;
    if (wouldCreateParentCycle(node.id, groupId, nodesById)) return node;

    const absolute = getAbsoluteNodePosition(node, nodes);
    const nodeSize = getNodeSize(node);
    const maxX = Math.max(padding, width - nodeSize.width - padding);
    const maxY = Math.max(GROUP_HEADER_HEIGHT, height - nodeSize.height - padding);
    const relativeX = clamp(absolute.x - groupAbsolute.x, padding, maxX);
    const relativeY = clamp(absolute.y - groupAbsolute.y, GROUP_HEADER_HEIGHT, maxY);

    const alreadyInside =
      node.parentId === groupId &&
      Math.abs(node.position.x - relativeX) < 0.5 &&
      Math.abs(node.position.y - relativeY) < 0.5 &&
      node.extent === 'parent';

    if (alreadyInside) return node;
    changed = true;

    return {
      ...node,
      parentId: groupId,
      extent: 'parent' as const,
      position: { x: relativeX, y: relativeY },
      selected: true,
    };
  });

  return { nodes: changed ? nextNodes : nodes, changed };
};

export const releaseGroupChildren = ({
  nodes,
  groupId,
}: {
  nodes: MindFlowNode[];
  groupId: string;
}): GroupMutationResult => {
  const groupNode = nodes.find((node) => node.id === groupId && node.type === 'group');
  if (!groupNode) return { nodes, changed: false };
  const groupAbsolute = getAbsoluteNodePosition(groupNode, nodes);
  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.parentId !== groupId) return node;
    changed = true;
    return {
      ...node,
      position: {
        x: groupAbsolute.x + node.position.x,
        y: groupAbsolute.y + node.position.y,
      },
      parentId: undefined,
      extent: undefined,
    };
  });

  return { nodes: changed ? nextNodes : nodes, changed };
};

export const fitGroupToChildren = ({
  nodes,
  groupId,
}: {
  nodes: MindFlowNode[];
  groupId: string;
}): GroupMutationResult => {
  const groupNode = nodes.find((node) => node.id === groupId && node.type === 'group');
  if (!groupNode) return { nodes, changed: false };

  const children = nodes.filter((node) => node.parentId === groupId && !node.hidden);
  if (children.length === 0) return { nodes, changed: false };

  const { padding, width, height } = getGroupConfig(groupNode);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  children.forEach((child) => {
    const size = getNodeSize(child);
    minX = Math.min(minX, child.position.x);
    minY = Math.min(minY, child.position.y);
    maxX = Math.max(maxX, child.position.x + size.width);
    maxY = Math.max(maxY, child.position.y + size.height);
  });

  const nextWidth = clamp(Math.ceil(maxX - minX + padding * 2), GROUP_MIN_WIDTH, GROUP_MAX_WIDTH);
  const nextHeight = clamp(Math.ceil(maxY - minY + padding + GROUP_HEADER_HEIGHT), GROUP_MIN_HEIGHT, GROUP_MAX_HEIGHT);
  const shiftX = padding - minX;
  const shiftY = GROUP_HEADER_HEIGHT - minY;
  const shouldResize = nextWidth !== width || nextHeight !== height;
  const shouldShiftChildren = Math.abs(shiftX) > 0.5 || Math.abs(shiftY) > 0.5;

  if (!shouldResize && !shouldShiftChildren) return { nodes, changed: false };

  const nextNodes = nodes.map((node) => {
    if (node.id === groupId) {
      return {
        ...node,
        data: {
          ...node.data,
          groupWidth: nextWidth,
          groupHeight: nextHeight,
        },
      };
    }
    if (node.parentId !== groupId || !shouldShiftChildren) return node;
    return {
      ...node,
      position: {
        x: node.position.x + shiftX,
        y: node.position.y + shiftY,
      },
    };
  });

  return { nodes: nextNodes, changed: true };
};
