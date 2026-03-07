/**
 * Centralized Metrics Types
 * Shared type definitions for metrics across the application
 */

// Risk metrics from portfolio analysis
export interface RiskMetrics {
  volatility: number;
  var95: number;
  var95Percent: number;
  sharpe: number;
  maxDrawdown: number;
  hhi?: number;
  effectiveDiversification?: number;
  riskLevel?: 'low' | 'moderate' | 'high' | 'extreme';
}

// Trading performance metrics
export interface TradingMetrics {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  kellyPercent: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
}

// Quality metrics from tvscreener/market data
export interface QualityMetrics {
  qualityScore: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  roe?: number;
  roa?: number;
  grossMargin?: number;
  netMargin?: number;
}

// Valuation metrics from tvscreener/market data
export interface ValuationMetrics {
  peRatio?: number;
  pbRatio?: number;
  pegRatio?: number;
  dividendYield?: number;
  marketCap?: number;
  signal: 'undervalued' | 'fair' | 'overvalued';
}

// Technical metrics from tvscreener
export interface TechnicalMetrics {
  rsi14?: number;
  sma50?: number;
  sma200?: number;
  techRating?: string | number;
  trend?: 'bullish' | 'bearish' | 'neutral';
}

// Combined stock metrics (from market data)
export interface StockMetrics extends QualityMetrics, ValuationMetrics, TechnicalMetrics {
  ticker: string;
  name?: string;
  sector?: string;
  price?: number;
  changePercent?: number;
  lastUpdated?: string;
}

// Portfolio-level metrics
export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  cashBalance: number;
  allocation: number;
}

// Dividend metrics
export interface DividendMetrics {
  annualIncome: number;
  currentYield: number;
  yieldOnCost?: number;
  dividendGrowth?: number;
  payoutRatio?: number;
}

// Performance metrics
export interface PerformanceMetrics {
  cagr?: number;
  totalReturn?: number;
  ytdReturn?: number;
  month1Return?: number;
  month3Return?: number;
  month6Return?: number;
  year1Return?: number;
}

// Combined context for MetricsContext
export interface MetricsContextValue {
  // Ticker navigation
  selectedTicker: string | null;
  setSelectedTicker: (ticker: string | null) => void;
  
  // Portfolio metrics
  portfolioMetrics: PortfolioMetrics;
  setPortfolioMetrics: (metrics: PortfolioMetrics) => void;
  
  // Trading metrics (from Money Mgmt)
  tradingMetrics: TradingMetrics;
  setTradingMetrics: (metrics: TradingMetrics) => void;
  
  // Risk metrics (from Money Mgmt + Risk Dashboard)
  riskMetrics: RiskMetrics;
  setRiskMetrics: (metrics: RiskMetrics) => void;
  
  // Market data cache (from tvscreener)
  marketData: Map<string, StockMetrics>;
  updateMarketData: (tickers: string[]) => Promise<void>;
  
  // Active tab tracking
  activeMainTab: string;
  activeSubTab: string;
  setActiveMainTab: (tab: string) => void;
  setActiveSubTab: (tab: string) => void;
  
  // Navigation helper
  navigateToAnalysis: (ticker: string) => void;
}

// Helper type for creating default metrics
export function createDefaultTradingMetrics(): TradingMetrics {
  return {
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    kellyPercent: 0,
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
  };
}

export function createDefaultRiskMetrics(): RiskMetrics {
  return {
    volatility: 0,
    var95: 0,
    var95Percent: 0,
    sharpe: 0,
    maxDrawdown: 0,
  };
}

export function createDefaultPortfolioMetrics(): PortfolioMetrics {
  return {
    totalValue: 0,
    totalCost: 0,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    cashBalance: 0,
    allocation: 0,
  };
}
