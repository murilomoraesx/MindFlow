import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useReactFlow } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { MindFlowNode, MindFlowEdge, NodeType } from '../types';
import { resolveNodeCollision } from '../utils/nodeLayout';
import { createRelatedIdea } from '../utils/ideaActions';
import { createPastedNode, getCopiedNodeSnapshot, setCopiedNodeSnapshot } from '../utils/nodeClipboard';

export const useKeyboardShortcuts = () => {
  const {
    undo,
    redo,
    addNode,
    deleteElements,
    setNodes,
    setEdges,
    pushHistory,
    autoLayout,
    presentationMode,
    selectionModeEnabled,
    setSelectionModeEnabled,
    startPresentation,
    stopPresentation,
    nextPresentationStep,
    prevPresentationStep,
    autoLayoutSubtree,
    updateNodeData,
    setShowCommandPalette,
    setShowHistoryPanel,
  } = useFlowStore();
  const { getNodes, getEdges, fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const store = useFlowStore.getState();

      if (e.key === 'Escape' && store.showCommandPalette) {
        e.preventDefault();
        setShowCommandPalette(false);
        return;
      }

      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Undo: Cmd/Ctrl+Z
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      // Exit Presentation Mode: Esc
      if (e.key === 'Escape' && presentationMode) {
        e.preventDefault();
        stopPresentation();
      }

      if (e.key === 'Escape' && selectionModeEnabled) {
        e.preventDefault();
        setSelectionModeEnabled(false);
      }

      if (isMod && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setShowCommandPalette(true);
      }

      if (presentationMode && e.key === 'ArrowRight') {
        e.preventDefault();
        nextPresentationStep();
      }

      if (presentationMode && e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPresentationStep();
      }

      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      if ((isMod && e.shiftKey && e.key.toLowerCase() === 'z') || (isMod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      }

      // Duplicate: Cmd/Ctrl+D
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const selectedNodes = getNodes().filter((n) => n.selected) as MindFlowNode[];
        let snapshotNodes = getNodes() as MindFlowNode[];
        selectedNodes.forEach((node) => {
          const position = resolveNodeCollision({
            basePosition: { x: node.position.x + 50, y: node.position.y + 50 },
            nodeType: node.type as NodeType,
            nodes: snapshotNodes,
          });

          const duplicatedNode = {
            ...node,
            id: uuidv4(),
            position,
            selected: false,
          };

          snapshotNodes = snapshotNodes.concat(duplicatedNode);
          addNode(duplicatedNode);
        });
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'c') {
        const selectedNodes = getNodes().filter((node) => node.selected) as MindFlowNode[];
        if (selectedNodes.length === 1) {
          e.preventDefault();
          setCopiedNodeSnapshot(selectedNodes[0]);
        }
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'v') {
        const copiedNode = getCopiedNodeSnapshot();
        if (copiedNode) {
          e.preventDefault();
          const position = resolveNodeCollision({
            basePosition: {
              x: copiedNode.position.x + 56,
              y: copiedNode.position.y + 56,
            },
            nodeType: copiedNode.type as NodeType,
            nodes: getNodes() as MindFlowNode[],
          });
          const pastedNode = createPastedNode(copiedNode, position);
          addNode(pastedNode);
          setNodes((currentNodes) =>
            currentNodes.map((currentNode) =>
              currentNode.id === pastedNode.id
                ? ({ ...currentNode, selected: true } as MindFlowNode)
                : ({ ...currentNode, selected: false } as MindFlowNode),
            ),
          );
        }
      }

      // Disconnect selected nodes: Cmd/Ctrl+Shift+D
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'd') {
        const selectedNodeIds = new Set(getNodes().filter((node) => node.selected).map((node) => node.id));
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          pushHistory();
          store.setSaveStatus('unsaved');
          setEdges((currentEdges) => currentEdges.filter((edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)));
        }
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

      // Zoom In: Cmd/Ctrl++
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }

      // Zoom Out: Cmd/Ctrl+-
      if (isMod && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }

      // Fit View: Cmd/Ctrl+0
      if (isMod && e.key === '0') {
        e.preventDefault();
        fitView();
      }

      // TAB: Create new node connected to selected node
      const createIdea = (mode: 'child' | 'sibling') =>
        !!createRelatedIdea({
          mode,
          nodes: getNodes() as MindFlowNode[],
          edges: getEdges() as MindFlowEdge[],
          pushHistory,
          autoLayout,
          setNodes,
          setEdges,
          setSaveStatus: store.setSaveStatus,
        });

      if (e.key === 'Tab' && createIdea('child')) {
        e.preventDefault();
      }

      if (!isMod && !e.shiftKey && e.key === 'Enter' && createIdea('sibling')) {
        e.preventDefault();
      }

      // Cmd/Ctrl+S: Force save
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Save is handled by auto-save, just provide feedback
        useFlowStore.getState().setSaveStatus('saving');
      }

      // Cmd/Ctrl+E: Toggle style panel
      if (isMod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const store = useFlowStore.getState();
        store.setShowStylePanel(!store.showStylePanel);
      }

      // Cmd/Ctrl+M: Toggle minimap
      if (isMod && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const store = useFlowStore.getState();
        store.setShowMinimap(!store.showMinimap);
      }

      // Cmd/Ctrl+H: Toggle history panel
      if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHistoryPanel(!store.showHistoryPanel);
      }

      // Cmd/Ctrl+L: Auto layout
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        autoLayout({ recordHistory: true });
      }

      // Cmd/Ctrl+Shift+L: Auto layout subtree
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'l') {
        const selected = getNodes().filter((node) => node.selected) as MindFlowNode[];
        if (selected.length === 1) {
          e.preventDefault();
          autoLayoutSubtree(selected[0].id);
        }
      }

      // Cmd/Ctrl+Shift+A: Toggle area selection mode
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectionModeEnabled(!selectionModeEnabled);
      }

      // Cmd/Ctrl+Shift+P: Enter/exit presentation mode
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (presentationMode) {
          stopPresentation();
        } else {
          startPresentation();
        }
      }

      // Cmd/Ctrl+1: Zoom to fit selected nodes
      if (isMod && e.key === '1') {
        e.preventDefault();
        const selected = getNodes().filter(n => n.selected);
        if (selected.length > 0) {
          fitView({ nodes: selected, padding: 0.5 });
        }
      }

      // F2: Rename selected node
      if (!isMod && e.key === 'F2') {
        const selected = getNodes().filter((node) => node.selected) as MindFlowNode[];
        if (selected.length === 1) {
          e.preventDefault();
          updateNodeData(selected[0].id, { isEditing: true }, true);
        }
      }

      // ?: Show shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        store.setShowShortcutsModal(!store.showShortcutsModal);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    addNode,
    deleteElements,
    getNodes,
    getEdges,
    fitView,
    zoomIn,
    zoomOut,
    setNodes,
    setEdges,
    pushHistory,
    autoLayout,
    autoLayoutSubtree,
    updateNodeData,
    setShowCommandPalette,
    setShowHistoryPanel,
    presentationMode,
    selectionModeEnabled,
    setSelectionModeEnabled,
    startPresentation,
    stopPresentation,
    nextPresentationStep,
    prevPresentationStep,
  ]);
};
