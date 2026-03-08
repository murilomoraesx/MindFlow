import React, { useEffect, useState } from 'react';
import { useFlowStore } from '../../store/useFlowStore';
import { useReactFlow } from '@xyflow/react';
import { Settings2, Trash2, Copy, Plus, Unlink2, MessageSquarePlus, CheckCircle2, Circle, Play, Pause } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { EdgeAnimationDirection, EdgeAnimationStyle, FunnelStage, MindFlowNode, MindFlowEdge, JourneyStage, NodeType, NodeComment } from '../../types';
import { buildStagesFromTemplate, calculateFunnelStages, createDefaultStage, FUNNEL_TEMPLATES, getFunnelSummary } from '../../utils/funnel';
import { SHARED_COLOR_PALETTE } from '../../utils/colors';
import { resolveNodeCollision } from '../../utils/nodeLayout';
import { captureNodesIntoGroup, fitGroupToChildren, releaseGroupChildren } from '../../utils/grouping';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlurSave?: (value: string) => void;
  isTextArea?: boolean;
  placeholder?: string;
}

const TextInput = ({ label, value, onChange, onBlurSave, isTextArea = false, placeholder = '' }: TextInputProps) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && value !== localValue) {
      setLocalValue(value || '');
    }
  }, [value, isFocused, localValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlurSave?.(localValue);
  };

  const baseClasses =
    'rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</label>
      {isTextArea ? (
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          className={`${baseClasses} min-h-[60px] resize-y`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          className={baseClasses}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

const JOURNEY_STAGE_OPTIONS: { value: JourneyStage; label: string }[] = [
  { value: 'aquisicao', label: 'Aquisição' },
  { value: 'ativacao', label: 'Ativação' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'retencao', label: 'Retenção' },
];

const NOTE_VARIANTS: { value: 'glass' | 'sticky' | 'outline'; label: string }[] = [
  { value: 'glass', label: 'Vidro' },
  { value: 'sticky', label: 'Papel' },
  { value: 'outline', label: 'Contorno' },
];

const NOTE_PRIORITIES: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const NOTE_LAYOUTS: { value: 'compact' | 'expanded'; label: string }[] = [
  { value: 'compact', label: 'Compacta' },
  { value: 'expanded', label: 'Expandida' },
];

const IMAGE_FIT_OPTIONS: { value: 'cover' | 'contain'; label: string }[] = [
  { value: 'cover', label: 'Preencher' },
  { value: 'contain', label: 'Conter' },
];

const IMAGE_FRAME_OPTIONS: { value: 'rounded' | 'polaroid' | 'circle'; label: string }[] = [
  { value: 'rounded', label: 'Cartão' },
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'circle', label: 'Circular' },
];

const IMAGE_FILTER_OPTIONS: { value: 'none' | 'mono' | 'warm' | 'cool'; label: string }[] = [
  { value: 'none', label: 'Original' },
  { value: 'mono', label: 'Mono' },
  { value: 'warm', label: 'Quente' },
  { value: 'cool', label: 'Frio' },
];

const IMAGE_CAPTION_ALIGN_OPTIONS: { value: 'left' | 'center' | 'right'; label: string }[] = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Direita' },
];

const parseCurrency = (value: string): number => {
  const clean = value.replace(/[^\d.-]/g, '');
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseInteger = (value: string): number => {
  const clean = value.replace(/[^\d-]/g, '');
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const StylePanel = () => {
  const { nodes: storeNodes, settings, updateNodeData, updateEdgeData, deleteElements, addNode, setEdges, setNodes, pushHistory, setSaveStatus } = useFlowStore();
  const { getNodes, getEdges } = useReactFlow();
  const [commentDraft, setCommentDraft] = useState('');

  const selectedNodes = getNodes().filter((node) => node.selected) as MindFlowNode[];
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const selectedEdges = getEdges().filter((edge) => edge.selected) as MindFlowEdge[];
  const selectedEdge = selectedEdges.length === 1 && !selectedNode ? selectedEdges[0] : null;
  const panelWidthClass =
    selectedNode?.type === 'funnel'
      ? 'w-[clamp(24rem,36vw,34rem)] min-w-[24rem]'
      : selectedNode?.type === 'note'
        ? 'w-[clamp(21rem,32vw,30rem)] min-w-[21rem]'
        : 'w-[clamp(18rem,24vw,24rem)] min-w-[18rem]';
  const isEdge = !!selectedEdge;
  const targetId = isEdge ? selectedEdge.id : selectedNode?.id;
  const targetData = isEdge ? selectedEdge.data || {} : selectedNode?.data || {};

  useEffect(() => {
    setCommentDraft('');
  }, [targetId]);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className={`flex h-full min-h-0 ${panelWidthClass} flex-shrink-0 flex-col items-center justify-center border-l border-slate-200 bg-slate-50/50 p-4 text-center text-slate-400 transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/74 backdrop-blur-xl`}>
        <Settings2 size={24} className="mb-3 opacity-20" />
        <p className="text-xs">Selecione um nó para editar</p>
      </div>
    );
  }

  const handleDuplicate = () => {
    if (!selectedNode) return;
    const position = resolveNodeCollision({
      basePosition: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      nodeType: selectedNode.type as NodeType,
      nodes: getNodes() as MindFlowNode[],
    });

    const newNode = {
      ...selectedNode,
      id: uuidv4(),
      position,
      selected: false,
    };
    addNode(newNode);
  };

  const handleDelete = () => {
    if (selectedNode) {
      const nodeToDelete = storeNodes.find((node) => node.id === selectedNode.id) || selectedNode;
      deleteElements([nodeToDelete as MindFlowNode], []);
    }
    if (selectedEdge) deleteElements([], [selectedEdge]);
  };

  const handleDetachNode = () => {
    if (!selectedNode || !canDetachNode || connectedEdgesCount === 0) return;
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((edges) => edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
  };

  const addComment = () => {
    if (!targetId || isEdge) return;
    const text = commentDraft.trim();
    if (!text) return;
    const nextComments = nodeComments.concat({
      id: uuidv4(),
      text,
      resolved: false,
      createdAt: Date.now(),
    });
    updateNodeData(targetId, { comments: nextComments }, false);
    setCommentDraft('');
  };

  const toggleCommentResolved = (commentId: string) => {
    if (!targetId || isEdge) return;
    const nextComments = nodeComments.map((comment) =>
      comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment,
    );
    updateNodeData(targetId, { comments: nextComments }, false);
  };

  const removeComment = (commentId: string) => {
    if (!targetId || isEdge) return;
    updateNodeData(
      targetId,
      { comments: nodeComments.filter((comment) => comment.id !== commentId) },
      false,
    );
  };

  const handleGroupCaptureSelection = () => {
    if (!isGroupNode || !selectedNode) return;
    const allNodes = getNodes() as MindFlowNode[];
    const selectedCandidates = allNodes.filter((node) => node.selected && node.id !== selectedNode.id && node.type !== 'group').map((node) => node.id);
    const result = captureNodesIntoGroup({
      nodes: allNodes,
      groupId: selectedNode.id,
      nodeIds: selectedCandidates,
    });
    if (!result.changed) return;
    pushHistory();
    setSaveStatus('unsaved');
    setNodes(result.nodes);
  };

  const handleGroupReleaseChildren = () => {
    if (!isGroupNode || !selectedNode || groupChildren.length === 0) return;
    const result = releaseGroupChildren({
      nodes: getNodes() as MindFlowNode[],
      groupId: selectedNode.id,
    });
    if (!result.changed) return;
    pushHistory();
    setSaveStatus('unsaved');
    setNodes(result.nodes);
  };

  const handleGroupAutoFit = () => {
    if (!isGroupNode || !selectedNode || groupChildren.length === 0) return;
    const result = fitGroupToChildren({
      nodes: getNodes() as MindFlowNode[],
      groupId: selectedNode.id,
    });
    if (!result.changed) return;
    pushHistory();
    setSaveStatus('unsaved');
    setNodes(result.nodes);
  };

  const isFunnelNode = !!selectedNode && selectedNode.type === 'funnel';
  const isNoteNode = !!selectedNode && selectedNode.type === 'note';
  const isImageNode = !!selectedNode && selectedNode.type === 'image';
  const isGroupNode = !!selectedNode && selectedNode.type === 'group';
  const canDetachNode = !!selectedNode && ['note', 'image', 'funnel'].includes(selectedNode.type);
  const connectedEdgesCount = selectedNode
    ? getEdges().filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length
    : 0;
  const startingTraffic = isFunnelNode ? Number(targetData.startingTraffic || 0) : 0;
  const funnelStages = isFunnelNode
    ? calculateFunnelStages((targetData.funnelStages as FunnelStage[] | undefined) || [], startingTraffic)
    : [];
  const funnelSummary = isFunnelNode ? getFunnelSummary(funnelStages, startingTraffic) : null;
  const noteVariant = ((targetData.noteVariant as 'glass' | 'sticky' | 'outline') || 'glass') as 'glass' | 'sticky' | 'outline';
  const notePriority = ((targetData.notePriority as 'low' | 'medium' | 'high') || 'medium') as 'low' | 'medium' | 'high';
  const noteLayout = ((targetData.noteLayout as 'compact' | 'expanded') || 'compact') as 'compact' | 'expanded';
  const imageFit = ((targetData.imageFit as 'cover' | 'contain') || 'contain') as 'cover' | 'contain';
  const imageFrame = ((targetData.imageFrame as 'rounded' | 'polaroid' | 'circle') || 'rounded') as 'rounded' | 'polaroid' | 'circle';
  const imageFilter = ((targetData.imageFilter as 'none' | 'mono' | 'warm' | 'cool') || 'none') as 'none' | 'mono' | 'warm' | 'cool';
  const imageCaptionAlign = ((targetData.imageCaptionAlign as 'left' | 'center' | 'right') || 'center') as 'left' | 'center' | 'right';
  const edgeAnimationStyle = ((targetData.animationStyle as EdgeAnimationStyle | undefined) || settings.edgeAnimationStyle || 'energy') as EdgeAnimationStyle;
  const edgeAnimationDirection = ((targetData.animationDirection as EdgeAnimationDirection | undefined) || 'forward') as EdgeAnimationDirection;
  const edgeAnimationEnabled = targetData.animationEnabled !== false;
  const groupVariant = ((targetData.groupVariant as 'glass' | 'solid' | 'outline') || 'glass') as 'glass' | 'solid' | 'outline';
  const groupPadding = Math.max(12, Math.min(120, Number(targetData.groupPadding || 24)));
  const groupWidth = Math.max(260, Math.min(1800, Number(targetData.groupWidth || 420)));
  const groupHeight = Math.max(180, Math.min(1400, Number(targetData.groupHeight || 280)));
  const groupChildren = selectedNode ? (getNodes() as MindFlowNode[]).filter((node) => node.parentId === selectedNode.id) : [];
  const nodeComments: NodeComment[] =
    !isEdge && Array.isArray(targetData.comments)
      ? (targetData.comments as NodeComment[]).filter(
          (comment) => comment && typeof comment.text === 'string' && comment.text.trim().length > 0,
        )
      : [];
  const updateFunnelData = (updates: Partial<MindFlowNode['data']>, avoidHistory = true) => {
    if (!targetId) return;
    updateNodeData(targetId, updates, avoidHistory);
  };

  const updateFunnelStages = (nextStages: FunnelStage[], avoidHistory = true, trafficBase = startingTraffic) => {
    updateFunnelData(
      {
        funnelStages: calculateFunnelStages(nextStages, trafficBase),
      },
      avoidHistory,
    );
  };

  const addFunnelStage = () => {
    const nextStages = [...funnelStages, createDefaultStage(funnelStages.length)];
    updateFunnelStages(nextStages, false);
  };

  const removeFunnelStage = (stageId: string) => {
    updateFunnelStages(
      funnelStages.filter((stage) => stage.id !== stageId),
      false,
    );
  };

  const updateFunnelStage = (stageId: string, updates: Partial<FunnelStage>, avoidHistory = true) => {
    const nextStages = funnelStages.map((stage) => (stage.id === stageId ? { ...stage, ...updates } : stage));
    updateFunnelStages(nextStages, avoidHistory);
  };

  const applyTemplate = (templateId: string) => {
    const template = FUNNEL_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const nextStartingTraffic = startingTraffic > 0 ? startingTraffic : 10000;
    const nextStages = buildStagesFromTemplate(template, nextStartingTraffic);

    updateFunnelData(
      {
        label: template.label,
        startingTraffic: nextStartingTraffic,
        funnelStages: nextStages,
      },
      false,
    );
  };

  const handleImageFileUpload = (file: File | null) => {
    if (!file || !targetId || isEdge || !isImageNode) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      const currentLabel = String(targetData.label || '').trim();
      updateNodeData(
        targetId,
        {
          imageUrl: result,
          label: currentLabel && currentLabel !== 'Nova Imagem' ? currentLabel : file.name.replace(/\.[^/.]+$/, ''),
        },
        false,
      );
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flex h-full min-h-0 ${panelWidthClass} flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/82 backdrop-blur-xl`}>
      <div
        key={targetId}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 opacity-0 animate-[fade-in_0.2s_ease-out_forwards]"
        style={{ animationName: 'fade-slide-up' }}
      >
        <style>{`
          @keyframes fade-slide-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Propriedades</h2>

        <div className="flex flex-col gap-4">
          {!isEdge && (
            <>
              <TextInput
                label="Título"
                value={String(targetData.label || '')}
                onChange={(value) => updateNodeData(targetId!, { label: value }, true)}
                onBlurSave={(value) => updateNodeData(targetId!, { label: value }, false)}
              />
              <TextInput
                label="Descrição"
                value={String(targetData.description || '')}
                onChange={(value) => updateNodeData(targetId!, { description: value }, true)}
                onBlurSave={(value) => updateNodeData(targetId!, { description: value }, false)}
                isTextArea
                placeholder="Adicione uma descrição..."
              />
            </>
          )}

          {!isEdge && !isNoteNode && !isImageNode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Jornada</label>
                <select
                  value={(targetData.journeyStage as string) || ''}
                  onChange={(event) =>
                    updateNodeData(
                      targetId!,
                      { journeyStage: (event.target.value || undefined) as JourneyStage | undefined },
                      false,
                    )
                  }
                  className="rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
                >
                  <option value="">Sem etapa</option>
                  {JOURNEY_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {SHARED_COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => (isEdge ? updateEdgeData(targetId!, { color }) : updateNodeData(targetId!, { color }))}
                      className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        targetData.color === color ? 'border-slate-900 dark:border-white' : 'border-transparent shadow-sm'
                      }`}
                      style={{ backgroundColor: color }}
                      title="Alterar cor"
                    />
                  ))}
                </div>
              </div>

          {isEdge && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Estilo da linha</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'solid', label: 'Sólida' },
                    { value: 'dashed', label: 'Tracejada' },
                    { value: 'glow', label: 'Destaque' },
                  ].map((variant) => (
                    <button
                      key={variant.value}
                      onClick={() => updateEdgeData(targetId!, { variant: variant.value })}
                      className={`rounded border py-1 text-xs font-medium transition-colors ${
                        (targetData.variant || 'glow') === variant.value
                          ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Espessura da linha</label>
                <div className="flex gap-2">
                  {[
                    { value: '1', label: 'Fina' },
                    { value: '2', label: 'Média' },
                    { value: '4', label: 'Grossa' },
                  ].map((thickness) => (
                    <button
                      key={thickness.value}
                      onClick={() => updateEdgeData(targetId!, { thickness: thickness.value })}
                      className={`flex-1 rounded border py-1 text-xs font-medium transition-colors ${
                        (targetData.thickness || '1') === thickness.value
                          ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {thickness.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Animação do fluxo</label>
                <button
                  onClick={() => updateEdgeData(targetId!, { animationEnabled: !edgeAnimationEnabled })}
                  className={`flex items-center justify-between rounded border px-3 py-2 text-xs font-medium transition-colors ${
                    edgeAnimationEnabled
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{selectedEdge?.type === 'reference' ? 'Movimento da referência' : 'Ligar animação'}</span>
                  <span className="inline-flex items-center gap-1">
                    {edgeAnimationEnabled ? <Pause size={12} /> : <Play size={12} />}
                    <span>{edgeAnimationEnabled ? 'Ligado' : 'Desligado'}</span>
                  </span>
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'energy', label: 'Energia' },
                    { value: 'subtle', label: 'Sutil' },
                    { value: 'tech', label: 'Tech' },
                  ].map((animation) => (
                    <button
                      key={animation.value}
                      onClick={() => updateEdgeData(targetId!, { animationStyle: animation.value })}
                      className={`rounded border py-1 text-xs font-medium transition-colors ${
                        edgeAnimationStyle === animation.value
                          ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {animation.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-4 text-slate-400">
                  {selectedEdge?.type === 'reference'
                    ? 'Referências mantêm movimento próprio por padrão. Use o botão acima para desligar só esta linha.'
                    : 'Use o botão acima para ativar ou desligar a animação desta linha específica, independente do fluxo global.'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Direção da animação</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'forward', label: 'Esq → Dir' },
                    { value: 'reverse', label: 'Inverter' },
                  ].map((direction) => (
                    <button
                      key={direction.value}
                      onClick={() => updateEdgeData(targetId!, { animationDirection: direction.value })}
                      className={`rounded border py-1 text-xs font-medium transition-colors ${
                        edgeAnimationDirection === direction.value
                          ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {direction.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!isEdge && isNoteNode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Aparência da nota</label>
                <div className="grid grid-cols-3 gap-2">
                  {NOTE_VARIANTS.map((variant) => (
                    <button
                      key={variant.value}
                      onClick={() => updateNodeData(targetId!, { noteVariant: variant.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        noteVariant === variant.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Leitura no canvas</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTE_LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      onClick={() => updateNodeData(targetId!, { noteLayout: layout.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        noteLayout === layout.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateNodeData(targetId!, { noteShowDescription: !(targetData.noteShowDescription !== false) }, false)}
                  className={`rounded-md border px-2.5 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    targetData.noteShowDescription !== false
                      ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  Mostrar descrição
                </button>
                <button
                  onClick={() => updateNodeData(targetId!, { noteShowChecklist: !(targetData.noteShowChecklist !== false) }, false)}
                  className={`rounded-md border px-2.5 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    targetData.noteShowChecklist !== false
                      ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  Mostrar checklist
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Prioridade</label>
                <div className="grid grid-cols-3 gap-2">
                  {NOTE_PRIORITIES.map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() => updateNodeData(targetId!, { notePriority: priority.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        notePriority === priority.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-2 dark:border-slate-800">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Manter em evidência</span>
                <button
                  onClick={() => updateNodeData(targetId!, { notePinned: !targetData.notePinned }, false)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    targetData.notePinned
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {targetData.notePinned ? 'Ligado' : 'Desligado'}
                </button>
              </div>

              <TextInput
                label="Checklist da nota"
                value={String(targetData.noteChecklist || '')}
                onChange={(value) => updateNodeData(targetId!, { noteChecklist: value }, true)}
                onBlurSave={(value) => updateNodeData(targetId!, { noteChecklist: value }, false)}
                isTextArea
                placeholder="Uma tarefa por linha. Clique na bolinha da nota para concluir."
              />
            </>
          )}

          {!isEdge && isImageNode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Upload local</label>
                <label className="cursor-pointer rounded-md border border-dashed border-slate-300 px-2.5 py-2 text-center text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Enviar JPG, PNG, WEBP, GIF
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg"
                    className="hidden"
                    onChange={(event) => {
                      handleImageFileUpload(event.target.files?.[0] || null);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>

              <TextInput
                label="URL da imagem"
                value={String(targetData.imageUrl || '')}
                onChange={(value) => updateNodeData(targetId!, { imageUrl: value }, true)}
                onBlurSave={(value) => updateNodeData(targetId!, { imageUrl: value }, false)}
                placeholder="https://..."
              />

              {String(targetData.imageUrl || '').trim() ? (
                <button
                  onClick={() => updateNodeData(targetId!, { imageUrl: '' }, false)}
                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Remover imagem atual
                </button>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Ajuste da imagem</label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_FIT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNodeData(targetId!, { imageFit: option.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        imageFit === option.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Moldura</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_FRAME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNodeData(targetId!, { imageFrame: option.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        imageFrame === option.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Filtro</label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNodeData(targetId!, { imageFilter: option.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        imageFilter === option.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Alinhamento da legenda</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_CAPTION_ALIGN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNodeData(targetId!, { imageCaptionAlign: option.value }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        imageCaptionAlign === option.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-2 dark:border-slate-800">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Mostrar fonte (domínio)</span>
                <button
                  onClick={() => updateNodeData(targetId!, { imageShowDomain: !(targetData.imageShowDomain !== false) }, false)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    targetData.imageShowDomain !== false
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {targetData.imageShowDomain !== false ? 'Ligado' : 'Desligado'}
                </button>
              </div>
            </>
          )}

          {!isEdge && isGroupNode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Estilo do grupo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'glass', label: 'Vidro' },
                    { value: 'solid', label: 'Sólido' },
                    { value: 'outline', label: 'Outline' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNodeData(targetId!, { groupVariant: option.value as 'glass' | 'solid' | 'outline' }, false)}
                      className={`rounded border py-1 text-[10px] font-medium transition-colors ${
                        groupVariant === option.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Largura</label>
                  <input
                    type="number"
                    value={groupWidth}
                    min={260}
                    max={1800}
                    onChange={(event) => updateNodeData(targetId!, { groupWidth: parseInteger(event.target.value) }, true)}
                    onBlur={(event) => updateNodeData(targetId!, { groupWidth: parseInteger(event.target.value) }, false)}
                    className="rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Altura</label>
                  <input
                    type="number"
                    value={groupHeight}
                    min={180}
                    max={1400}
                    onChange={(event) => updateNodeData(targetId!, { groupHeight: parseInteger(event.target.value) }, true)}
                    onBlur={(event) => updateNodeData(targetId!, { groupHeight: parseInteger(event.target.value) }, false)}
                    className="rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Padding interno</label>
                <input
                  type="range"
                  min={12}
                  max={120}
                  value={groupPadding}
                  onChange={(event) => updateNodeData(targetId!, { groupPadding: parseInteger(event.target.value) }, true)}
                  onMouseUp={(event) => updateNodeData(targetId!, { groupPadding: parseInteger((event.target as HTMLInputElement).value) }, false)}
                  className="w-full"
                />
                <span className="text-[10px] text-slate-400">{groupPadding}px</span>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800">
                <button
                  onClick={handleGroupCaptureSelection}
                  className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/35"
                >
                  Capturar nós selecionados no grupo
                </button>
                <button
                  onClick={handleGroupAutoFit}
                  disabled={groupChildren.length === 0}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Autoajustar grupo ao conteúdo
                </button>
                <button
                  onClick={handleGroupReleaseChildren}
                  disabled={groupChildren.length === 0}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/35"
                >
                  Soltar todos os nós do grupo ({groupChildren.length})
                </button>
              </div>
            </>
          )}

          {!isEdge && (
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2.5 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Comentários</label>
                <span className="text-[10px] text-slate-400">{nodeComments.filter((comment) => !comment.resolved).length} abertos</span>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addComment();
                    }
                  }}
                  placeholder="Adicionar comentário..."
                  className="w-full rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:focus:border-slate-600"
                />
                <button
                  onClick={addComment}
                  className="rounded-md border border-slate-200 px-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Adicionar comentário"
                >
                  <MessageSquarePlus size={14} />
                </button>
              </div>

              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
                {nodeComments.length === 0 && <div className="text-[11px] text-slate-400">Sem comentários neste nó.</div>}
                {nodeComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`rounded-md border px-2 py-1.5 text-xs ${
                      comment.resolved
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <div className="mb-1 break-words">{comment.text}</div>
                    <div className="flex items-center justify-between text-[10px] opacity-85">
                      <button
                        onClick={() => toggleCommentResolved(comment.id)}
                        className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {comment.resolved ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                        {comment.resolved ? 'Resolvido' : 'Aberto'}
                      </button>
                      <button
                        onClick={() => removeComment(comment.id)}
                        className="rounded px-1 py-0.5 text-red-500 hover:bg-red-500/10"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEdge && selectedNode?.type === 'idea' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Status</label>
              <div className="flex gap-2">
                {[
                  { value: undefined, label: 'Nenhum', color: 'bg-slate-300' },
                  { value: 'active', label: 'Ativo', color: 'bg-emerald-500' },
                  { value: 'pending', label: 'Pendente', color: 'bg-amber-500' },
                  { value: 'completed', label: 'Concluído', color: 'bg-blue-500' },
                ].map((status) => (
                  <button
                    key={status.label}
                    onClick={() => updateNodeData(targetId!, { status: status.value as MindFlowNode['data']['status'] }, false)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded border py-1.5 text-[10px] font-medium transition-colors ${
                      (targetData.status || undefined) === status.value
                        ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${status.color}`} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFunnelNode && (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Resumo do funil</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded bg-white px-2 py-1 dark:bg-slate-950">
                    <span className="text-slate-500">Saída</span>
                    <div className="font-mono font-semibold">{funnelSummary?.finalTraffic.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="rounded bg-white px-2 py-1 dark:bg-slate-950">
                    <span className="text-slate-500">Conversão</span>
                    <div className="font-mono font-semibold">{funnelSummary?.totalConversion.toFixed(1)}%</div>
                  </div>
                  <div className="rounded bg-white px-2 py-1 dark:bg-slate-950">
                    <span className="text-slate-500">Custo</span>
                    <div className="font-mono font-semibold">R$ {(funnelSummary?.totalCost || 0).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="rounded bg-white px-2 py-1 dark:bg-slate-950">
                    <span className="text-slate-500">Receita</span>
                    <div className="font-mono font-semibold">R$ {(funnelSummary?.totalRevenue || 0).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Tráfego inicial</label>
                <input
                  type="number"
                  value={startingTraffic || ''}
                  placeholder="Ex: 10000"
                  onChange={(event) => {
                    const nextTraffic = Math.max(0, parseInteger(event.target.value));
                    updateFunnelData(
                      {
                        startingTraffic: nextTraffic,
                        funnelStages: calculateFunnelStages(funnelStages, nextTraffic),
                      },
                      true,
                    );
                  }}
                  onBlur={(event) => {
                    const nextTraffic = Math.max(0, parseInteger(event.target.value));
                    updateFunnelData(
                      {
                        startingTraffic: nextTraffic,
                        funnelStages: calculateFunnelStages(funnelStages, nextTraffic),
                      },
                      false,
                    );
                  }}
                  className="rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
                {FUNNEL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="rounded border border-pink-400/40 px-2 py-1 text-[10px] font-medium text-pink-600 transition-colors hover:bg-pink-500/10 dark:text-pink-300"
                  >
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Etapas</label>
                <button
                  onClick={addFunnelStage}
                  className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus size={10} />
                  Etapa
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {funnelStages.map((stage) => (
                  <div key={stage.id} className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(event) => updateFunnelStage(stage.id, { name: event.target.value }, true)}
                        onBlur={(event) => updateFunnelStage(stage.id, { name: event.target.value }, false)}
                        className="w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:focus:border-slate-600"
                      />
                      <button
                        onClick={() => removeFunnelStage(stage.id)}
                        className="rounded border border-red-200 px-2 py-1 text-[10px] text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded bg-slate-50 px-2 py-1 dark:bg-slate-900">
                        <div className="text-slate-500">Entrada</div>
                        <div className="font-mono">{stage.trafficIn?.toLocaleString('pt-BR') || 0}</div>
                      </div>
                      <div className="rounded bg-slate-50 px-2 py-1 dark:bg-slate-900">
                        <div className="text-slate-500">Saída</div>
                        <div className="font-mono">{stage.trafficOut?.toLocaleString('pt-BR') || 0}</div>
                      </div>
                      <div className="rounded bg-slate-50 px-2 py-1 dark:bg-slate-900">
                        <div className="text-slate-500">Perda</div>
                        <div className="font-mono">{stage.dropOff?.toLocaleString('pt-BR') || 0}</div>
                      </div>
                      <div className="rounded bg-slate-50 px-2 py-1 dark:bg-slate-900">
                        <div className="text-slate-500">Acumulada</div>
                        <div className="font-mono">
                          {startingTraffic > 0 ? (((stage.trafficOut || 0) / startingTraffic) * 100).toFixed(1) : '0.0'}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={stage.conversionRate}
                        onChange={(event) =>
                          updateFunnelStage(stage.id, { conversionRate: Math.min(100, Math.max(0, parseInteger(event.target.value))) }, true)
                        }
                        onBlur={(event) =>
                          updateFunnelStage(stage.id, { conversionRate: Math.min(100, Math.max(0, parseInteger(event.target.value))) }, false)
                        }
                        className="rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                        placeholder="Conversão %"
                      />
                      <input
                        type="text"
                        value={stage.owner || ''}
                        onChange={(event) => updateFunnelStage(stage.id, { owner: event.target.value }, true)}
                        onBlur={(event) => updateFunnelStage(stage.id, { owner: event.target.value }, false)}
                        className="rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                        placeholder="Responsável"
                      />
                      <input
                        type="number"
                        value={stage.cost || 0}
                        onChange={(event) => updateFunnelStage(stage.id, { cost: parseCurrency(event.target.value) }, true)}
                        onBlur={(event) => updateFunnelStage(stage.id, { cost: parseCurrency(event.target.value) }, false)}
                        className="rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                        placeholder="Custo"
                      />
                      <input
                        type="number"
                        value={stage.revenue || 0}
                        onChange={(event) => updateFunnelStage(stage.id, { revenue: parseCurrency(event.target.value) }, true)}
                        onBlur={(event) => updateFunnelStage(stage.id, { revenue: parseCurrency(event.target.value) }, false)}
                        className="rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                        placeholder="Receita"
                      />
                    </div>

                    <textarea
                      value={stage.notes || ''}
                      onChange={(event) => updateFunnelStage(stage.id, { notes: event.target.value }, true)}
                      onBlur={(event) => updateFunnelStage(stage.id, { notes: event.target.value }, false)}
                      placeholder="Observações da etapa"
                      className="mt-2 min-h-[52px] w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:focus:border-slate-600"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-shrink-0 gap-2 border-t border-slate-200 bg-white pt-4 dark:border-slate-800 dark:bg-slate-950">
        {!isEdge && canDetachNode && (
          <button
            onClick={handleDetachNode}
            disabled={connectedEdgesCount === 0}
            title="Remove todas as conexões do nó selecionado"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-300 dark:hover:bg-amber-900/25"
          >
            <Unlink2 size={14} />
            Desconectar {connectedEdgesCount > 0 ? `(${connectedEdgesCount})` : ''}
          </button>
        )}
        {!isEdge && (
          <button
            onClick={handleDuplicate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Copy size={14} />
            Duplicar
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          {isFunnelNode ? 'Excluir funil' : 'Excluir'}
        </button>
      </div>
    </div>
  );
};
