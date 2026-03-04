import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'idea' | 'funnel' | 'group' | 'note' | 'image';

export interface NodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  color?: string;
  textColor?: string;
  icon?: string;
  badge?: string;
  width?: number;
  height?: number;
  imageUrl?: string;
  imageCaption?: string;
  order?: number;
  status?: 'active' | 'pending' | 'completed';
  metrics?: string;
}

export type MindFlowNode = Node<NodeData, NodeType>;
export type MindFlowEdge = Edge;

export interface MapData {
  id: string;
  name: string;
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  lastEdited: number;
}
