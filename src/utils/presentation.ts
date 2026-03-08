import type { MindFlowNode } from '../types';

const getCreationOrderValue = (node: MindFlowNode, fallbackIndex = 0) => {
  return Number.isFinite(node.data.creationOrder) ? Number(node.data.creationOrder) : fallbackIndex;
};

export const ensureNodeCreationOrder = (nodes: MindFlowNode[]) => {
  let nextOrder =
    nodes.reduce((max, node, index) => Math.max(max, getCreationOrderValue(node, index + 1)), 0) || 0;

  let changed = false;
  const nextNodes = nodes.map((node, index) => {
    if (Number.isFinite(node.data.creationOrder)) return node;
    nextOrder += 1;
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        creationOrder: nextOrder || index + 1,
        presentationIncluded: node.data.presentationIncluded !== false,
        presentationAutoOrder: node.data.presentationAutoOrder !== false,
      },
    };
  });

  return changed ? nextNodes : nodes;
};

const getPresentationRank = (node: MindFlowNode, fallbackIndex = 0) => {
  if (node.data.presentationIncluded === false) return Number.MAX_SAFE_INTEGER;
  if (node.data.presentationAutoOrder === false && Number.isFinite(node.data.presentationOrder)) {
    return Number(node.data.presentationOrder);
  }
  return getCreationOrderValue(node, fallbackIndex);
};

export const getPresentationSequence = (
  nodes: MindFlowNode[],
  options: { selectedPreference?: boolean } = {},
) => {
  const selectedPreference = options.selectedPreference !== false;
  const normalizedNodes = ensureNodeCreationOrder(nodes);
  const visibleNodes = normalizedNodes.filter((node) => !node.hidden && node.data.presentationIncluded !== false);
  const selectedVisibleNodes = visibleNodes.filter((node) => node.selected);
  const baseList = selectedPreference && selectedVisibleNodes.length > 0 ? selectedVisibleNodes : visibleNodes;

  return [...baseList].sort((a, b) => {
    const aRank = getPresentationRank(a);
    const bRank = getPresentationRank(b);
    if (aRank !== bRank) return aRank - bRank;

    const aCreation = getCreationOrderValue(a);
    const bCreation = getCreationOrderValue(b);
    if (aCreation !== bCreation) return aCreation - bCreation;

    return String(a.id).localeCompare(String(b.id));
  });
};

const materializeManualPresentation = (nodes: MindFlowNode[]) => {
  const sequence = getPresentationSequence(nodes, { selectedPreference: false });
  const positionById = new Map(sequence.map((node, index) => [node.id, index + 1]));

  return ensureNodeCreationOrder(nodes).map((node) => {
    if (!positionById.has(node.id)) return node;
    return {
      ...node,
      data: {
        ...node.data,
        presentationIncluded: true,
        presentationAutoOrder: false,
        presentationOrder: positionById.get(node.id),
      },
    };
  });
};

export const setNodePresentationIncluded = (nodes: MindFlowNode[], nodeId: string, included: boolean) => {
  const normalizedNodes = ensureNodeCreationOrder(nodes);
  return normalizedNodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            presentationIncluded: included,
          },
        }
      : node,
  );
};

export const setNodePresentationAuto = (nodes: MindFlowNode[], nodeId: string, automatic: boolean) => {
  const normalizedNodes = ensureNodeCreationOrder(nodes);
  if (automatic) {
    return normalizedNodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              presentationAutoOrder: true,
              presentationOrder: undefined,
              presentationIncluded: true,
            },
          }
        : node,
    );
  }

  const materialized = materializeManualPresentation(normalizedNodes);
  return materialized.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          data: {
            ...node.data,
            presentationAutoOrder: false,
            presentationIncluded: true,
          },
        }
      : node,
  );
};

export const movePresentationNode = (nodes: MindFlowNode[], nodeId: string, direction: 'up' | 'down') => {
  const materialized = materializeManualPresentation(nodes);
  const sequence = getPresentationSequence(materialized, { selectedPreference: false });
  const index = sequence.findIndex((node) => node.id === nodeId);
  if (index < 0) return materialized;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sequence.length) return materialized;

  const reordered = [...sequence];
  const [item] = reordered.splice(index, 1);
  reordered.splice(swapIndex, 0, item);

  const orderById = new Map(reordered.map((node, itemIndex) => [node.id, itemIndex + 1]));
  return materialized.map((node) =>
    orderById.has(node.id)
      ? {
          ...node,
          data: {
            ...node.data,
            presentationIncluded: true,
            presentationAutoOrder: false,
            presentationOrder: orderById.get(node.id),
          },
        }
      : node,
  );
};

export const setPresentationPosition = (nodes: MindFlowNode[], nodeId: string, nextPosition: number) => {
  if (!Number.isFinite(nextPosition)) return nodes;
  const materialized = materializeManualPresentation(nodes);
  const sequence = getPresentationSequence(materialized, { selectedPreference: false });
  const index = sequence.findIndex((node) => node.id === nodeId);
  if (index < 0) return materialized;

  const boundedTarget = Math.max(1, Math.min(sequence.length, Math.round(nextPosition)));
  const reordered = [...sequence];
  const [item] = reordered.splice(index, 1);
  reordered.splice(boundedTarget - 1, 0, item);

  const orderById = new Map(reordered.map((node, itemIndex) => [node.id, itemIndex + 1]));
  return materialized.map((node) =>
    orderById.has(node.id)
      ? {
          ...node,
          data: {
            ...node.data,
            presentationIncluded: true,
            presentationAutoOrder: false,
            presentationOrder: orderById.get(node.id),
          },
        }
      : node,
  );
};

export const getPresentationPosition = (nodes: MindFlowNode[], nodeId: string) => {
  const sequence = getPresentationSequence(nodes, { selectedPreference: false });
  const index = sequence.findIndex((node) => node.id === nodeId);
  return index >= 0 ? index + 1 : null;
};

export const getNextCreationOrder = (nodes: MindFlowNode[]) => {
  return ensureNodeCreationOrder(nodes).reduce((max, node, index) => Math.max(max, getCreationOrderValue(node, index + 1)), 0) + 1;
};
