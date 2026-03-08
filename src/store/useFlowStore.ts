import { create } from 'zustand';
import {
  Connection,
  EdgeChange,
  NodeChange,
  addEdge,
  reconnectEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnReconnect,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowInstance,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { LayoutType, MapData, MapSettings, MindFlowNode, MindFlowEdge } from '../types';
import { DEFAULT_EDGE_COLOR } from '../utils/colors';
import { createBlankMap, DEFAULT_MAP_SETTINGS, normalizeMapData } from '../utils/mapSchema';
import { snapPositionToGrid } from '../utils/nodeLayout';

const initialMap = createBlankMap(uuidv4(), 'Meu Mapa Mental');
const THEME_STORAGE_KEY = 'mindflow_theme';

const getStoredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

interface FlowState {
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  mapName: string;
  mapId: string;
  mapProjectId: string | null;
  settings: MapSettings;
  theme: 'dark' | 'light';
  showMinimap: boolean;
  showStylePanel: boolean;
  cleanMode: boolean;
  focusModeEnabled: boolean;
  structurePanelOpen: boolean;
  selectionModeEnabled: boolean;
  draggedNodeId: string | null;
  dropTargetId: string | null;
  presentationMode: boolean;
  presentationNodeIds: string[];
  presentationIndex: number;
  currentView: 'projects' | 'editor';
  rfInstance: ReactFlowInstance | null;
  history: { nodes: MindFlowNode[]; edges: MindFlowEdge[] }[];
  historyIndex: number;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (show: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  layoutType: LayoutType;
  setLayoutType: (type: LayoutType) => void;

  onNodesChange: OnNodesChange<MindFlowNode>;
  onEdgesChange: OnEdgesChange<MindFlowEdge>;
  onConnect: OnConnect;
  onReconnect: OnReconnect;
  setNodes: (nodes: MindFlowNode[] | ((nodes: MindFlowNode[]) => MindFlowNode[])) => void;
  setEdges: (edges: MindFlowEdge[] | ((edges: MindFlowEdge[]) => MindFlowEdge[])) => void;
  addNode: (node: MindFlowNode) => void;
  updateNodeData: (id: string, data: Partial<MindFlowNode['data']>, avoidHistory?: boolean) => void;
  updateEdgeData: (id: string, data: Partial<Record<string, unknown>>) => void;
  deleteElements: (nodesToRemove: MindFlowNode[], edgesToRemove: MindFlowEdge[]) => void;
  setMapName: (name: string) => void;
  setMapProjectId: (projectId: string | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setShowMinimap: (show: boolean) => void;
  setShowStylePanel: (show: boolean) => void;
  setCleanMode: (enabled: boolean) => void;
  setFocusModeEnabled: (enabled: boolean) => void;
  setStructurePanelOpen: (show: boolean) => void;
  setSelectionModeEnabled: (enabled: boolean) => void;
  setDragState: (draggedNodeId: string | null, dropTargetId: string | null) => void;
  setPresentationMode: (show: boolean) => void;
  startPresentation: () => void;
  stopPresentation: () => void;
  nextPresentationStep: () => void;
  prevPresentationStep: () => void;
  focusPresentationNode: (nodeId: string) => void;
  setCurrentView: (view: 'projects' | 'editor') => void;
  setRfInstance: (instance: ReactFlowInstance | null) => void;
  setSettings: (settings: Partial<MapSettings>) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  focusNode: (nodeId: string, zoom?: number) => void;
  autoLayoutSubtree: (rootNodeId: string) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  jumpToHistoryIndex: (index: number) => void;
  autoLayout: (options?: { layoutType?: LayoutType; recordHistory?: boolean; fitView?: boolean }) => void;

  loadMap: (mapData: MapData) => void;
}

const isStructuralEdge = (edge: MindFlowEdge) => edge.type !== 'reference' && !edge.hidden;

const canConnectEdge = ({
  source,
  target,
  edges,
  ignoreEdgeId,
  replaceTargetParent = false,
}: {
  source: string;
  target: string;
  edges: MindFlowEdge[];
  ignoreEdgeId?: string;
  replaceTargetParent?: boolean;
}) => {
  if (!source || !target) return { valid: false, reason: 'invalid' as const };
  if (source === target) return { valid: false, reason: 'self' as const };

  const normalizedEdges = edges.filter(
    (edge) => isStructuralEdge(edge) && edge.id !== ignoreEdgeId && (!replaceTargetParent || edge.target !== target),
  );

  const duplicate = normalizedEdges.find((edge) => edge.source === source && edge.target === target);
  if (duplicate) return { valid: false, reason: 'duplicate' as const };

  if (!replaceTargetParent) {
    const incoming = normalizedEdges.find((edge) => edge.target === target && edge.source !== source);
    if (incoming) return { valid: false, reason: 'parent' as const };
  }

  const stack = [target];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (current === source) return { valid: false, reason: 'cycle' as const };
    normalizedEdges.forEach((edge) => {
      if (edge.source === current) stack.push(edge.target);
    });
  }

  return { valid: true as const };
};

const getNodeSize = (node: MindFlowNode) => {
  const groupWidth = node.type === 'group' && typeof node.data.groupWidth === 'number' ? node.data.groupWidth : undefined;
  const groupHeight = node.type === 'group' && typeof node.data.groupHeight === 'number' ? node.data.groupHeight : undefined;
  const isCompactIdea =
    node.type === 'idea' &&
    !!node.data.isEditing &&
    String(node.data.label || '').trim().length === 0 &&
    !node.data.descendantFrame;
  const hasFramedDescendant = node.type === 'idea' && !!node.data.descendantFrame;
  const width =
    node.measured?.width ||
    (node.type === 'funnel'
      ? 280
      : node.type === 'group'
        ? groupWidth || 400
        : node.type === 'image'
          ? 280
          : node.type === 'note'
            ? 220
            : isCompactIdea
              ? 132
              : hasFramedDescendant
                ? 156
                : 180);
  const height =
    node.measured?.height ||
    (node.type === 'funnel'
      ? 220
      : node.type === 'group'
        ? groupHeight || 300
        : node.type === 'image'
          ? 220
          : node.type === 'note'
            ? 210
            : isCompactIdea
              ? 64
              : hasFramedDescendant
                ? 64
                : 80);
  return { width, height };
};

const getPresentationSequence = (nodes: MindFlowNode[]) => {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const selectedVisibleNodes = visibleNodes.filter((node) => node.selected);
  const baseList = selectedVisibleNodes.length > 0 ? selectedVisibleNodes : visibleNodes;

  return [...baseList].sort((a, b) => {
    const aOrder = Number.isFinite(a.data.presentationOrder) ? Number(a.data.presentationOrder) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.data.presentationOrder) ? Number(b.data.presentationOrder) : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });
};

const MINDBAP_HORIZONTAL_GAP = 88;
const MINDBAP_ROW_GAP = 92;
const MINDBAP_ROOT_GAP_ROWS = 1;

const sortChildrenForLayout = (children: MindFlowNode[]) => {
  return [...children].sort((a, b) => {
    const orderA = typeof a.data.order === 'number' ? a.data.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.data.order === 'number' ? b.data.order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });
};

const buildNodeDepthMap = (nodes: MindFlowNode[], edges: MindFlowEdge[]) => {
  const depthById = new Map<string, number>();
  const childrenBySource = new Map<string, string[]>();
  const incomingTargets = new Set<string>();

  edges.forEach((edge) => {
    if (!isStructuralEdge(edge)) return;
    incomingTargets.add(edge.target);
    const siblings = childrenBySource.get(edge.source) || [];
    siblings.push(edge.target);
    childrenBySource.set(edge.source, siblings);
  });

  const roots = nodes
    .filter((node) => !incomingTargets.has(node.id))
    .sort((a, b) => (a.position.x === b.position.x ? a.position.y - b.position.y : a.position.x - b.position.x));
  const queue = roots.map((node) => ({ id: node.id, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const existingDepth = depthById.get(current.id);
    if (existingDepth !== undefined && existingDepth <= current.depth) continue;
    depthById.set(current.id, current.depth);

    const children = childrenBySource.get(current.id) || [];
    children.forEach((childId) => {
      queue.push({ id: childId, depth: current.depth + 1 });
    });
  }

  nodes.forEach((node) => {
    if (!depthById.has(node.id)) {
      depthById.set(node.id, 0);
    }
  });

  return depthById;
};

const buildMindmapLayout = ({
  nodes,
  edges,
  fitView,
}: {
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  fitView?: boolean;
}) => {
  const depthById = buildNodeDepthMap(nodes, edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenBySource = new Map<string, MindFlowNode[]>();
  const incomingTargets = new Set<string>();
  const maxWidthByDepth = new Map<number, number>();

  edges.forEach((edge) => {
    if (!isStructuralEdge(edge)) return;
    const childNode = nodeById.get(edge.target);
    if (!childNode) return;
    incomingTargets.add(edge.target);
    const siblings = childrenBySource.get(edge.source) || [];
    siblings.push(childNode);
    childrenBySource.set(edge.source, siblings);
  });

  childrenBySource.forEach((children, sourceId) => {
    childrenBySource.set(sourceId, sortChildrenForLayout(children));
  });

  nodes.forEach((node) => {
    const depth = depthById.get(node.id) || 0;
    const { width } = getNodeSize(node);
    maxWidthByDepth.set(depth, Math.max(maxWidthByDepth.get(depth) || 0, width));
  });

  const uniqueDepths = [...new Set(depthById.values())].sort((a, b) => a - b);

  const columnXByDepth = new Map<number, number>();
  uniqueDepths.forEach((depth) => {
    if (depth === 0) {
      columnXByDepth.set(depth, 0);
      return;
    }

    let x = columnXByDepth.get(0) || 0;
    for (let currentDepth = 0; currentDepth < depth; currentDepth += 1) {
      x += (maxWidthByDepth.get(currentDepth) || 180) + MINDBAP_HORIZONTAL_GAP;
    }
    columnXByDepth.set(depth, x);
  });

  const leafSpanById = new Map<string, number>();
  const computeLeafSpan = (nodeId: string): number => {
    const cached = leafSpanById.get(nodeId);
    if (cached !== undefined) return cached;

    const children = childrenBySource.get(nodeId) || [];
    if (children.length === 0) {
      leafSpanById.set(nodeId, 1);
      return 1;
    }

    if (children.length === 1) {
      const span = Math.max(1, computeLeafSpan(children[0].id));
      leafSpanById.set(nodeId, span);
      return span;
    }

    const span = children.reduce((sum, child) => sum + computeLeafSpan(child.id), 0);
    leafSpanById.set(nodeId, span);
    return span;
  };

  const orderedRoots = sortChildrenForLayout(nodes.filter((node) => !incomingTargets.has(node.id)));
  orderedRoots.forEach((root) => computeLeafSpan(root.id));

  const positions = new Map<string, { x: number; y: number }>();
  const assignNode = (nodeId: string, startRow: number) => {
    const node = nodeById.get(nodeId);
    if (!node) return;

    const { height } = getNodeSize(node);
    const depth = depthById.get(nodeId) || 0;
    const children = childrenBySource.get(nodeId) || [];
    const span = leafSpanById.get(nodeId) || 1;
    const centerRow = startRow + (span - 1) / 2;

    positions.set(nodeId, {
      x: columnXByDepth.get(depth) || 0,
      y: centerRow * MINDBAP_ROW_GAP - height / 2,
    });

    if (children.length === 0) return;

    if (children.length === 1) {
      assignNode(children[0].id, startRow);
      return;
    }

    let childStartRow = startRow;
    children.forEach((child) => {
      const childSpan = leafSpanById.get(child.id) || 1;
      assignNode(child.id, childStartRow);
      childStartRow += childSpan;
    });
  };

  let cursorRow = 0;
  orderedRoots.forEach((root, index) => {
    assignNode(root.id, cursorRow);
    cursorRow += (leafSpanById.get(root.id) || 1) + (index === orderedRoots.length - 1 ? 0 : MINDBAP_ROOT_GAP_ROWS);
  });

  return positions;
};

const anchorMindmapRoots = ({
  nodes,
  edges,
  positions,
}: {
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  positions: Map<string, { x: number; y: number }>;
}) => {
  const anchoredPositions = new Map(positions);
  const childrenBySource = new Map<string, string[]>();
  const incomingTargets = new Set<string>();

  edges.forEach((edge) => {
    if (!isStructuralEdge(edge)) return;
    incomingTargets.add(edge.target);
    const children = childrenBySource.get(edge.source) || [];
    children.push(edge.target);
    childrenBySource.set(edge.source, children);
  });

  const roots = nodes.filter((node) => !incomingTargets.has(node.id));
  roots.forEach((root) => {
    const computed = positions.get(root.id);
    if (!computed) return;

    const delta = {
      x: root.position.x - computed.x,
      y: root.position.y - computed.y,
    };

    const queue = [root.id];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);

      const currentPosition = anchoredPositions.get(current);
      if (currentPosition) {
        anchoredPositions.set(current, {
          x: currentPosition.x + delta.x,
          y: currentPosition.y + delta.y,
        });
      }

      const children = childrenBySource.get(current) || [];
      children.forEach((childId) => queue.push(childId));
    }
  });

  return anchoredPositions;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialMap.nodes,
  edges: initialMap.edges,
  mapName: initialMap.name,
  mapId: initialMap.id,
  mapProjectId: initialMap.projectId || null,
  settings: initialMap.settings || DEFAULT_MAP_SETTINGS,
  theme: getStoredTheme(),
  showMinimap: false,
  showStylePanel: false,
  cleanMode: false,
  focusModeEnabled: false,
  structurePanelOpen: false,
  selectionModeEnabled: false,
  draggedNodeId: null,
  dropTargetId: null,
  presentationMode: false,
  presentationNodeIds: [],
  presentationIndex: 0,
  currentView: 'projects',
  rfInstance: null,
  history: [{ nodes: initialMap.nodes, edges: initialMap.edges }],
  historyIndex: 0,
  saveStatus: 'saved',
  setSaveStatus: (status) => set({ saveStatus: status }),
  showShortcutsModal: false,
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  showCommandPalette: false,
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  showHistoryPanel: false,
  setShowHistoryPanel: (show) => set({ showHistoryPanel: show }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  layoutType: 'mindmap',
  setLayoutType: (type) => set({ layoutType: type }),

  onNodesChange: (changes: NodeChange<MindFlowNode>[]) => {
    const removedNodeIds = changes.filter((change) => change.type === 'remove').map((change) => change.id);
    if (removedNodeIds.length > 0) {
      const nodesToRemove = get().nodes.filter((node) => removedNodeIds.includes(node.id));
      get().deleteElements(nodesToRemove, []);
      return;
    }

    set({
      nodes: applyNodeChanges(changes as never, get().nodes) as MindFlowNode[],
    });
  },
  onEdgesChange: (changes: EdgeChange<MindFlowEdge>[]) => {
    const currentEdges = get().edges;
    const nodesById = new Map(get().nodes.map((node) => [node.id, node]));
    const normalizedChanges = changes.filter((change) => {
      if (change.type !== 'remove') return true;
      const targetEdge = currentEdges.find((edge) => edge.id === change.id);
      if (!targetEdge) return true;
      if (targetEdge.type === 'reference') return true;
      const sourceNode = nodesById.get(targetEdge.source);
      const targetNode = nodesById.get(targetEdge.target);
      return sourceNode?.type !== 'idea' && targetNode?.type !== 'idea';
    });
    set({
      edges: applyEdgeChanges(normalizedChanges as never, currentEdges) as MindFlowEdge[],
    });
  },
  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const { nodes, edges } = get();
    const validation = canConnectEdge({
      source: connection.source,
      target: connection.target,
      edges,
      replaceTargetParent: true,
    });
    if (!validation.valid) {
      console.info('[MindFlow] conexão bloqueada:', validation.reason);
      return;
    }
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    const nextEdge: MindFlowEdge = {
      id: `e-${connection.source}-${connection.target}-${uuidv4()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || 'right',
      targetHandle: connection.targetHandle || 'left',
      type: 'animated',
      animated: false,
      data: {
        color: DEFAULT_EDGE_COLOR,
        thickness: '1',
      },
    };
    const targetNode = nodes.find((node) => node.id === connection.target);
    set({
      edges: [
        ...edges.filter((edge) => (targetNode?.type === 'idea' ? edge.target !== connection.target : true)),
        nextEdge,
      ],
    });
    if (targetNode?.type === 'idea' || connection.source) {
      requestAnimationFrame(() => {
        get().autoLayout();
      });
    }
  },
  onReconnect: (oldEdge, newConnection) => {
    if (!newConnection.source || !newConnection.target) return;
    const { nodes, edges } = get();
    const validation = canConnectEdge({
      source: newConnection.source,
      target: newConnection.target,
      edges,
      ignoreEdgeId: oldEdge.id,
      replaceTargetParent: true,
    });
    if (!validation.valid) {
      console.info('[MindFlow] reconexão bloqueada:', validation.reason);
      return;
    }
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    const targetNode = nodes.find((node) => node.id === newConnection.target);
    set({
      edges: reconnectEdge(
        oldEdge,
        {
          ...newConnection,
          sourceHandle: newConnection.sourceHandle || 'right',
          targetHandle: newConnection.targetHandle || 'left',
        },
        edges.filter((edge) => (targetNode?.type === 'idea' && edge.id !== oldEdge.id ? edge.target !== newConnection.target : true)),
      ) as MindFlowEdge[],
    });
    if (targetNode?.type === 'idea') {
      requestAnimationFrame(() => {
        get().autoLayout();
      });
    }
  },
  setNodes: (nodes) => {
    set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes });
  },
  setEdges: (edges) => {
    set({ edges: typeof edges === 'function' ? edges(get().edges) : edges });
  },
  addNode: (node) => {
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    set({ nodes: [...get().nodes, node] });
    if (node.type === 'idea' || get().settings.autoLayoutOnInsert) {
      requestAnimationFrame(() => {
        get().autoLayout();
      });
    }
  },
  updateNodeData: (id, data, avoidHistory = false) => {
    if (!avoidHistory) {
      set({ saveStatus: 'unsaved' });
      get().pushHistory();
    }
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  updateEdgeData: (id, data) => {
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === id) {
          return { ...edge, data: { ...edge.data, ...data } };
        }
        return edge;
      }),
    });
  },
  deleteElements: (nodesToRemove, edgesToRemove) => {
    if (nodesToRemove.length === 0 && edgesToRemove.length === 0) {
      return;
    }

    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    const { nodes, edges } = get();

    const finalNodeIdsToRemove = new Set<string>(nodesToRemove.map((node) => node.id));
    const stack = [...finalNodeIdsToRemove];

    while (stack.length > 0) {
      const currentNodeId = stack.pop();
      if (!currentNodeId) continue;

      edges.forEach((edge) => {
        if (edge.source !== currentNodeId) return;
        if (!finalNodeIdsToRemove.has(edge.target)) {
          finalNodeIdsToRemove.add(edge.target);
          stack.push(edge.target);
        }
      });

      nodes.forEach((node) => {
        if (node.parentId !== currentNodeId) return;
        if (!finalNodeIdsToRemove.has(node.id)) {
          finalNodeIdsToRemove.add(node.id);
          stack.push(node.id);
        }
      });
    }

    const finalEdgeIdsToRemove = new Set([
      ...edgesToRemove.map((edge) => edge.id),
      ...edges.filter((edge) => finalNodeIdsToRemove.has(edge.source) || finalNodeIdsToRemove.has(edge.target)).map((edge) => edge.id),
    ]);

    set({
      nodes: nodes.filter((node) => !finalNodeIdsToRemove.has(node.id)),
      edges: edges.filter((edge) => !finalEdgeIdsToRemove.has(edge.id)),
    });
  },
  setMapName: (name) => set({ mapName: name }),
  setMapProjectId: (projectId) => set({ mapProjectId: projectId }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ theme });
  },
  setShowMinimap: (show) => set({ showMinimap: show }),
  setShowStylePanel: (show) => set({ showStylePanel: show }),
  setCleanMode: (cleanMode) => set({ cleanMode, showMinimap: cleanMode ? false : get().showMinimap }),
  setFocusModeEnabled: (focusModeEnabled) => set({ focusModeEnabled }),
  setStructurePanelOpen: (structurePanelOpen) => set({ structurePanelOpen }),
  setSelectionModeEnabled: (enabled) => set({ selectionModeEnabled: enabled }),
  setDragState: (draggedNodeId, dropTargetId) => set({ draggedNodeId, dropTargetId }),
  setPresentationMode: (show) => {
    if (!show) {
      set({ presentationMode: false, presentationNodeIds: [], presentationIndex: 0 });
      return;
    }
    set({ presentationMode: true, selectionModeEnabled: false });
  },
  startPresentation: () => {
    const sequence = getPresentationSequence(get().nodes);
    if (sequence.length === 0) return;

    const nodeIds = sequence.map((node) => node.id);
    set({
      presentationMode: true,
      presentationNodeIds: nodeIds,
      presentationIndex: 0,
    });

    setTimeout(() => {
      get().focusPresentationNode(nodeIds[0]);
    }, 0);
  },
  stopPresentation: () => {
    set({
      presentationMode: false,
      presentationNodeIds: [],
      presentationIndex: 0,
    });
  },
  nextPresentationStep: () => {
    const { presentationIndex, presentationNodeIds } = get();
    if (presentationNodeIds.length === 0) return;

    const nextIndex = Math.min(presentationIndex + 1, presentationNodeIds.length - 1);
    if (nextIndex === presentationIndex) return;

    set({ presentationIndex: nextIndex });
    get().focusPresentationNode(presentationNodeIds[nextIndex]);
  },
  prevPresentationStep: () => {
    const { presentationIndex, presentationNodeIds } = get();
    if (presentationNodeIds.length === 0) return;

    const prevIndex = Math.max(presentationIndex - 1, 0);
    if (prevIndex === presentationIndex) return;

    set({ presentationIndex: prevIndex });
    get().focusPresentationNode(presentationNodeIds[prevIndex]);
  },
  focusPresentationNode: (nodeId) => {
    const { nodes, rfInstance } = get();
    if (!rfInstance) return;

    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    const { width, height } = getNodeSize(node);
    const targetX = node.position.x + width / 2;
    const targetY = node.position.y + height / 2;

    rfInstance.setCenter(targetX, targetY, {
      zoom: 1.2,
      duration: 500,
    });
  },
  setCurrentView: (view) => set({ currentView: view }),
  setRfInstance: (instance) => set({ rfInstance: instance }),
  setSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),

  toggleNodeCollapse: (nodeId: string) => {
    set({ saveStatus: 'unsaved' });
    const { nodes, edges } = get();

    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) return;

    const isCurrentlyCollapsed = !!targetNode.data.isCollapsed;
    const willCollapse = !isCurrentlyCollapsed;

    const getDescendants = (parentId: string, currentDescendants: Set<string> = new Set()): Set<string> => {
      const childrenIds = edges.filter((edge) => edge.source === parentId).map((edge) => edge.target);

      childrenIds.forEach((childId) => {
        const childNode = nodes.find((node) => node.id === childId);
        if (childNode && childNode.type !== 'funnel' && !currentDescendants.has(childId)) {
          currentDescendants.add(childId);
          getDescendants(childId, currentDescendants);
        }
      });
      return currentDescendants;
    };

    const descendantsToHide = getDescendants(nodeId);
    if (descendantsToHide.size === 0) return;

    get().pushHistory();

    const newNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, isCollapsed: willCollapse } };
      }
      if (descendantsToHide.has(node.id)) {
        return { ...node, hidden: willCollapse };
      }
      return node;
    });

    const newEdges = edges.map((edge) => {
      if (descendantsToHide.has(edge.target)) {
        return { ...edge, hidden: willCollapse };
      }
      return edge;
    });

    set({ nodes: newNodes, edges: newEdges });
  },
  focusNode: (nodeId: string, zoom = 1.15) => {
    const { nodes, rfInstance } = get();
    if (!rfInstance) return;

    const target = nodes.find((node) => node.id === nodeId);
    if (!target) return;

    const { width, height } = getNodeSize(target);
    const centerX = target.position.x + width / 2;
    const centerY = target.position.y + height / 2;

    set({
      nodes: nodes.map((node) => ({ ...node, selected: node.id === nodeId })),
    });

    rfInstance.setCenter(centerX, centerY, {
      zoom,
      duration: 380,
    });
  },
  autoLayoutSubtree: (rootNodeId: string) => {
    const { nodes, edges, layoutType } = get();
    const root = nodes.find((node) => node.id === rootNodeId);
    if (!root) return;

    const subtreeIds = new Set<string>([rootNodeId]);
    const queue = [rootNodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      edges.forEach((edge) => {
        if (edge.source !== current) return;
        if (!subtreeIds.has(edge.target)) {
          subtreeIds.add(edge.target);
          queue.push(edge.target);
        }
      });
    }

    if (subtreeIds.size <= 1) return;

    const subtreeNodes = nodes.filter((node) => subtreeIds.has(node.id) && !node.hidden && node.parentId === root.parentId);
    const subtreeNodeIds = new Set(subtreeNodes.map((node) => node.id));
    const subtreeNodeById = new Map(subtreeNodes.map((node) => [node.id, node]));
    const subtreeEdges = edges
      .filter((edge) => subtreeNodeIds.has(edge.source) && subtreeNodeIds.has(edge.target) && !edge.hidden)
      .sort((a, b) => {
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        const nodeA = subtreeNodeById.get(a.target);
        const nodeB = subtreeNodeById.get(b.target);
        const orderA = typeof nodeA?.data.order === 'number' ? nodeA.data.order : nodeA?.position.y || 0;
        const orderB = typeof nodeB?.data.order === 'number' ? nodeB.data.order : nodeB?.position.y || 0;
        return orderA - orderB;
      });
    if (subtreeNodes.length <= 1) return;

    if (layoutType === 'mindmap') {
      const subtreePositions = buildMindmapLayout({
        nodes: subtreeNodes,
        edges: subtreeEdges,
      });
      const rootLayoutPosition = subtreePositions.get(rootNodeId);
      if (!rootLayoutPosition) return;

      const offset = {
        x: root.position.x - rootLayoutPosition.x,
        y: root.position.y - rootLayoutPosition.y,
      };

      get().pushHistory();
      set({ saveStatus: 'unsaved' });
      set({
        nodes: nodes.map((node) => {
          const position = subtreePositions.get(node.id);
          if (!position) return node;

          return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
              x: position.x + offset.x,
              y: position.y + offset.y,
            },
          };
        }),
      });
      return;
    }

    const layoutConfig = layoutType === 'orgchart'
      ? { rankdir: 'TB' as const, nodesep: 72, ranksep: 110 }
      : { rankdir: 'TB' as const, nodesep: 20, ranksep: 56 };

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      ...layoutConfig,
      ranker: 'tight-tree',
    });

    subtreeNodes.forEach((node) => {
      const { width, height } = getNodeSize(node);
      graph.setNode(node.id, { width, height });
    });
    subtreeEdges.forEach((edge) => graph.setEdge(edge.source, edge.target));

    dagre.layout(graph);

    const rootLayout = graph.node(rootNodeId);
    if (!rootLayout) return;
    const rootSize = getNodeSize(root);
    const rootLayoutPosition = {
      x: rootLayout.x - rootSize.width / 2,
      y: rootLayout.y - rootSize.height / 2,
    };

    const offset = {
      x: root.position.x - rootLayoutPosition.x,
      y: root.position.y - rootLayoutPosition.y,
    };

    const nextPositions = new Map<string, { x: number; y: number }>();
    subtreeNodes.forEach((node) => {
      const positioned = graph.node(node.id);
      if (!positioned) return;
      const { width, height } = getNodeSize(node);
      nextPositions.set(node.id, {
        x: positioned.x - width / 2 + offset.x,
        y: positioned.y - height / 2 + offset.y,
      });
    });

    const isVertical = true;
    get().pushHistory();
    set({ saveStatus: 'unsaved' });
    set({
      nodes: nodes.map((node) => {
        const position = nextPositions.get(node.id);
        if (!position) return node;
        return {
          ...node,
          targetPosition: isVertical ? Position.Top : Position.Left,
          sourcePosition: isVertical ? Position.Bottom : Position.Right,
          position: snapPositionToGrid(position),
        };
      }),
    });
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes, edges });
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  jumpToHistoryIndex: (index: number) => {
    const { history } = get();
    if (index < 0 || index >= history.length) return;
    set({
      nodes: history[index].nodes,
      edges: history[index].edges,
      historyIndex: index,
      saveStatus: 'unsaved',
    });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        nodes: history[newIndex].nodes,
        edges: history[newIndex].edges,
        historyIndex: newIndex,
      });
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        nodes: history[newIndex].nodes,
        edges: history[newIndex].edges,
        historyIndex: newIndex,
      });
    }
  },
  autoLayout: (options) => {
    const { nodes, edges, layoutType, rfInstance } = get();
    const nextLayoutType = options?.layoutType ?? layoutType;
    if (nodes.length === 0) return;

    const visibleNodes = nodes.filter((node) => !node.hidden && !node.parentId);
    if (visibleNodes.length === 0) return;

    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    const isCanvasReset = !!options?.fitView;
    const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
    const layoutConfig = nextLayoutType === 'orgchart'
      ? { rankdir: 'TB' as const, nodesep: isCanvasReset ? 120 : 80, ranksep: isCanvasReset ? 170 : 120 }
      : nextLayoutType === 'list'
        ? { rankdir: 'TB' as const, nodesep: isCanvasReset ? 36 : 24, ranksep: isCanvasReset ? 88 : 60 }
        : { rankdir: 'LR' as const, nodesep: isCanvasReset ? 120 : 80, ranksep: isCanvasReset ? 210 : 150 };

    const visibleEdges = edges
      .filter((edge) => isStructuralEdge(edge) && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .sort((a, b) => {
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        const nodeA = nodeById.get(a.target);
        const nodeB = nodeById.get(b.target);
        const orderA = typeof nodeA?.data.order === 'number' ? nodeA.data.order : nodeA?.position.y || 0;
        const orderB = typeof nodeB?.data.order === 'number' ? nodeB.data.order : nodeB?.position.y || 0;
        return orderA - orderB;
      });

    if (nextLayoutType === 'mindmap') {
      const rawMindmapPositions = buildMindmapLayout({
        nodes: visibleNodes,
        edges: visibleEdges,
        fitView: isCanvasReset,
      });
      const mindmapPositions = isCanvasReset
        ? rawMindmapPositions
        : anchorMindmapRoots({
            nodes: visibleNodes,
            edges: visibleEdges,
            positions: rawMindmapPositions,
          });

      const layoutedNodes = nodes.map((node) => {
        if (node.hidden || node.parentId) return node;
        const position = mindmapPositions.get(node.id);
        if (!position) return node;

        return {
          ...node,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
          position,
        };
      });

      if (options?.recordHistory) {
        set({ saveStatus: 'unsaved' });
        get().pushHistory();
      }

      set({
        nodes: layoutedNodes as MindFlowNode[],
        ...(options?.layoutType ? { layoutType: options.layoutType } : {}),
      });

      if (options?.fitView && rfInstance) {
        requestAnimationFrame(() => {
          rfInstance.fitView({
            padding: 0.35,
            maxZoom: 0.9,
            duration: 380,
          });
        });
      }

      return;
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      ...layoutConfig,
      ranker: 'tight-tree',
    });

    visibleNodes.forEach((node) => {
      if (node.hidden) return;
      const { width, height } = getNodeSize(node);
      dagreGraph.setNode(node.id, { width, height });
    });

    visibleEdges.forEach((edge) => {
      if (edge.hidden) return;
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const positionedByDagre = new Map<string, { x: number; y: number }>();
    visibleNodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) return;

      const { width, height } = getNodeSize(node);
      positionedByDagre.set(node.id, {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      });
    });

    const isVertical = nextLayoutType === 'orgchart' || nextLayoutType === 'list';
    const layoutedNodes = nodes.map((node) => {
      if (node.hidden || node.parentId) return node;

      const basePosition = positionedByDagre.get(node.id);
      if (!basePosition) return node;

      return {
        ...node,
        targetPosition: isVertical ? Position.Top : Position.Left,
        sourcePosition: isVertical ? Position.Bottom : Position.Right,
        position: snapPositionToGrid({
          x: basePosition.x,
          y: basePosition.y,
        }),
      };
    });

    if (options?.recordHistory) {
      set({ saveStatus: 'unsaved' });
      get().pushHistory();
    }

    set({
      nodes: layoutedNodes as MindFlowNode[],
      ...(options?.layoutType ? { layoutType: options.layoutType } : {}),
    });

    if (options?.fitView && rfInstance) {
      requestAnimationFrame(() => {
        rfInstance.fitView({
          padding: 0.35,
          maxZoom: 0.9,
          duration: 380,
        });
      });
    }
  },
  loadMap: (mapData) => {
    const normalizedMap = normalizeMapData(mapData);

    set({
      nodes: normalizedMap.nodes,
      edges: normalizedMap.edges,
      mapName: normalizedMap.name,
      mapId: normalizedMap.id,
      mapProjectId: normalizedMap.projectId || null,
      settings: normalizedMap.settings,
      history: [{ nodes: normalizedMap.nodes, edges: normalizedMap.edges }],
      historyIndex: 0,
      presentationMode: false,
      presentationNodeIds: [],
      presentationIndex: 0,
    });
  },
}));
