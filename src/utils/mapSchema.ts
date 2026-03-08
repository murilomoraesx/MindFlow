import { v4 as uuidv4 } from 'uuid';
import type { MapData, MapSettings, MindFlowEdge, MindFlowNode, NodeData, NodeType, JourneyStage, FunnelStage, NodeComment } from '../types';
import { calculateFunnelStages } from './funnel';
import { IDEA_ROOT_COLOR } from './nodeLayout';

export const CURRENT_SCHEMA_VERSION = 4;

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  autoLayoutOnInsert: true,
  presentationTheme: 'system',
  defaultView: 'map',
  edgeAnimationsEnabled: false,
  edgeAnimationStyle: 'energy',
};

const DEFAULT_LABELS: Record<NodeType, string> = {
  idea: 'Nova Ideia',
  funnel: 'Novo Funil',
  group: 'Novo Grupo',
  note: 'Nova Nota',
  image: 'Nova Imagem',
};

const JOURNEY_STAGE_VALUES: JourneyStage[] = ['aquisicao', 'ativacao', 'conversao', 'retencao'];
const FUNNEL_STAGE_TYPES: FunnelStage['type'][] = ['entrada', 'pagina', 'formulario', 'acao', 'saida'];

const isJourneyStage = (value: unknown): value is JourneyStage =>
  typeof value === 'string' && JOURNEY_STAGE_VALUES.includes(value as JourneyStage);

const isFunnelStageType = (value: unknown): value is FunnelStage['type'] =>
  typeof value === 'string' && FUNNEL_STAGE_TYPES.includes(value as FunnelStage['type']);

const normalizeFunnelStages = (rawStages: unknown, startingTraffic: number): FunnelStage[] => {
  if (!Array.isArray(rawStages)) return [];

  const stages = rawStages.map((stage, index) => {
    const stageObj = typeof stage === 'object' && stage !== null ? (stage as Partial<FunnelStage>) : {};
    return {
      id: typeof stageObj.id === 'string' ? stageObj.id : uuidv4(),
      name: typeof stageObj.name === 'string' && stageObj.name.trim() ? stageObj.name : `Etapa ${index + 1}`,
      type: isFunnelStageType(stageObj.type) ? stageObj.type : 'pagina',
      conversionRate: typeof stageObj.conversionRate === 'number' ? stageObj.conversionRate : 50,
      cost: typeof stageObj.cost === 'number' ? stageObj.cost : 0,
      revenue: typeof stageObj.revenue === 'number' ? stageObj.revenue : 0,
      owner: typeof stageObj.owner === 'string' ? stageObj.owner : '',
      notes: typeof stageObj.notes === 'string' ? stageObj.notes : '',
    } as FunnelStage;
  });

  return calculateFunnelStages(stages, startingTraffic);
};

const normalizeComments = (rawComments: unknown): NodeComment[] => {
  if (!Array.isArray(rawComments)) return [];
  return rawComments
    .map((raw) => {
      const item = typeof raw === 'object' && raw !== null ? (raw as Partial<NodeComment>) : {};
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      if (!text) return null;
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id : uuidv4(),
        text,
        resolved: !!item.resolved,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      } as NodeComment;
    })
    .filter((comment): comment is NodeComment => !!comment);
};

const normalizeNodeData = (nodeType: NodeType, rawData: unknown): NodeData => {
  const data = typeof rawData === 'object' && rawData !== null ? (rawData as Partial<NodeData>) : {};
  const label = typeof data.label === 'string' && data.label.trim() ? data.label : DEFAULT_LABELS[nodeType];
  const startingTraffic = typeof data.startingTraffic === 'number' ? Math.max(0, Math.floor(data.startingTraffic)) : 0;

  return {
    ...data,
    label,
    color:
      typeof data.color === 'string'
        ? data.color
        : nodeType === 'idea'
          ? IDEA_ROOT_COLOR
          : nodeType === 'funnel'
            ? '#DC2626'
            : nodeType === 'note'
              ? '#F59E0B'
              : '#8B5CF6',
    textBold: !!data.textBold,
    textItalic: !!data.textItalic,
    textUnderline: !!data.textUnderline,
    textStrike: !!data.textStrike,
    startingTraffic,
    funnelExpanded: !!data.funnelExpanded,
    isEditing: false,
    funnelStages: nodeType === 'funnel' ? normalizeFunnelStages(data.funnelStages, startingTraffic) : data.funnelStages,
    presentationOrder: Number.isFinite(data.presentationOrder) ? Number(data.presentationOrder) : undefined,
    presentationIncluded: data.presentationIncluded !== false,
    presentationAutoOrder: data.presentationAutoOrder !== false,
    creationOrder: Number.isFinite(data.creationOrder) ? Number(data.creationOrder) : undefined,
    presentationZoom:
      typeof data.presentationZoom === 'number'
        ? Math.max(0.8, Math.min(2.2, Number(data.presentationZoom)))
        : undefined,
    journeyStage: isJourneyStage(data.journeyStage) ? data.journeyStage : undefined,
    noteVariant: data.noteVariant === 'sticky' || data.noteVariant === 'outline' || data.noteVariant === 'glass' ? data.noteVariant : 'sticky',
    notePriority: data.notePriority === 'low' || data.notePriority === 'high' || data.notePriority === 'medium' ? data.notePriority : 'medium',
    noteChecklist: typeof data.noteChecklist === 'string' ? data.noteChecklist : '',
    notePinned: !!data.notePinned,
    noteLayout: data.noteLayout === 'expanded' ? 'expanded' : 'compact',
    noteShowDescription: data.noteShowDescription !== false,
    noteShowChecklist: data.noteShowChecklist !== false,
    noteManualCollapse: !!data.noteManualCollapse,
    imageFit: data.imageFit === 'contain' || data.imageFit === 'cover' ? data.imageFit : 'contain',
    imageFrame:
      data.imageFrame === 'polaroid' || data.imageFrame === 'circle' || data.imageFrame === 'rounded' ? data.imageFrame : 'rounded',
    imageFilter:
      data.imageFilter === 'mono' || data.imageFilter === 'warm' || data.imageFilter === 'cool' || data.imageFilter === 'none'
        ? data.imageFilter
        : 'none',
    imageCaptionAlign:
      data.imageCaptionAlign === 'left' || data.imageCaptionAlign === 'right' || data.imageCaptionAlign === 'center'
        ? data.imageCaptionAlign
        : 'center',
    imageShowDomain: data.imageShowDomain !== false,
    groupVariant: data.groupVariant === 'solid' || data.groupVariant === 'outline' || data.groupVariant === 'glass' ? data.groupVariant : 'glass',
    groupPadding: typeof data.groupPadding === 'number' ? Math.max(12, Math.min(120, Math.floor(data.groupPadding))) : 24,
    groupWidth: typeof data.groupWidth === 'number' ? Math.max(260, Math.min(1800, Math.floor(data.groupWidth))) : undefined,
    groupHeight: typeof data.groupHeight === 'number' ? Math.max(180, Math.min(1400, Math.floor(data.groupHeight))) : undefined,
    comments: normalizeComments(data.comments),
  };
};

const normalizeNode = (rawNode: unknown, index: number): MindFlowNode => {
  const node = typeof rawNode === 'object' && rawNode !== null ? (rawNode as Partial<MindFlowNode>) : {};
  const type: NodeType = (node.type as NodeType) || 'idea';
  const position = node.position || { x: 200 + index * 40, y: 200 + index * 20 };

  return {
    ...(node as MindFlowNode),
    id: typeof node.id === 'string' ? node.id : uuidv4(),
    type,
    position: {
      x: Number.isFinite(position.x) ? Number(position.x) : 0,
      y: Number.isFinite(position.y) ? Number(position.y) : 0,
    },
    data: normalizeNodeData(type, node.data),
  };
};

const normalizeEdge = (rawEdge: unknown): MindFlowEdge | null => {
  const edge = typeof rawEdge === 'object' && rawEdge !== null ? (rawEdge as Partial<MindFlowEdge>) : {};
  if (typeof edge.source !== 'string' || typeof edge.target !== 'string') return null;
  const sourceHandle =
    typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim().length > 0 ? edge.sourceHandle : 'right';
  const targetHandle =
    typeof edge.targetHandle === 'string' && edge.targetHandle.trim().length > 0 ? edge.targetHandle : 'left';

  return {
    ...(edge as MindFlowEdge),
    id: typeof edge.id === 'string' ? edge.id : `e-${edge.source}-${edge.target}-${uuidv4()}`,
    source: edge.source,
    sourceHandle,
    target: edge.target,
    targetHandle,
  };
};

const normalizeSettings = (settings: unknown, schemaVersion: number): MapSettings => {
  if (typeof settings !== 'object' || settings === null) return DEFAULT_MAP_SETTINGS;
  const candidate = settings as Partial<MapSettings>;
  const shouldEnableAutoLayoutByMigration = schemaVersion < 3 && candidate.autoLayoutOnInsert === false;

  return {
    autoLayoutOnInsert: shouldEnableAutoLayoutByMigration
      ? true
      : typeof candidate.autoLayoutOnInsert === 'boolean'
        ? candidate.autoLayoutOnInsert
        : DEFAULT_MAP_SETTINGS.autoLayoutOnInsert,
    presentationTheme:
      candidate.presentationTheme === 'light' || candidate.presentationTheme === 'dark' || candidate.presentationTheme === 'system'
        ? candidate.presentationTheme
        : DEFAULT_MAP_SETTINGS.presentationTheme,
    defaultView:
      candidate.defaultView === 'map' || candidate.defaultView === 'funnel' || candidate.defaultView === 'journey'
        ? candidate.defaultView
        : DEFAULT_MAP_SETTINGS.defaultView,
    edgeAnimationsEnabled:
      typeof candidate.edgeAnimationsEnabled === 'boolean' ? candidate.edgeAnimationsEnabled : DEFAULT_MAP_SETTINGS.edgeAnimationsEnabled,
    edgeAnimationStyle:
      candidate.edgeAnimationStyle === 'energy' || candidate.edgeAnimationStyle === 'subtle' || candidate.edgeAnimationStyle === 'tech'
        ? candidate.edgeAnimationStyle
        : DEFAULT_MAP_SETTINGS.edgeAnimationStyle,
  };
};

export const normalizeMapData = (rawMap: unknown): MapData => {
  const candidate = typeof rawMap === 'object' && rawMap !== null ? (rawMap as Partial<MapData>) : {};
  const sourceSchemaVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 0;

  const rawNodes = Array.isArray(candidate.nodes) ? candidate.nodes : [];
  const nodes = rawNodes.map((node, index) => normalizeNode(node, index)).map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      creationOrder: Number.isFinite(node.data.creationOrder) ? Number(node.data.creationOrder) : index + 1,
      presentationIncluded: node.data.presentationIncluded !== false,
      presentationAutoOrder: node.data.presentationAutoOrder !== false,
    },
  }));
  const safeNodes = nodes.length > 0 ? nodes : [normalizeNode(null, 0)];
  const validNodeIds = new Set(safeNodes.map((node) => node.id));

  const edges = (Array.isArray(candidate.edges) ? candidate.edges : [])
    .map(normalizeEdge)
    .filter((edge): edge is MindFlowEdge => !!edge && validNodeIds.has(edge.source) && validNodeIds.has(edge.target));

  return {
    id: typeof candidate.id === 'string' ? candidate.id : uuidv4(),
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Meu Mapa Mental',
    nodes: safeNodes,
    edges,
    lastEdited: typeof candidate.lastEdited === 'number' ? candidate.lastEdited : Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: normalizeSettings(candidate.settings, sourceSchemaVersion),
    projectId: typeof candidate.projectId === 'string' && candidate.projectId.trim() ? candidate.projectId : undefined,
  };
};

export const createBlankMap = (id: string, name: string): MapData => {
  return normalizeMapData({
    id,
    name,
    nodes: [
      {
        id: 'root',
        type: 'idea',
        position: { x: 250, y: 250 },
        data: { label: 'Nova Ideia', color: IDEA_ROOT_COLOR },
      },
    ],
    edges: [],
    lastEdited: Date.now(),
  });
};

export const createJourneyTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    {
      id: 'journey-root',
      type: 'idea',
      position: { x: 80, y: 250 },
      data: { label: 'Jornada do Cliente', color: '#0ea5e9' },
    },
    {
      id: 'journey-aquisicao',
      type: 'idea',
      position: { x: 360, y: 130 },
      data: { label: 'Aquisição', color: '#6366f1', journeyStage: 'aquisicao' },
    },
    {
      id: 'journey-ativacao',
      type: 'idea',
      position: { x: 360, y: 250 },
      data: { label: 'Ativação', color: '#14b8a6', journeyStage: 'ativacao' },
    },
    {
      id: 'journey-conversao',
      type: 'idea',
      position: { x: 360, y: 370 },
      data: { label: 'Conversão', color: '#f59e0b', journeyStage: 'conversao' },
    },
    {
      id: 'journey-retencao',
      type: 'idea',
      position: { x: 640, y: 250 },
      data: { label: 'Retenção', color: '#10b981', journeyStage: 'retencao' },
    },
  ];

  const edges: MindFlowEdge[] = [
    { id: 'e-root-aq', source: 'journey-root', target: 'journey-aquisicao', type: 'animated' },
    { id: 'e-root-at', source: 'journey-root', target: 'journey-ativacao', type: 'animated' },
    { id: 'e-root-co', source: 'journey-root', target: 'journey-conversao', type: 'animated' },
    { id: 'e-aq-re', source: 'journey-aquisicao', target: 'journey-retencao', type: 'animated' },
    { id: 'e-at-re', source: 'journey-ativacao', target: 'journey-retencao', type: 'animated' },
    { id: 'e-co-re', source: 'journey-conversao', target: 'journey-retencao', type: 'animated' },
  ];

  return normalizeMapData({
    id,
    name,
    nodes,
    edges,
    lastEdited: Date.now(),
    settings: {
      ...DEFAULT_MAP_SETTINGS,
      defaultView: 'journey',
    },
  });
};

export type MapTemplateId = 'blank' | 'journey' | 'swot' | 'okr' | 'roadmap' | 'content' | 'sales';

const asAnimatedEdge = (id: string, source: string, target: string): MindFlowEdge => ({
  id,
  source,
  sourceHandle: 'right',
  target,
  targetHandle: 'left',
  type: 'animated',
});

export const createSwotTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    { id: 'swot-root', type: 'idea', position: { x: 80, y: 250 }, data: { label: 'Análise SWOT', color: '#2563EB' } },
    { id: 'swot-s', type: 'idea', position: { x: 360, y: 120 }, data: { label: 'Forças', color: '#10B981' } },
    { id: 'swot-w', type: 'idea', position: { x: 360, y: 250 }, data: { label: 'Fraquezas', color: '#EF4444' } },
    { id: 'swot-o', type: 'idea', position: { x: 360, y: 380 }, data: { label: 'Oportunidades', color: '#0EA5E9' } },
    { id: 'swot-t', type: 'idea', position: { x: 360, y: 510 }, data: { label: 'Ameaças', color: '#F59E0B' } },
    { id: 'swot-s-1', type: 'idea', position: { x: 620, y: 90 }, data: { label: 'Marca reconhecida', color: '#111827' } },
    { id: 'swot-s-2', type: 'idea', position: { x: 620, y: 150 }, data: { label: 'Equipe especializada', color: '#111827' } },
    { id: 'swot-w-1', type: 'idea', position: { x: 620, y: 220 }, data: { label: 'Processos manuais', color: '#111827' } },
    { id: 'swot-w-2', type: 'idea', position: { x: 620, y: 280 }, data: { label: 'Baixa retenção', color: '#111827' } },
    { id: 'swot-o-1', type: 'idea', position: { x: 620, y: 350 }, data: { label: 'Expansão regional', color: '#111827' } },
    { id: 'swot-o-2', type: 'idea', position: { x: 620, y: 410 }, data: { label: 'Parcerias de canal', color: '#111827' } },
    { id: 'swot-t-1', type: 'idea', position: { x: 620, y: 480 }, data: { label: 'Novo concorrente', color: '#111827' } },
    { id: 'swot-t-2', type: 'idea', position: { x: 620, y: 540 }, data: { label: 'Mudanças regulatórias', color: '#111827' } },
  ];

  const edges: MindFlowEdge[] = [
    asAnimatedEdge('e-swot-root-s', 'swot-root', 'swot-s'),
    asAnimatedEdge('e-swot-root-w', 'swot-root', 'swot-w'),
    asAnimatedEdge('e-swot-root-o', 'swot-root', 'swot-o'),
    asAnimatedEdge('e-swot-root-t', 'swot-root', 'swot-t'),
    asAnimatedEdge('e-swot-s-1', 'swot-s', 'swot-s-1'),
    asAnimatedEdge('e-swot-s-2', 'swot-s', 'swot-s-2'),
    asAnimatedEdge('e-swot-w-1', 'swot-w', 'swot-w-1'),
    asAnimatedEdge('e-swot-w-2', 'swot-w', 'swot-w-2'),
    asAnimatedEdge('e-swot-o-1', 'swot-o', 'swot-o-1'),
    asAnimatedEdge('e-swot-o-2', 'swot-o', 'swot-o-2'),
    asAnimatedEdge('e-swot-t-1', 'swot-t', 'swot-t-1'),
    asAnimatedEdge('e-swot-t-2', 'swot-t', 'swot-t-2'),
  ];

  return normalizeMapData({ id, name, nodes, edges, lastEdited: Date.now() });
};

export const createOkrTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    { id: 'okr-root', type: 'idea', position: { x: 80, y: 250 }, data: { label: 'OKRs Trimestrais', color: '#2563EB' } },
    { id: 'okr-obj-1', type: 'idea', position: { x: 360, y: 130 }, data: { label: 'Objetivo 1: Crescimento', color: '#8B5CF6' } },
    { id: 'okr-obj-2', type: 'idea', position: { x: 360, y: 280 }, data: { label: 'Objetivo 2: Retenção', color: '#8B5CF6' } },
    { id: 'okr-obj-3', type: 'idea', position: { x: 360, y: 430 }, data: { label: 'Objetivo 3: Eficiência', color: '#8B5CF6' } },
    { id: 'okr-kr-1', type: 'idea', position: { x: 650, y: 90 }, data: { label: 'KR1: +25% MQL', color: '#111827' } },
    { id: 'okr-kr-2', type: 'idea', position: { x: 650, y: 150 }, data: { label: 'KR2: CAC -10%', color: '#111827' } },
    { id: 'okr-kr-3', type: 'idea', position: { x: 650, y: 240 }, data: { label: 'KR1: Churn < 3%', color: '#111827' } },
    { id: 'okr-kr-4', type: 'idea', position: { x: 650, y: 300 }, data: { label: 'KR2: NPS > 60', color: '#111827' } },
    { id: 'okr-kr-5', type: 'idea', position: { x: 650, y: 390 }, data: { label: 'KR1: Tempo de ciclo -20%', color: '#111827' } },
    { id: 'okr-kr-6', type: 'idea', position: { x: 650, y: 450 }, data: { label: 'KR2: SLA < 24h', color: '#111827' } },
    { id: 'okr-initiative-1', type: 'idea', position: { x: 910, y: 90 }, data: { label: 'Campanha ABM', color: '#111827' } },
    { id: 'okr-initiative-2', type: 'idea', position: { x: 910, y: 240 }, data: { label: 'Programa de onboarding', color: '#111827' } },
    { id: 'okr-initiative-3', type: 'idea', position: { x: 910, y: 390 }, data: { label: 'Automação de suporte', color: '#111827' } },
  ];

  const edges: MindFlowEdge[] = [
    asAnimatedEdge('e-okr-root-1', 'okr-root', 'okr-obj-1'),
    asAnimatedEdge('e-okr-root-2', 'okr-root', 'okr-obj-2'),
    asAnimatedEdge('e-okr-root-3', 'okr-root', 'okr-obj-3'),
    asAnimatedEdge('e-okr-obj-1-1', 'okr-obj-1', 'okr-kr-1'),
    asAnimatedEdge('e-okr-obj-1-2', 'okr-obj-1', 'okr-kr-2'),
    asAnimatedEdge('e-okr-obj-2-1', 'okr-obj-2', 'okr-kr-3'),
    asAnimatedEdge('e-okr-obj-2-2', 'okr-obj-2', 'okr-kr-4'),
    asAnimatedEdge('e-okr-obj-3-1', 'okr-obj-3', 'okr-kr-5'),
    asAnimatedEdge('e-okr-obj-3-2', 'okr-obj-3', 'okr-kr-6'),
    asAnimatedEdge('e-okr-init-1', 'okr-kr-1', 'okr-initiative-1'),
    asAnimatedEdge('e-okr-init-2', 'okr-kr-3', 'okr-initiative-2'),
    asAnimatedEdge('e-okr-init-3', 'okr-kr-5', 'okr-initiative-3'),
  ];

  return normalizeMapData({ id, name, nodes, edges, lastEdited: Date.now() });
};

export const createRoadmapTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    { id: 'road-root', type: 'idea', position: { x: 80, y: 250 }, data: { label: 'Roadmap de Produto', color: '#2563EB' } },
    { id: 'road-q1', type: 'idea', position: { x: 360, y: 110 }, data: { label: 'Q1 - Fundamentos', color: '#14B8A6' } },
    { id: 'road-q2', type: 'idea', position: { x: 360, y: 240 }, data: { label: 'Q2 - Crescimento', color: '#22C55E' } },
    { id: 'road-q3', type: 'idea', position: { x: 360, y: 370 }, data: { label: 'Q3 - Escala', color: '#F59E0B' } },
    { id: 'road-q4', type: 'idea', position: { x: 360, y: 500 }, data: { label: 'Q4 - Retenção', color: '#EC4899' } },
    { id: 'road-q1-a', type: 'idea', position: { x: 650, y: 80 }, data: { label: 'Refatorar arquitetura', color: '#111827' } },
    { id: 'road-q1-b', type: 'idea', position: { x: 650, y: 140 }, data: { label: 'Design system v2', color: '#111827' } },
    { id: 'road-q2-a', type: 'idea', position: { x: 650, y: 210 }, data: { label: 'Self-serve onboarding', color: '#111827' } },
    { id: 'road-q2-b', type: 'idea', position: { x: 650, y: 270 }, data: { label: 'Integração CRM', color: '#111827' } },
    { id: 'road-q3-a', type: 'idea', position: { x: 650, y: 340 }, data: { label: 'Motor de automações', color: '#111827' } },
    { id: 'road-q3-b', type: 'idea', position: { x: 650, y: 400 }, data: { label: 'Analytics em tempo real', color: '#111827' } },
    { id: 'road-q4-a', type: 'idea', position: { x: 650, y: 470 }, data: { label: 'Programa de fidelidade', color: '#111827' } },
    { id: 'road-q4-b', type: 'idea', position: { x: 650, y: 530 }, data: { label: 'Prevenção de churn', color: '#111827' } },
  ];

  const edges: MindFlowEdge[] = [
    asAnimatedEdge('e-road-root-1', 'road-root', 'road-q1'),
    asAnimatedEdge('e-road-root-2', 'road-root', 'road-q2'),
    asAnimatedEdge('e-road-root-3', 'road-root', 'road-q3'),
    asAnimatedEdge('e-road-root-4', 'road-root', 'road-q4'),
    asAnimatedEdge('e-road-q1-a', 'road-q1', 'road-q1-a'),
    asAnimatedEdge('e-road-q1-b', 'road-q1', 'road-q1-b'),
    asAnimatedEdge('e-road-q2-a', 'road-q2', 'road-q2-a'),
    asAnimatedEdge('e-road-q2-b', 'road-q2', 'road-q2-b'),
    asAnimatedEdge('e-road-q3-a', 'road-q3', 'road-q3-a'),
    asAnimatedEdge('e-road-q3-b', 'road-q3', 'road-q3-b'),
    asAnimatedEdge('e-road-q4-a', 'road-q4', 'road-q4-a'),
    asAnimatedEdge('e-road-q4-b', 'road-q4', 'road-q4-b'),
  ];

  return normalizeMapData({ id, name, nodes, edges, lastEdited: Date.now() });
};

export const createContentTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    { id: 'content-root', type: 'idea', position: { x: 80, y: 250 }, data: { label: 'Plano de Conteúdo 90 Dias', color: '#2563EB' } },
    { id: 'content-pillar-1', type: 'idea', position: { x: 360, y: 120 }, data: { label: 'Topo de Funil', color: '#0EA5E9' } },
    { id: 'content-pillar-2', type: 'idea', position: { x: 360, y: 250 }, data: { label: 'Meio de Funil', color: '#8B5CF6' } },
    { id: 'content-pillar-3', type: 'idea', position: { x: 360, y: 380 }, data: { label: 'Fundo de Funil', color: '#10B981' } },
    { id: 'content-week-1', type: 'idea', position: { x: 650, y: 90 }, data: { label: 'Semanas 1-4: Awareness', color: '#111827' } },
    { id: 'content-week-2', type: 'idea', position: { x: 650, y: 150 }, data: { label: 'Semanas 5-8: Consideração', color: '#111827' } },
    { id: 'content-week-3', type: 'idea', position: { x: 650, y: 220 }, data: { label: 'Webinar + estudo de caso', color: '#111827' } },
    { id: 'content-week-4', type: 'idea', position: { x: 650, y: 280 }, data: { label: 'E-book comparativo', color: '#111827' } },
    { id: 'content-week-5', type: 'idea', position: { x: 650, y: 350 }, data: { label: 'Demo guiada por perfil', color: '#111827' } },
    { id: 'content-week-6', type: 'idea', position: { x: 650, y: 410 }, data: { label: 'Sequência de prova social', color: '#111827' } },
    { id: 'content-kpi-1', type: 'idea', position: { x: 930, y: 170 }, data: { label: 'KPIs: CTR, CPL, SQL', color: '#111827' } },
    { id: 'content-kpi-2', type: 'idea', position: { x: 930, y: 370 }, data: { label: 'KPIs: Pipeline, Win rate', color: '#111827' } },
  ];

  const edges: MindFlowEdge[] = [
    asAnimatedEdge('e-content-root-1', 'content-root', 'content-pillar-1'),
    asAnimatedEdge('e-content-root-2', 'content-root', 'content-pillar-2'),
    asAnimatedEdge('e-content-root-3', 'content-root', 'content-pillar-3'),
    asAnimatedEdge('e-content-p1-1', 'content-pillar-1', 'content-week-1'),
    asAnimatedEdge('e-content-p1-2', 'content-pillar-1', 'content-week-2'),
    asAnimatedEdge('e-content-p2-1', 'content-pillar-2', 'content-week-3'),
    asAnimatedEdge('e-content-p2-2', 'content-pillar-2', 'content-week-4'),
    asAnimatedEdge('e-content-p3-1', 'content-pillar-3', 'content-week-5'),
    asAnimatedEdge('e-content-p3-2', 'content-pillar-3', 'content-week-6'),
    asAnimatedEdge('e-content-kpi-1', 'content-week-2', 'content-kpi-1'),
    asAnimatedEdge('e-content-kpi-2', 'content-week-6', 'content-kpi-2'),
  ];

  return normalizeMapData({ id, name, nodes, edges, lastEdited: Date.now() });
};

export const createSalesTemplateMap = (id: string, name: string): MapData => {
  const nodes: MindFlowNode[] = [
    { id: 'sales-root', type: 'idea', position: { x: 80, y: 250 }, data: { label: 'Funil de Vendas B2B', color: '#2563EB' } },
    { id: 'sales-stage-1', type: 'idea', position: { x: 360, y: 110 }, data: { label: 'Prospecção', color: '#6366F1' } },
    { id: 'sales-stage-2', type: 'idea', position: { x: 360, y: 240 }, data: { label: 'Qualificação', color: '#8B5CF6' } },
    { id: 'sales-stage-3', type: 'idea', position: { x: 360, y: 370 }, data: { label: 'Proposta', color: '#EC4899' } },
    { id: 'sales-stage-4', type: 'idea', position: { x: 360, y: 500 }, data: { label: 'Fechamento', color: '#14B8A6' } },
    { id: 'sales-s1-a', type: 'idea', position: { x: 650, y: 80 }, data: { label: 'ICP + lista de contas', color: '#111827' } },
    { id: 'sales-s1-b', type: 'idea', position: { x: 650, y: 140 }, data: { label: 'Cadência multicanal', color: '#111827' } },
    { id: 'sales-s2-a', type: 'idea', position: { x: 650, y: 210 }, data: { label: 'Checklist BANT', color: '#111827' } },
    { id: 'sales-s2-b', type: 'idea', position: { x: 650, y: 270 }, data: { label: 'Mapeamento de decisores', color: '#111827' } },
    { id: 'sales-s3-a', type: 'idea', position: { x: 650, y: 340 }, data: { label: 'Proposta de valor', color: '#111827' } },
    { id: 'sales-s3-b', type: 'idea', position: { x: 650, y: 400 }, data: { label: 'Business case', color: '#111827' } },
    { id: 'sales-s4-a', type: 'idea', position: { x: 650, y: 470 }, data: { label: 'Negociação e termos', color: '#111827' } },
    { id: 'sales-s4-b', type: 'idea', position: { x: 650, y: 530 }, data: { label: 'Handoff CS + onboarding', color: '#111827' } },
  ];

  const edges: MindFlowEdge[] = [
    asAnimatedEdge('e-sales-root-1', 'sales-root', 'sales-stage-1'),
    asAnimatedEdge('e-sales-root-2', 'sales-root', 'sales-stage-2'),
    asAnimatedEdge('e-sales-root-3', 'sales-root', 'sales-stage-3'),
    asAnimatedEdge('e-sales-root-4', 'sales-root', 'sales-stage-4'),
    asAnimatedEdge('e-sales-s1-a', 'sales-stage-1', 'sales-s1-a'),
    asAnimatedEdge('e-sales-s1-b', 'sales-stage-1', 'sales-s1-b'),
    asAnimatedEdge('e-sales-s2-a', 'sales-stage-2', 'sales-s2-a'),
    asAnimatedEdge('e-sales-s2-b', 'sales-stage-2', 'sales-s2-b'),
    asAnimatedEdge('e-sales-s3-a', 'sales-stage-3', 'sales-s3-a'),
    asAnimatedEdge('e-sales-s3-b', 'sales-stage-3', 'sales-s3-b'),
    asAnimatedEdge('e-sales-s4-a', 'sales-stage-4', 'sales-s4-a'),
    asAnimatedEdge('e-sales-s4-b', 'sales-stage-4', 'sales-s4-b'),
  ];

  return normalizeMapData({ id, name, nodes, edges, lastEdited: Date.now() });
};

export const createMapFromTemplate = (template: MapTemplateId, id: string, name: string): MapData => {
  if (template === 'journey') return createJourneyTemplateMap(id, name);
  if (template === 'swot') return createSwotTemplateMap(id, name);
  if (template === 'okr') return createOkrTemplateMap(id, name);
  if (template === 'roadmap') return createRoadmapTemplateMap(id, name);
  if (template === 'content') return createContentTemplateMap(id, name);
  if (template === 'sales') return createSalesTemplateMap(id, name);
  return createBlankMap(id, name);
};
