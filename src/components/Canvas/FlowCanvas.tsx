import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  Node,
  SelectionMode,
  ConnectionMode,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronLeft, ChevronRight, Download, PanelRight, Trash2, Unlink2, X } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { IdeaNode } from '../Nodes/IdeaNode';
import { FunnelNode } from '../Nodes/FunnelNode';
import { GroupNode } from '../Nodes/GroupNode';
import { NoteNode } from '../Nodes/NoteNode';
import { ImageNode } from '../Nodes/ImageNode';
import { AnimatedEdge } from '../Edges/AnimatedEdge';
import { FunnelEdge } from '../Edges/FunnelEdge';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { v4 as uuidv4 } from 'uuid';
import { NodeType, MindFlowEdge, MindFlowNode } from '../../types';
import { exportFlowToPdf } from '../../utils/export';
import { getNextRootIdeaColor, getNodeSize, isDescendant, resolveNodeCollision } from '../../utils/nodeLayout';
import { captureNodesIntoGroup, fitGroupToChildren } from '../../utils/grouping';

const nodeTypes = {
  idea: IdeaNode,
  funnel: FunnelNode,
  group: GroupNode,
  note: NoteNode,
  image: ImageNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
  funnel: FunnelEdge,
};

const CANVAS_POINTER_EVENT = 'mindflow:canvas-pointerdown';

const FREE_MOVE_NODE_TYPES: NodeType[] = ['note', 'image', 'funnel'];
const ALIGNMENT_THRESHOLD = 14;

type AlignmentGuides = {
  x: number | null;
  y: number | null;
};

type NodeContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
};

const FlowCanvasInner = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    setRfInstance,
    addNode,
    setNodes,
    setEdges,
    pushHistory,
    setDragState,
    draggedNodeId,
    dropTargetId,
    cleanMode,
    focusModeEnabled,
    selectionModeEnabled,
    setSelectionModeEnabled,
    setShowStylePanel,
    deleteElements,
    setSaveStatus,
    theme,
    showMinimap,
    presentationMode,
    presentationNodeIds,
    presentationIndex,
    prevPresentationStep,
    nextPresentationStep,
    stopPresentation,
    mapName,
  } = useFlowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, getIntersectingNodes } = useReactFlow();
  const { x: viewportX, y: viewportY, zoom: viewportZoom } = useViewport();
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({ x: null, y: null });
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<NodeContextMenuState | null>(null);

  useKeyboardShortcuts();

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected && !node.hidden), [nodes]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const focusNodeIds = useMemo(() => {
    if (!focusModeEnabled || !selectedNode) return null;

    const related = new Set<string>([selectedNode.id]);
    const stack = [selectedNode.id];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      edges.forEach((edge) => {
        if (edge.source === current && !related.has(edge.target)) {
          related.add(edge.target);
          stack.push(edge.target);
        }
        if (edge.target === current && !related.has(edge.source)) {
          related.add(edge.source);
          stack.push(edge.source);
        }
      });
    }
    return related;
  }, [edges, focusModeEnabled, selectedNode]);

  const nodesWithDragState = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className: [
          node.className,
          node.id === draggedNodeId ? 'mf-node-dragging' : '',
          node.id === dropTargetId ? 'mf-node-drop-target' : '',
          focusNodeIds && focusNodeIds.has(node.id) ? 'mf-node-focus-active' : '',
          focusNodeIds && !focusNodeIds.has(node.id) ? 'mf-node-muted' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [nodes, draggedNodeId, dropTargetId, focusNodeIds],
  );

  const dropTargetNode = useMemo(
    () => (dropTargetId ? nodes.find((node) => node.id === dropTargetId) : null),
    [dropTargetId, nodes],
  );
  const contextMenuNode = useMemo(
    () => (nodeContextMenu ? nodes.find((node) => node.id === nodeContextMenu.nodeId) || null : null),
    [nodeContextMenu, nodes],
  );
  const contextMenuEdge = useMemo(
    () => (edgeContextMenu ? edges.find((edge) => edge.id === edgeContextMenu.nodeId) || null : null),
    [edgeContextMenu, edges],
  );

  const handlePresentationExport = useCallback(async () => {
    try {
      await exportFlowToPdf(mapName, theme);
    } catch (error) {
      console.error('Error exporting PDF in presentation mode:', error);
    }
  }, [mapName, theme]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (presentationMode) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [presentationMode]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (presentationMode) return;
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const dropPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const currentNodes = getNodes() as MindFlowNode[];

      const position = resolveNodeCollision({
        basePosition: dropPosition,
        nodeType: type,
        nodes: currentNodes,
      });

      const newNodeId = uuidv4();
      const baseLabel = { idea: 'Nova Ideia', funnel: 'Novo Funil', group: 'Novo Grupo', note: 'Nova Nota', image: 'Nova Imagem' }[type] || 'Novo Nó';
      const baseColor =
        type === 'idea' ? getNextRootIdeaColor(currentNodes, edges) : type === 'note' ? '#F59E0B' : type === 'image' ? '#0EA5E9' : '#DC2626';
      const newNode: MindFlowNode = {
        id: newNodeId,
        type,
        position,
        data: {
          label: baseLabel,
          color: baseColor,
          ...(type === 'note' ? { noteVariant: 'sticky', notePriority: 'medium', noteChecklist: '', notePinned: false } : {}),
          ...(type === 'group' ? { groupVariant: 'glass', groupPadding: 24, groupWidth: 420, groupHeight: 280 } : {}),
          ...(type === 'image'
            ? { imageFit: 'cover', imageFrame: 'rounded', imageFilter: 'none', imageCaptionAlign: 'center', imageShowDomain: true }
            : {}),
        },
      };

      addNode(newNode);
    },
    [presentationMode, screenToFlowPosition, addNode, getNodes, edges],
  );

  const findDropTarget = useCallback(
    (draggedNode: Node, currentNodes: Node[]) => {
      const draggedType = (draggedNode as MindFlowNode).type as NodeType;
      if (draggedType === 'group') return null;
      const isFreeMoveNode = FREE_MOVE_NODE_TYPES.includes(draggedType);

      const isValidTarget = (candidateNode: Node) => {
        if (candidateNode.id === draggedNode.id) return false;
        const candidateType = (candidateNode as MindFlowNode).type as NodeType;
        if (draggedType === 'idea' && !['idea', 'group'].includes(candidateType)) return false;
        if (isFreeMoveNode && candidateType !== 'group') return false;
        if (isDescendant(candidateNode.id, draggedNode.id, edges)) return false;
        return true;
      };

      const getCenter = (node: Node) => {
        const size = getNodeSize(node as MindFlowNode);
        return {
          x: node.position.x + size.width / 2,
          y: node.position.y + size.height / 2,
        };
      };

      const draggedCenter = getCenter(draggedNode);
      const intersections = getIntersectingNodes(draggedNode).filter(isValidTarget);
      if (intersections.length > 0) {
        return intersections.sort((a, b) => {
          const centerA = getCenter(a);
          const centerB = getCenter(b);
          const distanceA = Math.hypot(centerA.x - draggedCenter.x, centerA.y - draggedCenter.y);
          const distanceB = Math.hypot(centerB.x - draggedCenter.x, centerB.y - draggedCenter.y);
          return distanceA - distanceB;
        })[0];
      }

      let bestTarget: Node | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      const magneticThreshold = isFreeMoveNode ? 110 : 190;

      const draggedSize = getNodeSize(draggedNode as MindFlowNode);
      const draggedRect = {
        left: draggedNode.position.x,
        top: draggedNode.position.y,
        right: draggedNode.position.x + draggedSize.width,
        bottom: draggedNode.position.y + draggedSize.height,
      };
      const draggedCenterX = (draggedRect.left + draggedRect.right) / 2;
      const draggedCenterY = (draggedRect.top + draggedRect.bottom) / 2;

      currentNodes.forEach((candidateNode) => {
        if (!isValidTarget(candidateNode)) return;

        const candidateSize = getNodeSize(candidateNode as MindFlowNode);
        const candidateRect = {
          left: candidateNode.position.x,
          top: candidateNode.position.y,
          right: candidateNode.position.x + candidateSize.width,
          bottom: candidateNode.position.y + candidateSize.height,
        };

        const tolerance = isFreeMoveNode ? 14 : 28;
        const expandedCandidateRect = {
          left: candidateRect.left - tolerance,
          top: candidateRect.top - tolerance,
          right: candidateRect.right + tolerance,
          bottom: candidateRect.bottom + tolerance,
        };

        const centerInside =
          draggedCenterX >= expandedCandidateRect.left &&
          draggedCenterX <= expandedCandidateRect.right &&
          draggedCenterY >= expandedCandidateRect.top &&
          draggedCenterY <= expandedCandidateRect.bottom;

        const overlapWidth = Math.max(
          0,
          Math.min(draggedRect.right, expandedCandidateRect.right) - Math.max(draggedRect.left, expandedCandidateRect.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(draggedRect.bottom, expandedCandidateRect.bottom) - Math.max(draggedRect.top, expandedCandidateRect.top),
        );
        const overlapArea = overlapWidth * overlapHeight;

        const targetCenterX = (candidateRect.left + candidateRect.right) / 2;
        const targetCenterY = (candidateRect.top + candidateRect.bottom) / 2;
        const distance = Math.hypot(targetCenterX - draggedCenterX, targetCenterY - draggedCenterY);
        const isNear = distance <= magneticThreshold;

        if (!centerInside && overlapArea === 0 && !isNear) return;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = candidateNode;
        }
      });

      return bestTarget;
    },
    [edges, getIntersectingNodes],
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node, currentNodes: Node[]) => {
      const store = useFlowStore.getState();
      const liveEdges = store.edges;
      const typedCurrentNodes = currentNodes as MindFlowNode[];
      const draggedType = (node as MindFlowNode).type as NodeType;
      if (draggedType === 'group') {
        setDragState(null, null);
        setAlignmentGuides({ x: null, y: null });
        return;
      }
      const shouldKeepFreeMove = FREE_MOVE_NODE_TYPES.includes(draggedType);
      const trackedDropTarget = dropTargetId ? typedCurrentNodes.find((currentNode) => currentNode.id === dropTargetId) : null;
      const closestNode = trackedDropTarget || findDropTarget(node, typedCurrentNodes);
      let shouldAutoLayout = false;

      if (closestNode && (closestNode as MindFlowNode).type === 'group') {
        const captureResult = captureNodesIntoGroup({
          nodes: typedCurrentNodes,
          groupId: closestNode.id,
          nodeIds: [node.id],
        });
        if (captureResult.changed) {
          const fitResult = fitGroupToChildren({
            nodes: captureResult.nodes,
            groupId: closestNode.id,
          });
          store.pushHistory();
          store.setSaveStatus('unsaved');
          store.setNodes(fitResult.nodes);
        }
        setDragState(null, null);
        setAlignmentGuides({ x: null, y: null });
        return;
      }

      if (draggedType === 'idea' && closestNode && !isDescendant(closestNode.id, node.id, liveEdges)) {
        const newEdge: MindFlowEdge = {
          id: `e-${closestNode.id}-${node.id}-${uuidv4()}`,
          source: closestNode.id,
          sourceHandle: 'right',
          target: node.id,
          targetHandle: 'left',
          type: 'animated',
        };

        const edgesToKeep = liveEdges.filter((edge) => edge.target !== node.id);
        const existingEdge = liveEdges.find((edge) => edge.target === node.id);
        const parentChanged = !existingEdge || existingEdge.source !== closestNode.id;

        if (parentChanged) {
          store.pushHistory();
          store.setEdges([...edgesToKeep, newEdge]);
          store.setSaveStatus('unsaved');
        }

        // Always auto-layout when dropped on a target (re-parent or same parent)
        shouldAutoLayout = true;
      }

      setDragState(null, null);
      setAlignmentGuides({ x: null, y: null });
      if (shouldAutoLayout) {
        requestAnimationFrame(() => {
          useFlowStore.getState().autoLayout();
        });
      }
    },
    [dropTargetId, findDropTarget, setDragState],
  );

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setNodeContextMenu(null);
      setEdgeContextMenu(null);
      pushHistory();
      setDragState(node.id, null);
      setAlignmentGuides({ x: null, y: null });
    },
    [pushHistory, setDragState],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node, currentNodes: Node[]) => {
      const draggedAsNode = node as MindFlowNode;
      if (draggedAsNode.type === 'group') {
        setDragState(node.id, null);
        setAlignmentGuides({ x: null, y: null });
        return;
      }
      const closestNode = findDropTarget(node, currentNodes);

      setDragState(node.id, closestNode ? closestNode.id : null);
      const typedCurrentNodes = currentNodes as MindFlowNode[];
      const draggedSize = getNodeSize(draggedAsNode);
      const draggedCenterX = node.position.x + draggedSize.width / 2;
      const draggedCenterY = node.position.y + draggedSize.height / 2;

      let snapCenterX: number | null = null;
      let snapCenterY: number | null = null;
      let bestXDelta = Number.POSITIVE_INFINITY;
      let bestYDelta = Number.POSITIVE_INFINITY;

      typedCurrentNodes.forEach((candidate) => {
        if (candidate.id === node.id || candidate.hidden) return;
        const candidateSize = getNodeSize(candidate);
        const candidateCenterX = candidate.position.x + candidateSize.width / 2;
        const candidateCenterY = candidate.position.y + candidateSize.height / 2;

        const dx = Math.abs(candidateCenterX - draggedCenterX);
        const dy = Math.abs(candidateCenterY - draggedCenterY);

        if (dx <= ALIGNMENT_THRESHOLD && dx < bestXDelta) {
          bestXDelta = dx;
          snapCenterX = candidateCenterX;
        }
        if (dy <= ALIGNMENT_THRESHOLD && dy < bestYDelta) {
          bestYDelta = dy;
          snapCenterY = candidateCenterY;
        }
      });

      setAlignmentGuides({ x: snapCenterX, y: snapCenterY });

      if (snapCenterX !== null || snapCenterY !== null) {
        setNodes((nodesState) =>
          nodesState.map((item) => {
            if (item.id !== node.id) return item;
            return {
              ...item,
              position: {
                x: snapCenterX !== null ? snapCenterX - draggedSize.width / 2 : item.position.x,
                y: snapCenterY !== null ? snapCenterY - draggedSize.height / 2 : item.position.y,
              },
            };
          }),
        );
      }
    },
    [findDropTarget, setDragState, edges, setNodes],
  );

  const totalPresentationSteps = presentationNodeIds.length;
  const currentPresentationStep = totalPresentationSteps > 0 ? presentationIndex + 1 : 0;
  const handleSelectionEnd = useCallback(() => {
    if (!selectionModeEnabled) return;
    setSelectionModeEnabled(false);
  }, [selectionModeEnabled, setSelectionModeEnabled]);

  const handlePaneClick = useCallback(() => {
    setNodeContextMenu(null);
    setEdgeContextMenu(null);
    setShowStylePanel(false);
  }, [setShowStylePanel]);

  const getSafeContextMenuPosition = useCallback((clientX: number, clientY: number, menuWidth: number, menuHeight: number) => {
    const wrapperRect = reactFlowWrapper.current?.getBoundingClientRect();
    const offsetX = wrapperRect ? clientX - wrapperRect.left : clientX;
    const offsetY = wrapperRect ? clientY - wrapperRect.top : clientY;
    return {
      x: wrapperRect ? Math.min(offsetX, Math.max(16, wrapperRect.width - menuWidth - 16)) : offsetX,
      y: wrapperRect ? Math.min(offsetY, Math.max(16, wrapperRect.height - menuHeight - 16)) : offsetY,
    };
  }, []);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (presentationMode) return;
      event.preventDefault();
      event.stopPropagation();

      const { x: safeX, y: safeY } = getSafeContextMenuPosition(event.clientX, event.clientY, 208, 152);

      setNodes((currentNodes) =>
        currentNodes.map((item) => ({
          ...item,
          selected: item.id === node.id,
        }) as MindFlowNode),
      );
      setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: false }) as MindFlowEdge));

      setEdgeContextMenu(null);
      setNodeContextMenu({
        nodeId: node.id,
        x: safeX,
        y: safeY,
      });
    },
    [getSafeContextMenuPosition, presentationMode, setEdges, setNodes],
  );

  const handleNodeClick = useCallback(() => {
    setNodeContextMenu(null);
    setEdgeContextMenu(null);
  }, []);

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: MindFlowEdge) => {
      if (presentationMode) return;
      event.preventDefault();
      event.stopPropagation();

      const { x: safeX, y: safeY } = getSafeContextMenuPosition(event.clientX, event.clientY, 228, 208);

      setNodes((currentNodes) => currentNodes.map((item) => ({ ...item, selected: false }) as MindFlowNode));
      setEdges((currentEdges) =>
        currentEdges.map((item) => ({
          ...item,
          selected: item.id === edge.id,
        }) as MindFlowEdge),
      );

      setNodeContextMenu(null);
      setEdgeContextMenu({
        nodeId: edge.id,
        x: safeX,
        y: safeY,
      });
    },
    [getSafeContextMenuPosition, presentationMode, setEdges, setNodes],
  );

  const handleEdgeClick = useCallback(() => {
    setNodeContextMenu(null);
    setEdgeContextMenu(null);
    useFlowStore.getState().setShowStylePanel(true);
  }, []);

  const handleOpenProperties = useCallback(() => {
    if (!contextMenuNode) return;
    setNodes((currentNodes) =>
      currentNodes.map((item) => ({
        ...item,
        selected: item.id === contextMenuNode.id,
      }) as MindFlowNode),
    );
    setShowStylePanel(true);
    setNodeContextMenu(null);
  }, [contextMenuNode, setNodes, setShowStylePanel]);

  const handleOpenEdgeProperties = useCallback(() => {
    if (!contextMenuEdge) return;
    setNodes((currentNodes) => currentNodes.map((item) => ({ ...item, selected: false }) as MindFlowNode));
    setEdges((currentEdges) =>
      currentEdges.map((item) => ({
        ...item,
        selected: item.id === contextMenuEdge.id,
      }) as MindFlowEdge),
    );
    setShowStylePanel(true);
    setEdgeContextMenu(null);
  }, [contextMenuEdge, setEdges, setNodes, setShowStylePanel]);

  const handleDisconnectNode = useCallback(() => {
    if (!contextMenuNode) return;
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== contextMenuNode.id && edge.target !== contextMenuNode.id));
    setNodeContextMenu(null);
  }, [contextMenuNode, pushHistory, setEdges, setSaveStatus]);

  const handleDeleteNode = useCallback(() => {
    if (!contextMenuNode) return;
    deleteElements([contextMenuNode], []);
    setNodeContextMenu(null);
  }, [contextMenuNode, deleteElements]);

  const handleDeleteEdge = useCallback(() => {
    if (!contextMenuEdge) return;
    deleteElements([], [contextMenuEdge]);
    setEdgeContextMenu(null);
  }, [contextMenuEdge, deleteElements]);

  const handleSetEdgeVariant = useCallback(
    (variant: 'solid' | 'dashed' | 'glow') => {
      if (!contextMenuEdge) return;
      pushHistory();
      setSaveStatus('unsaved');
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === contextMenuEdge.id ? ({ ...edge, data: { ...edge.data, variant } } as MindFlowEdge) : edge,
        ),
      );
      setEdgeContextMenu(null);
    },
    [contextMenuEdge, pushHistory, setEdges, setSaveStatus],
  );

  const edgesWithFocusState = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        className: [
          edge.className,
          focusNodeIds && focusNodeIds.has(edge.source) && focusNodeIds.has(edge.target) ? 'mf-edge-focus-active' : '',
          focusNodeIds && !focusNodeIds.has(edge.source) && !focusNodeIds.has(edge.target) ? 'mf-edge-muted' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [edges, focusNodeIds],
  );

  return (
    <div
      className="relative h-full w-full flex-1 overflow-hidden"
      ref={reactFlowWrapper}
      onPointerDownCapture={() => {
        window.dispatchEvent(new CustomEvent(CANVAS_POINTER_EVENT));
      }}
    >
      <ReactFlow
        nodes={nodesWithDragState}
        edges={edgesWithFocusState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={() => useFlowStore.getState().setShowStylePanel(true)}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeClick={handleEdgeClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 0.9 }}
        className={`bg-slate-50 transition-colors duration-300 dark:bg-slate-950 ${selectionModeEnabled ? 'mf-selection-mode' : 'mf-navigation-mode'} ${cleanMode ? 'mf-clean-mode' : ''} ${focusModeEnabled ? 'mf-focus-mode' : ''} ${focusNodeIds ? 'mf-focus-engaged' : ''}`}
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{ type: 'animated' }}
        edgesReconnectable={!presentationMode}
        deleteKeyCode={null}
        paneClickDistance={6}
        nodeClickDistance={6}
        nodeDragThreshold={3}
        selectionMode={SelectionMode.Partial}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={44}
        elementsSelectable={!presentationMode}
        nodesDraggable={!presentationMode && !selectionModeEnabled}
        nodesConnectable={!presentationMode}
        selectNodesOnDrag={!selectionModeEnabled}
        selectionOnDrag={!presentationMode && selectionModeEnabled}
        onSelectionEnd={handleSelectionEnd}
        onPaneClick={handlePaneClick}
        panOnDrag={!presentationMode && !selectionModeEnabled}
        panOnScroll
        panOnScrollSpeed={0.65}
        zoomOnDoubleClick={!presentationMode}
        onlyRenderVisibleElements
      >
        {!presentationMode && !cleanMode && <Controls />}
        {showMinimap && !presentationMode && !cleanMode && (
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { color?: string };
              return data?.color || (theme === 'dark' ? '#475569' : '#e2e8f0');
            }}
            maskColor={theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(248, 250, 252, 0.8)'}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        )}
        {!presentationMode && draggedNodeId && dropTargetNode && (
          <Panel position="top-center">
            <div className="rounded-full border border-blue-300/60 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-700 backdrop-blur dark:border-blue-300/30 dark:bg-blue-500/15 dark:text-blue-200">
              {(dropTargetNode.type as NodeType) === 'group'
                ? `Solte para agrupar em: ${String(dropTargetNode.data.label || 'Grupo')}`
                : `Solte para mover para: ${String(dropTargetNode.data.label || 'Novo nó')}`}
            </div>
          </Panel>
        )}
        {presentationMode && (
          <Panel position="top-right">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
              <button
                onClick={prevPresentationStep}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="Etapa anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {currentPresentationStep}/{totalPresentationSteps || 0}
              </span>
              <button
                onClick={nextPresentationStep}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="Proxima etapa"
              >
                <ChevronRight size={14} />
              </button>
              <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={handlePresentationExport}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="Exportar PDF"
              >
                <Download size={14} />
              </button>
              <button
                onClick={stopPresentation}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                title="Sair da apresentacao"
              >
                <X size={14} />
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
      {nodeContextMenu && contextMenuNode && (
        <div
          className="absolute z-[70] min-w-[208px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
        >
          <div className="border-b border-slate-200 px-2.5 pb-2 pt-1 dark:border-slate-700">
            <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {String(contextMenuNode.data.label || 'Nó sem título')}
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
              {contextMenuNode.type}
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            <button
              onClick={handleOpenProperties}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <PanelRight size={14} />
              Abrir propriedades
            </button>
            <button
              onClick={handleDisconnectNode}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Unlink2 size={14} />
              Desconectar
            </button>
            <button
              onClick={handleDeleteNode}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        </div>
      )}
      {edgeContextMenu && contextMenuEdge && (
        <div
          className="absolute z-[70] min-w-[228px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
        >
          <div className="border-b border-slate-200 px-2.5 pb-2 pt-1 dark:border-slate-700">
            <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              Conexão
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
              {contextMenuEdge.source} → {contextMenuEdge.target}
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            <button
              onClick={handleOpenEdgeProperties}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <PanelRight size={14} />
              Abrir propriedades
            </button>
            <div className="rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Trocar estilo
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'solid', label: 'Sólida' },
                  { value: 'dashed', label: 'Tracejada' },
                  { value: 'glow', label: 'Destaque' },
                ].map((variant) => (
                  <button
                    key={variant.value}
                    onClick={() => handleSetEdgeVariant(variant.value as 'solid' | 'dashed' | 'glow')}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      ((contextMenuEdge.data?.variant as string | undefined) || 'glow') === variant.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleDeleteEdge}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={14} />
              Excluir linha
            </button>
          </div>
        </div>
      )}
      {(alignmentGuides.x !== null || alignmentGuides.y !== null) && (
        <div className="pointer-events-none absolute inset-0">
          {alignmentGuides.x !== null && (
            <div
              className="absolute top-0 h-full w-px bg-cyan-400/60 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
              style={{ left: alignmentGuides.x * viewportZoom + viewportX }}
            />
          )}
          {alignmentGuides.y !== null && (
            <div
              className="absolute left-0 w-full h-px bg-cyan-400/60 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
              style={{ top: alignmentGuides.y * viewportZoom + viewportY }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export const FlowCanvas = () => {
  return <FlowCanvasInner />;
};
