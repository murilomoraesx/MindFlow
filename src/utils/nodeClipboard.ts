import { v4 as uuidv4 } from 'uuid';
import type { MindFlowNode } from '../types';

let copiedNodeSnapshot: MindFlowNode | null = null;

export const setCopiedNodeSnapshot = (node: MindFlowNode | null) => {
  copiedNodeSnapshot = node
    ? {
        ...node,
        position: { ...node.position },
        data: { ...node.data },
      }
    : null;
};

export const getCopiedNodeSnapshot = () => copiedNodeSnapshot;

export const createPastedNode = (node: MindFlowNode, position: { x: number; y: number }): MindFlowNode => ({
  ...node,
  id: uuidv4(),
  position,
  parentId: undefined,
  hidden: false,
  selected: true,
  data: {
    ...node.data,
    isEditing: false,
    isCollapsed: false,
    order: undefined,
  },
});
