import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowInstance,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { MapData, MindFlowNode, MindFlowEdge } from '../types';

interface FlowState {
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  mapName: string;
  mapId: string;
  theme: 'dark' | 'light';
  showMinimap: boolean;
  showStylePanel: boolean;
  currentView: 'projects' | 'editor';
  rfInstance: ReactFlowInstance | null;
  history: { nodes: MindFlowNode[]; edges: MindFlowEdge[] }[];
  historyIndex: number;
  
  onNodesChange: OnNodesChange<MindFlowNode>;
  onEdgesChange: OnEdgesChange<MindFlowEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: MindFlowNode[] | ((nodes: MindFlowNode[]) => MindFlowNode[])) => void;
  setEdges: (edges: MindFlowEdge[] | ((edges: MindFlowEdge[]) => MindFlowEdge[])) => void;
  addNode: (node: MindFlowNode) => void;
  updateNodeData: (id: string, data: Partial<MindFlowNode['data']>) => void;
  deleteElements: (nodesToRemove: MindFlowNode[], edgesToRemove: MindFlowEdge[]) => void;
  setMapName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setShowMinimap: (show: boolean) => void;
  setShowStylePanel: (show: boolean) => void;
  setCurrentView: (view: 'projects' | 'editor') => void;
  setRfInstance: (instance: ReactFlowInstance | null) => void;
  
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  loadMap: (mapData: MapData) => void;
}

const initialNodes: MindFlowNode[] = [
  {
    id: 'root',
    type: 'idea',
    position: { x: 250, y: 250 },
    data: { label: 'Nova Ideia', color: '#8B5CF6' },
  },
];

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  mapName: 'Meu Mapa Mental',
  mapId: uuidv4(),
  theme: 'light',
  showMinimap: false,
  showStylePanel: false,
  currentView: 'projects',
  rfInstance: null,
  history: [{ nodes: initialNodes, edges: [] }],
  historyIndex: 0,

  onNodesChange: (changes: NodeChange<MindFlowNode>[]) => {
    set({
      nodes: applyNodeChanges(changes as any, get().nodes) as MindFlowNode[],
    });
  },
  onEdgesChange: (changes: EdgeChange<MindFlowEdge>[]) => {
    set({
      edges: applyEdgeChanges(changes as any, get().edges) as MindFlowEdge[],
    });
  },
  onConnect: (connection: Connection) => {
    get().pushHistory();
    set({
      edges: addEdge({ ...connection, type: 'animated', animated: true }, get().edges) as MindFlowEdge[],
    });
  },
  setNodes: (nodes) => {
    set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes });
  },
  setEdges: (edges) => {
    set({ edges: typeof edges === 'function' ? edges(get().edges) : edges });
  },
  addNode: (node) => {
    get().pushHistory();
    set({ nodes: [...get().nodes, node] });
  },
  updateNodeData: (id, data) => {
    get().pushHistory();
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  deleteElements: (nodesToRemove, edgesToRemove) => {
    get().pushHistory();
    const nodeIds = nodesToRemove.map((n) => n.id);
    const edgeIds = edgesToRemove.map((e) => e.id);
    set({
      nodes: get().nodes.filter((n) => !nodeIds.includes(n.id)),
      edges: get().edges.filter((e) => !edgeIds.includes(e.id)),
    });
  },
  setMapName: (name) => set({ mapName: name }),
  setTheme: (theme) => set({ theme }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setShowStylePanel: (show) => set({ showStylePanel: show }),
  setCurrentView: (view) => set({ currentView: view }),
  setRfInstance: (instance) => set({ rfInstance: instance }),

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes, edges });
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
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
  loadMap: (mapData) => {
    set({
      nodes: mapData.nodes,
      edges: mapData.edges,
      mapName: mapData.name,
      mapId: mapData.id,
      history: [{ nodes: mapData.nodes, edges: mapData.edges }],
      historyIndex: 0,
    });
  }
}));
