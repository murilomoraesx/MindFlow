export const COLORS = {
  purple: '#8B5CF6',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  gray: '#5C5C72',
};

export const SHARED_COLOR_PALETTE = [
  '#64748B',
  '#0F172A',
  '#18304A',
  '#0256DE',
  '#3B82F6',
  '#06B6D4',
  '#22C55E',
  '#C0E700',
  '#B0FA36',
  '#EAB308',
  '#F97316',
  '#EF4444',
  '#D01D80',
  '#D946EF',
  '#F43F5E',
  '#FFFFFF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
] as const;

export const GRADIENTS = {
  idea: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
  funnel: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
  note: 'linear-gradient(135deg, #F59E0B, #EF4444)',
  group: 'linear-gradient(135deg, #10B981, #06B6D4)',
};

export const THEMES = {
  dark: {
    bgPrimary: '#0F0F14',
    bgSecondary: '#1A1A24',
    bgSurface: '#242433',
    bgHover: '#2E2E42',
    textPrimary: '#F1F1F6',
    textSecondary: '#9393A8',
    textMuted: '#5C5C72',
    borderSubtle: '#2A2A3C',
    borderActive: '#8B5CF6',
  },
  light: {
    bgPrimary: '#F8F9FC',
    bgSecondary: '#FFFFFF',
    bgSurface: '#FFFFFF',
    bgHover: '#F1F3F8',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    borderSubtle: '#E5E7EB',
    borderActive: '#8B5CF6',
  }
};
