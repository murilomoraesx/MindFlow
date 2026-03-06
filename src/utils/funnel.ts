import { v4 as uuidv4 } from 'uuid';
import type { FunnelStage } from '../types';

type FunnelStageType = FunnelStage['type'];

interface TemplateStage {
  type: FunnelStageType;
  name: string;
  conversionRate: number;
}

export interface FunnelTemplate {
  id: string;
  label: string;
  stages: TemplateStage[];
}

export const STAGE_TYPE_LABELS: Record<FunnelStageType, string> = {
  entrada: 'Entrada',
  pagina: 'Pagina',
  formulario: 'Formulario',
  acao: 'Acao',
  saida: 'Saida',
};

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: 'vendas',
    label: 'Funil de Vendas',
    stages: [
      { type: 'entrada', name: 'Visitantes', conversionRate: 100 },
      { type: 'pagina', name: 'Pagina de Oferta', conversionRate: 45 },
      { type: 'formulario', name: 'Lead Capturado', conversionRate: 35 },
      { type: 'acao', name: 'Checkout', conversionRate: 28 },
      { type: 'saida', name: 'Compra Concluida', conversionRate: 72 },
    ],
  },
  {
    id: 'leads',
    label: 'Captura de Leads',
    stages: [
      { type: 'entrada', name: 'Trafego', conversionRate: 100 },
      { type: 'pagina', name: 'Landing Page', conversionRate: 38 },
      { type: 'formulario', name: 'Formulario', conversionRate: 62 },
      { type: 'saida', name: 'Lead Qualificado', conversionRate: 74 },
    ],
  },
  {
    id: 'webinar',
    label: 'Lançamento Web',
    stages: [
      { type: 'entrada', name: 'Anuncio', conversionRate: 100 },
      { type: 'pagina', name: 'Pagina Webinar', conversionRate: 30 },
      { type: 'pagina', name: 'Pagina de Aquece', conversionRate: 65 },
      { type: 'acao', name: 'Inscricao', conversionRate: 42 },
      { type: 'formulario', name: 'Cadastro', conversionRate: 70 },
      { type: 'saida', name: 'Participante', conversionRate: 58 },
    ],
  },
];

export const clampConversionRate = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export const calculateFunnelStages = (
  rawStages: FunnelStage[],
  startingTraffic: number,
): FunnelStage[] => {
  const safeStartingTraffic = Number.isFinite(startingTraffic) ? Math.max(0, Math.floor(startingTraffic)) : 0;
  let currentTraffic = safeStartingTraffic;

  return rawStages.map((stage, index) => {
    const conversionRate = clampConversionRate(stage.conversionRate);
    const trafficIn = index === 0 ? safeStartingTraffic : currentTraffic;
    const trafficOut = Math.floor(trafficIn * (conversionRate / 100));
    const dropOff = Math.max(0, trafficIn - trafficOut);
    currentTraffic = trafficOut;

    return {
      ...stage,
      conversionRate,
      trafficIn,
      trafficOut,
      dropOff,
      cost: Number.isFinite(stage.cost) ? Number(stage.cost) : 0,
      revenue: Number.isFinite(stage.revenue) ? Number(stage.revenue) : 0,
      owner: stage.owner || '',
      notes: stage.notes || '',
    };
  });
};

export const buildStagesFromTemplate = (
  template: FunnelTemplate,
  startingTraffic: number,
): FunnelStage[] => {
  const baseStages = template.stages.map((stage) => ({
    id: uuidv4(),
    type: stage.type,
    name: stage.name,
    conversionRate: stage.conversionRate,
    cost: 0,
    revenue: 0,
    owner: '',
    notes: '',
  }));

  return calculateFunnelStages(baseStages, startingTraffic);
};

export const createDefaultStage = (index: number): FunnelStage => {
  return {
    id: uuidv4(),
    type: 'pagina',
    name: `Etapa ${index + 1}`,
    conversionRate: 50,
    cost: 0,
    revenue: 0,
    owner: '',
    notes: '',
  };
};

export const getFunnelSummary = (stages: FunnelStage[], startingTraffic: number) => {
  const safeStartingTraffic = Math.max(0, Math.floor(startingTraffic || 0));
  const lastStage = stages[stages.length - 1];
  const finalTraffic = lastStage?.trafficOut ?? safeStartingTraffic;
  const totalDropOff = Math.max(0, safeStartingTraffic - finalTraffic);
  const totalConversion = safeStartingTraffic > 0 ? (finalTraffic / safeStartingTraffic) * 100 : 0;
  const totalCost = stages.reduce((acc, stage) => acc + (stage.cost || 0), 0);
  const totalRevenue = stages.reduce((acc, stage) => acc + (stage.revenue || 0), 0);

  return {
    finalTraffic,
    totalDropOff,
    totalConversion,
    totalCost,
    totalRevenue,
  };
};
