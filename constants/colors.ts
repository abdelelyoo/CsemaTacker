/**
 * Centralized Color Constants
 * Consistent colors across all visualizations
 */

export const CHART_COLORS = {
  // Semantic colors
  POSITIVE: '#10b981',
  NEGATIVE: '#ef4444',
  NEUTRAL: '#6b7280',
  
  // Primary palette (green-first for positive/gains)
  PRIMARY: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'],
  
  // Sectors (purple-first - different ordering for visual distinction)
  SECTORS: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'],
  
  // Holdings/Assets (for pie charts)
  HOLDINGS: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'],
} as const;

// Quality Grade colors
export const GRADE_COLORS = {
  A: '#10b981',  // Green - Excellent
  B: '#3b82f6',  // Blue - Good
  C: '#f59e0b',  // Amber - Average
  D: '#f97316',  // Orange - Below average
  F: '#ef4444',  // Red - Poor
} as const;

// Risk level colors
export const RISK_COLORS = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  EXTREME: '#ef4444',
} as const;

// Technical indicator colors
export const TECHNICAL_COLORS = {
  BULLISH: '#10b981',
  BEARISH: '#ef4444',
  NEUTRAL: '#6b7280',
} as const;

// Performance colors (for heatmaps, etc.)
export const PERFORMANCE_COLORS = {
  STRONG_GAIN: '#10b981',
  GAIN: '#34d399',
  SLIGHT_GAIN: '#6ee7b7',
  FLAT: '#d1d5db',
  SLIGHT_LOSS: '#fca5a5',
  LOSS: '#f87171',
  STRONG_LOSS: '#ef4444',
} as const;

// Chart background colors
export const CHART_BG = {
  LIGHT: '#ffffff',
  DARK: '#1e293b',
  GRID: '#e2e8f0',
} as const;

// Text colors
export const TEXT_COLORS = {
  PRIMARY: '#1e293b',
  SECONDARY: '#64748b',
  MUTED: '#94a3b8',
} as const;

export type GradeColor = keyof typeof GRADE_COLORS;
export type RiskColor = keyof typeof RISK_COLORS;

/**
 * Get color for a quality grade
 */
export function getGradeColor(grade: string | undefined): string {
  if (!grade) return CHART_COLORS.NEUTRAL;
  return GRADE_COLORS[grade.toUpperCase() as GradeColor] || CHART_COLORS.NEUTRAL;
}

/**
 * Get color for a risk level
 */
export function getRiskColor(level: string | undefined): string {
  if (!level) return CHART_COLORS.NEUTRAL;
  return RISK_COLORS[level.toUpperCase() as RiskColor] || CHART_COLORS.NEUTRAL;
}
