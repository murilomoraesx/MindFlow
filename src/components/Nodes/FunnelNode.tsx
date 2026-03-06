import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MindFlowNode, FunnelStage } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';
import { ChevronDown, ChevronUp, LayoutList, MessageSquare, Zap } from 'lucide-react';
import { buildStagesFromTemplate, calculateFunnelStages, FUNNEL_TEMPLATES, getFunnelSummary } from '../../utils/funnel';

export const FunnelNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const [isExpanded, setIsExpanded] = useState(!!data.funnelExpanded);
  const [showTemplates, setShowTemplates] = useState(false);
  const { updateNodeData, setShowStylePanel } = useFlowStore();
  const funnelColor = typeof data.color === 'string' && data.color.trim().length > 0 ? data.color : '#DC2626';

  const startingTraffic = (data.startingTraffic as number) || 0;
  const rawStages: FunnelStage[] = (data.funnelStages as FunnelStage[] | undefined) || [];
  const stages = useMemo(() => calculateFunnelStages(rawStages, startingTraffic), [rawStages, startingTraffic]);
  const summary = useMemo(() => getFunnelSummary(stages, startingTraffic), [stages, startingTraffic]);
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;

  const parsedColor = useMemo(() => {
    const normalized = funnelColor.trim();
    const source = normalized.startsWith('#') ? normalized.slice(1) : normalized;
    const hex = source.length === 3 ? source.split('').map((char) => `${char}${char}`).join('') : source;
    if (hex.length !== 6) return null;
    const int = Number.parseInt(hex, 16);
    if (Number.isNaN(int)) return null;
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }, [funnelColor]);

  const toAlpha = (alpha: number) => {
    if (!parsedColor) return `rgba(236,72,153,${alpha})`;
    return `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${alpha})`;
  };

  const toggleExpand = (event: React.MouseEvent) => {
    event.stopPropagation();
    const next = !isExpanded;
    setIsExpanded(next);
    updateNodeData(id, { funnelExpanded: next }, false);
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = FUNNEL_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const nextStartingTraffic = startingTraffic > 0 ? startingTraffic : 10000;
    const nextStages = buildStagesFromTemplate(template, nextStartingTraffic);

    updateNodeData(
      id,
      {
        label: template.label,
        startingTraffic: nextStartingTraffic,
        funnelStages: nextStages,
        funnelExpanded: true,
      },
      false,
    );

    setIsExpanded(true);
    setShowTemplates(false);
  };

  return (
    <div
      className={cn(
        'relative flex min-w-[260px] flex-col rounded-xl border-2 bg-white shadow-lg dark:bg-[#1e1e2e]',
      )}
      style={{
        borderColor: selected ? funnelColor : toAlpha(0.32),
        boxShadow: selected ? `0 12px 30px ${toAlpha(0.24)}` : `0 10px 24px ${toAlpha(0.12)}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="h-3 w-3 rounded-full border-none" style={{ backgroundColor: funnelColor }} />

      <button
        className="flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={toggleExpand}
        onDoubleClick={(event) => {
          event.stopPropagation();
          setShowStylePanel(true);
        }}
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: funnelColor }}>
            {data.label}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-300">
            {stages.length} etapa{stages.length === 1 ? '' : 's'} • {summary.totalConversion.toFixed(1)}% total
          </span>
        </div>
        {openComments > 0 && (
          <span className="mr-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
            <MessageSquare size={10} />
            {openComments}
          </span>
        )}
        {isExpanded ? <ChevronUp size={14} style={{ color: funnelColor }} /> : <ChevronDown size={14} style={{ color: funnelColor }} />}
      </button>

      <div className="grid grid-cols-3 gap-2 border-y border-slate-200 px-4 py-2 text-[10px] dark:border-white/10">
        <div className="rounded bg-slate-100 px-2 py-1 dark:bg-white/5">
          <div className="text-slate-500 dark:text-slate-400">Entrada</div>
          <div className="font-mono font-semibold text-slate-900 dark:text-white">{startingTraffic.toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded bg-slate-100 px-2 py-1 dark:bg-white/5">
          <div className="text-slate-500 dark:text-slate-400">Saida</div>
          <div className="font-mono font-semibold text-slate-900 dark:text-white">{summary.finalTraffic.toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded bg-slate-100 px-2 py-1 dark:bg-white/5">
          <div className="text-slate-500 dark:text-slate-400">Perda</div>
          <div className="font-mono font-semibold text-slate-900 dark:text-white">{summary.totalDropOff.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 py-3">
          {stages.length === 0 ? (
            <div
              className="rounded-lg border border-dashed p-3"
              style={{
                borderColor: toAlpha(0.38),
                backgroundColor: toAlpha(0.06),
              }}
            >
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Aplique um template para iniciar o funil.</p>
              <div className="flex flex-wrap gap-1.5">
                {FUNNEL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleApplyTemplate(template.id);
                    }}
                    className="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
                    style={{
                      borderColor: toAlpha(0.38),
                      color: funnelColor,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="relative flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-white/10 dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-100">{stage.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {stage.conversionRate}% • {stage.trafficOut?.toLocaleString('pt-BR') || 0}
                    </div>
                  </div>
                  <div className="ml-2 text-[10px] font-mono" style={{ color: funnelColor }}>{index + 1}</div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`stage-${stage.id}`}
                    className="!-right-1 h-2 w-2 !rounded-full !border-none"
                    style={{ backgroundColor: funnelColor }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowStylePanel(true);
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LayoutList size={12} />
              Editar no painel
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowTemplates(!showTemplates);
              }}
              className="flex items-center justify-center rounded-md border px-2 py-1.5 transition-colors"
              style={{ borderColor: toAlpha(0.38), color: funnelColor }}
              title="Templates"
            >
              <Zap size={12} />
            </button>
          </div>

          {showTemplates && (
            <div className="mt-2 flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#1e1e2e]">
              {FUNNEL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleApplyTemplate(template.id);
                  }}
                  className="rounded px-2 py-1 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  {template.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="right" className="h-3 w-3 rounded-full border-none" style={{ backgroundColor: funnelColor }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="h-3 w-3 rounded-full border-none" style={{ backgroundColor: funnelColor }} />
    </div>
  );
});
