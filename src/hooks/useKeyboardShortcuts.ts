import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useReactFlow } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { MindFlowNode, MindFlowEdge } from '../types';

export const useKeyboardShortcuts = () => {
  const { undo, redo, addNode, deleteElements, setNodes, setEdges, pushHistory, updateNodeData } = useFlowStore();
  const { getNodes, getEdges, fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      // Duplicate: Ctrl+D
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const selectedNodes = getNodes().filter(n => n.selected) as MindFlowNode[];
        selectedNodes.forEach(node => {
          addNode({
            ...node,
            id: uuidv4(),
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            selected: false,
          });
        });
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = getNodes().filter(n => n.selected) as MindFlowNode[];
        const selectedEdges = getEdges().filter(e => e.selected) as MindFlowEdge[];
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          deleteElements(selectedNodes, selectedEdges);
        }
      }

      // Zoom In: Ctrl++
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }

      // Zoom Out: Ctrl+-
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }

      // Fit View: Ctrl+0
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        fitView();
      }

      // TAB: Create new node connected to selected node
      if (e.key === 'Tab') {
        const selectedNodes = getNodes().filter(n => n.selected) as MindFlowNode[];
        if (selectedNodes.length === 1) {
          e.preventDefault();
          const parentNode = selectedNodes[0];
          
          const newNodeId = uuidv4();
          const newNode: MindFlowNode = {
            id: newNodeId,
            type: 'idea',
            position: { 
              x: parentNode.position.x + 250, 
              y: parentNode.position.y 
            },
            data: { label: 'Nova Ideia' },
            selected: true,
          };

          const newEdge: MindFlowEdge = {
            id: `e-${parentNode.id}-${newNodeId}`,
            source: parentNode.id,
            sourceHandle: 'right',
            target: newNodeId,
            targetHandle: 'left',
            type: 'animated',
          };

          setNodes(nodes => nodes.map(n => ({ ...n, selected: false }) as MindFlowNode).concat(newNode));
          setEdges(edges => edges.concat(newEdge));
          pushHistory();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, addNode, deleteElements, getNodes, getEdges, fitView, zoomIn, zoomOut, setNodes, setEdges, pushHistory]);
};
