import { v4 as uuidv4 } from 'uuid';
import { MapData, MindFlowEdge, MindFlowNode } from '../types';
import { getDefaultIdeaColorByDepth } from './nodeLayout';
import { normalizeMapData } from './mapSchema';

const INDENT = '  ';

const sanitizeLabel = (value: unknown) => {
  const label = String(value || '').trim();
  return label || 'Sem título';
};

const buildTree = (nodes: MindFlowNode[], edges: MindFlowEdge[]) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenBySource = new Map<string, MindFlowNode[]>();

  edges.forEach((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return;
    const currentChildren = childrenBySource.get(edge.source) || [];
    currentChildren.push(targetNode);
    childrenBySource.set(edge.source, currentChildren);
  });

  childrenBySource.forEach((children, sourceId) => {
    children.sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });
    childrenBySource.set(sourceId, children);
  });

  const targets = new Set(edges.map((edge) => edge.target));
  const roots = nodes.filter((node) => !targets.has(node.id)).sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });

  return { roots, childrenBySource };
};

export const exportMapToMarkdown = (mapName: string, nodes: MindFlowNode[], edges: MindFlowEdge[]) => {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const visibleEdges = edges.filter((edge) => !edge.hidden);
  const { roots, childrenBySource } = buildTree(visibleNodes, visibleEdges);

  const lines: string[] = [`# ${sanitizeLabel(mapName)}`, ''];
  const seen = new Set<string>();

  const walk = (node: MindFlowNode, depth: number) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    lines.push(`${INDENT.repeat(depth)}- ${sanitizeLabel(node.data.label)}`);
    const children = childrenBySource.get(node.id) || [];
    children.forEach((child) => walk(child, depth + 1));
  };

  if (roots.length === 0 && visibleNodes.length > 0) {
    visibleNodes
      .sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      })
      .forEach((node) => walk(node, 0));
  } else {
    roots.forEach((root) => walk(root, 0));
  }

  lines.push('', `> Exportado em ${new Date().toLocaleString('pt-BR')}`);
  return lines.join('\n');
};

export const parseMarkdownToMap = (markdown: string, fallbackName = 'Mapa importado'): MapData => {
  const lines = markdown.split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line));
  const mapName = heading ? heading.replace(/^#\s+/, '').trim() || fallbackName : fallbackName;

  const nodes: MindFlowNode[] = [];
  const edges: MindFlowEdge[] = [];
  const parentAtDepth: string[] = [];
  const nextYByDepth: number[] = [];

  const bulletPattern = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  lines.forEach((line) => {
    const match = line.match(bulletPattern);
    if (!match) return;
    const indentSpaces = match[1].replace(/\t/g, '  ').length;
    const depth = Math.max(0, Math.floor(indentSpaces / 2));
    const label = match[3].trim();
    if (!label) return;

    const nodeId = uuidv4();
    const y = nextYByDepth[depth] ?? depth * 20;
    nextYByDepth[depth] = y + 92;

    nodes.push({
      id: nodeId,
      type: 'idea',
      position: {
        x: 80 + depth * 260,
        y,
      },
      data: {
        label,
        color: getDefaultIdeaColorByDepth(depth),
      },
    });

    const parentId = depth > 0 ? parentAtDepth[depth - 1] : undefined;
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        sourceHandle: 'right',
        target: nodeId,
        targetHandle: 'left',
        type: 'animated',
      });
    }

    parentAtDepth[depth] = nodeId;
    parentAtDepth.length = depth + 1;
  });

  if (nodes.length === 0) {
    nodes.push({
      id: 'root',
      type: 'idea',
      position: { x: 250, y: 250 },
      data: { label: 'Nova Ideia', color: getDefaultIdeaColorByDepth(0) },
    });
  }

  return normalizeMapData({
    id: uuidv4(),
    name: mapName,
    nodes,
    edges,
    lastEdited: Date.now(),
  });
};

export const downloadTextFile = (filename: string, content: string, mimeType = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
