import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'idea' | 'funnel' | 'group' | 'note' | 'image';
export type JourneyStage = 'aquisicao' | 'ativacao' | 'conversao' | 'retencao';
export type LayoutType = 'mindmap' | 'orgchart' | 'list';
export type EdgeAnimationStyle = 'energy' | 'subtle' | 'tech';
export type EdgeAnimationDirection = 'forward' | 'reverse';

export interface FunnelStage {
  id: string;
  name: string;
  type: 'entrada' | 'pagina' | 'formulario' | 'acao' | 'saida';
  trafficIn?: number;
  trafficOut?: number;
  dropOff?: number;
  conversionRate: number;
  cost?: number;
  revenue?: number;
  owner?: string;
  notes?: string;
}

export interface EdgeData extends Record<string, unknown> {
  color?: string;
  thickness?: string;
  variant?: 'solid' | 'dashed' | 'glow';
  animationStyle?: EdgeAnimationStyle;
  animationDirection?: EdgeAnimationDirection;
  animationEnabled?: boolean;
}

export interface NodeComment {
  id: string;
  text: string;
  resolved: boolean;
  createdAt: number;
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  color?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textStrike?: boolean;
  badge?: string;
  width?: number;
  height?: number;
  imageUrl?: string;
  order?: number;
  status?: 'active' | 'pending' | 'completed';
  metrics?: string;
  startingTraffic?: number;
  funnelStages?: FunnelStage[];
  funnelExpanded?: boolean;
  isCollapsed?: boolean;
  presentationOrder?: number;
  presentationIncluded?: boolean;
  presentationAutoOrder?: boolean;
  creationOrder?: number;
  presentationZoom?: number;
  journeyStage?: JourneyStage;
  isEditing?: boolean;
  noteVariant?: 'glass' | 'sticky' | 'outline';
  notePriority?: 'low' | 'medium' | 'high';
  noteChecklist?: string;
  notePinned?: boolean;
  noteLayout?: 'compact' | 'expanded';
  noteShowDescription?: boolean;
  noteShowChecklist?: boolean;
  imageFit?: 'cover' | 'contain';
  imageFrame?: 'rounded' | 'polaroid' | 'circle';
  imageFilter?: 'none' | 'mono' | 'warm' | 'cool';
  imageCaptionAlign?: 'left' | 'center' | 'right';
  imageShowDomain?: boolean;
  groupVariant?: 'glass' | 'solid' | 'outline';
  groupPadding?: number;
  groupWidth?: number;
  groupHeight?: number;
  descendantFrame?: boolean;
  comments?: NodeComment[];
}

export type MindFlowNode = Node<NodeData, NodeType>;
export type MindFlowEdge = Edge<EdgeData>;

export interface RecentMap {
  id: string;
  name: string;
  lastEdited: number;
  nodeCount: number;
  projectId?: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  lastEdited: number;
}

export interface MapData {
  id: string;
  name: string;
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  lastEdited: number;
  schemaVersion: number;
  settings: MapSettings;
  projectId?: string;
}

export interface MapSettings {
  autoLayoutOnInsert: boolean;
  presentationTheme: 'light' | 'dark' | 'system';
  defaultView: 'map' | 'funnel' | 'journey';
  edgeAnimationsEnabled: boolean;
  edgeAnimationStyle: EdgeAnimationStyle;
}
