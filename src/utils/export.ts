import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useFlowStore } from '../store/useFlowStore';
import { getNodeSize } from './nodeLayout';
import { MindFlowEdge, MindFlowNode } from '../types';

export const exportFlowToPdf = async (mapName: string, theme: 'light' | 'dark') => {
  const flowElement = document.querySelector('.react-flow') as HTMLElement | null;
  if (!flowElement) return;

  const store = useFlowStore.getState();
  const rfInstance = store.rfInstance;
  if (!rfInstance) return;

  const originalViewport = rfInstance.getViewport();
  const originalNodes = store.nodes as MindFlowNode[];
  const originalEdges = store.edges as MindFlowEdge[];
  const hiddenNodeIds = originalNodes.filter((node) => node.hidden).map((node) => node.id);
  const hiddenEdgeIds = originalEdges.filter((edge) => edge.hidden).map((edge) => edge.id);
  const hadHiddenNodes = hiddenNodeIds.length > 0;
  const hadHiddenEdges = hiddenEdgeIds.length > 0;

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  try {
    if (hadHiddenNodes) {
      store.setNodes((nodes) => nodes.map((node) => (node.hidden ? { ...node, hidden: false } : node)) as MindFlowNode[]);
      await waitForPaint();
    }
    if (hadHiddenEdges) {
      store.setEdges((edges) => edges.map((edge) => (edge.hidden ? { ...edge, hidden: false } : edge)) as MindFlowEdge[]);
      await waitForPaint();
    }

    const exportableNodes = (useFlowStore.getState().nodes as MindFlowNode[]).filter((node) => !node.hidden);
    if (exportableNodes.length === 0) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    exportableNodes.forEach((node) => {
      const { width, height } = getNodeSize(node);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    });

    const padding = 120;
    const boundsWidth = Math.max(1, Math.ceil(maxX - minX));
    const boundsHeight = Math.max(1, Math.ceil(maxY - minY));
    const boundsX = Math.floor(minX - padding);
    const boundsY = Math.floor(minY - padding);

    await rfInstance.fitBounds(
      {
        x: boundsX,
        y: boundsY,
        width: boundsWidth + padding * 2,
        height: boundsHeight + padding * 2,
      },
      { padding: 0.02, duration: 0 },
    );
    await waitForPaint();

    flowElement.classList.add('mf-exporting');

    const dataUrl = await toPng(flowElement, {
      backgroundColor: theme === 'dark' ? '#020617' : '#f8fafc',
      pixelRatio: 3,
      cacheBust: true,
    });

    flowElement.classList.remove('mf-exporting');

    const exportWidth = flowElement.clientWidth;
    const exportHeight = flowElement.clientHeight;

    const pdf = new jsPDF({
      orientation: exportWidth > exportHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [exportWidth, exportHeight],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, exportWidth, exportHeight);
    pdf.save(`${mapName || 'mindmap'}.pdf`);
  } finally {
    flowElement.classList.remove('mf-exporting');
    await rfInstance.setViewport(originalViewport, { duration: 0 });

    if (hadHiddenNodes) {
      store.setNodes((nodes) =>
        nodes.map((node) => (hiddenNodeIds.includes(node.id) ? { ...node, hidden: true } : node)) as MindFlowNode[],
      );
    }
    if (hadHiddenEdges) {
      store.setEdges((edges) =>
        edges.map((edge) => (hiddenEdgeIds.includes(edge.id) ? { ...edge, hidden: true } : edge)) as MindFlowEdge[],
      );
    }
  }
};
