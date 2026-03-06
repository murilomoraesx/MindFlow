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
import { CanvasTheme, LayoutType, MapData, MapSettings, MindFlowNode, MindFlowEdge } from '../types';
import { createBlankMap, DEFAULT_MAP_SETTINGS, normalizeMapData } from '../utils/mapSchema';

const initialMap = createBlankMap(uuidv4(), 'Meu Mapa Mental');
const THEME_STORAGE_KEY = 'mindflow_theme';
const CANVAS_THEME_STORAGE_KEY = 'mindflow_canvas_theme';

const getStoredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

const getStoredCanvasTheme = (): CanvasTheme => {
  if (typeof window === 'undefined') return 'moderno';
  const stored = window.localStorage.getItem(CANVAS_THEME_STORAGE_KEY);
  const validThemes: CanvasTheme[] = ['elegante', 'moderno', 'tech', 'retro', 'neon', 'cosmos', 'terminal', 'ember'];
  return validThemes.includes(stored as CanvasTheme) ? (stored as CanvasTheme) : 'moderno';
};

interface FlowState {
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  mapName: string;
  mapId: string;
  mapProjectId: string | null;
  settings: MapSettings;
  theme: 'dark' | 'light';
  canvasTheme: CanvasTheme;
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
  setCanvasTheme: (theme: CanvasTheme) => void;
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

const canConnectEdge = ({
  source,
  target,
  edges,
  ignoreEdgeId,
}: {
  source: string;
  target: string;
  edges: MindFlowEdge[];
  ignoreEdgeId?: string;
}) => {
  if (!source || !target) return { valid: false, reason: 'invalid' as const };
  if (source === target) return { valid: false, reason: 'self' as const };

  const normalizedEdges = edges.filter((edge) => edge.id !== ignoreEdgeId);

  const duplicate = normalizedEdges.find((edge) => edge.source === source && edge.target === target);
  if (duplicate) return { valid: false, reason: 'duplicate' as const };

  const incoming = normalizedEdges.find((edge) => edge.target === target && edge.source !== source);
  if (incoming) return { valid: false, reason: 'parent' as const };

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

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialMap.nodes,
  edges: initialMap.edges,
  mapName: initialMap.name,
  mapId: initialMap.id,
  mapProjectId: initialMap.projectId || null,
  settings: initialMap.settings || DEFAULT_MAP_SETTINGS,
  theme: getStoredTheme(),
  canvasTheme: getStoredCanvasTheme(),
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
    set({
      edges: applyEdgeChanges(changes as never, get().edges) as MindFlowEdge[],
    });
  },
  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const validation = canConnectEdge({
      source: connection.source,
      target: connection.target,
      edges: get().edges,
    });
    if (!validation.valid) {
      console.info('[MindFlow] conexão bloqueada:', validation.reason);
      return;
    }
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    set({
      edges: addEdge(
        {
          ...connection,
          sourceHandle: connection.sourceHandle || 'right',
          targetHandle: connection.targetHandle || 'left',
          type: 'animated',
          animated: true,
        },
        get().edges,
      ) as MindFlowEdge[],
    });
  },
  onReconnect: (oldEdge, newConnection) => {
    if (!newConnection.source || !newConnection.target) return;
    const validation = canConnectEdge({
      source: newConnection.source,
      target: newConnection.target,
      edges: get().edges,
      ignoreEdgeId: oldEdge.id,
    });
    if (!validation.valid) {
      console.info('[MindFlow] reconexão bloqueada:', validation.reason);
      return;
    }
    set({ saveStatus: 'unsaved' });
    get().pushHistory();
    set({
      edges: reconnectEdge(
        oldEdge,
        {
          ...newConnection,
          sourceHandle: newConnection.sourceHandle || 'right',
          targetHandle: newConnection.targetHandle || 'left',
        },
        get().edges,
      ) as MindFlowEdge[],
    });
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
    if (get().settings.autoLayoutOnInsert) {
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
  setCanvasTheme: (canvasTheme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CANVAS_THEME_STORAGE_KEY, canvasTheme);
    }
    set({ canvasTheme });
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
    const subtreeEdges = edges.filter((edge) => subtreeNodeIds.has(edge.source) && subtreeNodeIds.has(edge.target) && !edge.hidden);
    if (subtreeNodes.length <= 1) return;

    const layoutConfig = layoutType === 'orgchart'
      ? { rankdir: 'TB' as const, nodesep: 72, ranksep: 110 }
      : layoutType === 'list'
        ? { rankdir: 'TB' as const, nodesep: 20, ranksep: 56 }
        : { rankdir: 'LR' as const, nodesep: 72, ranksep: 140 };

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

    const isVertical = layoutType === 'orgchart' || layoutType === 'list';
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
          position,
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

    const previousPositions = new Map(visibleNodes.map((node) => [node.id, node.position]));
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    const layoutConfig = nextLayoutType === 'orgchart'
      ? { rankdir: 'TB' as const, nodesep: 80, ranksep: 120 }
      : nextLayoutType === 'list'
        ? { rankdir: 'TB' as const, nodesep: 24, ranksep: 60 }
        : { rankdir: 'LR' as const, nodesep: 80, ranksep: 150 };

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

    const visibleEdges = edges.filter((edge) => !edge.hidden && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
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

    const outgoingBySource = new Map<string, string[]>();
    visibleEdges.forEach((edge) => {
      const current = outgoingBySource.get(edge.source) || [];
      current.push(edge.target);
      outgoingBySource.set(edge.source, current);
    });

    const incomingTargets = new Set(visibleEdges.map((edge) => edge.target));
    const rootNodes = visibleNodes.filter((node) => !incomingTargets.has(node.id));

    const rootAnchors = new Map<string, number>();
    rootNodes.forEach((root) => {
      const previous = previousPositions.get(root.id);
      const next = positionedByDagre.get(root.id);
      if (!previous || !next) return;
      rootAnchors.set(root.id, previous.y - next.y);
    });

    const appliedDeltaByNode = new Map<string, number>();
    rootNodes.forEach((root) => {
      const deltaY = rootAnchors.get(root.id);
      if (deltaY === undefined) return;

      const queue = [root.id];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);

        if (!appliedDeltaByNode.has(current)) {
          appliedDeltaByNode.set(current, deltaY);
        }

        const children = outgoingBySource.get(current) || [];
        children.forEach((childId) => queue.push(childId));
      }
    });

    const isVertical = nextLayoutType === 'orgchart' || nextLayoutType === 'list';
    const layoutedNodes = nodes.map((node) => {
      if (node.hidden || node.parentId) return node;

      const basePosition = positionedByDagre.get(node.id);
      if (!basePosition) return node;
      const deltaY = appliedDeltaByNode.get(node.id) || 0;

      return {
        ...node,
        targetPosition: isVertical ? Position.Top : Position.Left,
        sourcePosition: isVertical ? Position.Bottom : Position.Right,
        position: {
          x: basePosition.x,
          y: basePosition.y + deltaY,
        },
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
