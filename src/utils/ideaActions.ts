import { v4 as uuidv4 } from 'uuid';
import type { MindFlowEdge, MindFlowNode } from '../types';
import { DEFAULT_EDGE_COLOR } from './colors';
import { getDefaultIdeaColorByDepth, getIncomingEdge, getNextChildBasePosition, getNodeDepth, resolveNodeCollision } from './nodeLayout';

type RelatedIdeaMode = 'child' | 'sibling';

type CreateRelatedIdeaArgs = {
  mode: RelatedIdeaMode;
  nodes: MindFlowNode[];
  edges: MindFlowEdge[];
  pushHistory: () => void;
  autoLayout: () => void;
  setNodes: (updater: (nodes: MindFlowNode[]) => MindFlowNode[]) => void;
  setEdges: (updater: (edges: MindFlowEdge[]) => MindFlowEdge[]) => void;
  setSaveStatus?: (status: 'saved' | 'saving' | 'unsaved') => void;
};

export const createRelatedIdea = ({
  mode,
  nodes,
  edges,
  pushHistory,
  autoLayout,
  setNodes,
  setEdges,
  setSaveStatus,
}: CreateRelatedIdeaArgs) => {
  const selectedNodes = nodes.filter((node) => node.selected);
  if (selectedNodes.length !== 1) return null;

  const selectedNode = selectedNodes[0];
  const incomingEdge = getIncomingEdge(selectedNode.id, edges);
  const parentId = mode === 'sibling' ? incomingEdge?.source || selectedNode.id : selectedNode.id;
  const parentNode = nodes.find((node) => node.id === parentId);
  if (!parentNode) return null;

  const parentDepth = getNodeDepth(parentNode.id, edges);
  const newNodeDepth = parentDepth + 1;
  const siblingNodes = edges
    .filter((edge) => edge.source === parentNode.id)
    .map((edge) => nodes.find((node) => node.id === edge.target))
    .filter((node): node is MindFlowNode => !!node && !node.hidden);
  const nextSiblingOrder = siblingNodes.reduce((maxOrder, node, index) => {
    const explicitOrder = typeof node.data.order === 'number' ? node.data.order : index + 1;
    return Math.max(maxOrder, explicitOrder);
  }, 0) + 1;
  const basePosition = getNextChildBasePosition({
    parentNode,
    nodes,
    edges,
  });

  const position = resolveNodeCollision({
    basePosition,
    nodeType: 'idea',
    nodes,
  });

  const newNodeId = uuidv4();
  const newNode: MindFlowNode = {
    id: newNodeId,
    type: 'idea',
    position,
    data: {
      label: '',
      color: getDefaultIdeaColorByDepth(newNodeDepth),
      isEditing: true,
      order: nextSiblingOrder,
    },
    selected: true,
  };

  const newEdge: MindFlowEdge = {
    id: `e-${parentNode.id}-${newNodeId}`,
    source: parentNode.id,
    sourceHandle: 'right',
    target: newNodeId,
    targetHandle: 'left',
    type: 'animated',
    data: {
      color: DEFAULT_EDGE_COLOR,
      thickness: '1',
    },
  };

  pushHistory();
  setSaveStatus?.('unsaved');
  setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false }) as MindFlowNode).concat(newNode));
  setEdges((currentEdges) => currentEdges.concat(newEdge));

  requestAnimationFrame(() => {
    autoLayout();
    requestAnimationFrame(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === newNodeId
            ? ({ ...node, selected: true, data: { ...node.data, isEditing: true } } as MindFlowNode)
            : ({ ...node, selected: false } as MindFlowNode),
        ),
      );
    });
  });

  return newNodeId;
};
