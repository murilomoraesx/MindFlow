import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '../../store/useFlowStore';
import { IdeaNode } from '../Nodes/IdeaNode';
import { FunnelNode } from '../Nodes/FunnelNode';
import { GroupNode } from '../Nodes/GroupNode';
import { NoteNode } from '../Nodes/NoteNode';
import { ImageNode } from '../Nodes/ImageNode';
import { AnimatedEdge } from '../Edges/AnimatedEdge';
import { FunnelEdge } from '../Edges/FunnelEdge';
import { v4 as uuidv4 } from 'uuid';
import { NodeType } from '../../types';

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

const FlowCanvasInner = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setRfInstance,
    addNode,
    setNodes,
    setEdges,
    pushHistory,
    theme,
    showMinimap,
  } = useFlowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = uuidv4();
      const newNode = {
        id: newNodeId,
        type,
        position,
        data: { label: `Novo ${type}`, color: '#8B5CF6' },
      };

      // Magnetic connection logic
      const currentNodes = getNodes();
      const selectedNodes = currentNodes.filter(n => n.selected);
      
      let targetNodeToConnect = null;

      if (selectedNodes.length === 1) {
        targetNodeToConnect = selectedNodes[0];
      } else if (currentNodes.length > 0) {
        // Find closest node
        let minDistance = Infinity;
        let closestNode = null;
        
        currentNodes.forEach(node => {
          const dx = node.position.x - position.x;
          const dy = node.position.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance && distance < 400) { // Only connect if within 400px
            minDistance = distance;
            closestNode = node;
          }
        });
        
        targetNodeToConnect = closestNode;
      }

      if (targetNodeToConnect) {
        const newEdge = {
          id: `e-${targetNodeToConnect.id}-${newNodeId}`,
          source: targetNodeToConnect.id,
          sourceHandle: 'right',
          target: newNodeId,
          targetHandle: 'left',
          type: 'animated',
        };
        
        addNode(newNode);
        setEdges(edges => edges.concat(newEdge));
      } else {
        addNode(newNode);
      }
    },
    [screenToFlowPosition, addNode, getNodes, setEdges]
  );

  return (
    <div className="flex-1 h-full w-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDoubleClick={() => useFlowStore.getState().setShowStylePanel(true)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{ type: 'animated' }}
      >
        <Background color={theme === 'dark' ? '#334155' : '#cbd5e1'} gap={24} size={1} />
        <Controls className="bg-white border-slate-200 fill-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:fill-slate-400" />
        {showMinimap && (
          <MiniMap
            nodeColor={(n) => theme === 'dark' ? '#475569' : '#e2e8f0'}
            maskColor={theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(248, 250, 252, 0.8)'}
            className="bg-white border-slate-200 rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800"
          />
        )}
      </ReactFlow>
    </div>
  );
};

export const FlowCanvas = () => {
  return <FlowCanvasInner />;
};
