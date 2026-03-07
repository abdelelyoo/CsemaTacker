export interface Holding {
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  allocation: number;
}

export interface Portfolio {
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  cashBalance: number;
  totalUnrealizedPL: number;
  totalRealizedPL: number;
  totalDividends: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTradingFees: number;
  totalCustodyFees: number;
  totalSubscriptionFees: number;
  totalBankFees: number;
  totalTaxRefunds: number;
  history: PortfolioHistory[];
}

export interface PortfolioHistory {
  date: string;
  value: number;
  invested: number;
}

export interface Transaction {
  id?: number;
  Date: string;
  Company: string;
  ISIN?: string;
  Operation: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
  Ticker: string;
  Qty: number;
  Price: number;
  Total: number;
  Fees?: number;
  Tax?: number;
  RealizedPL?: number;
}

export interface MarketFilters {
  sector?: string;
  peMin?: number;
  peMax?: number;
  divYieldMin?: number;
  qualityGradeMin?: string;
  sortBy?: 'ticker' | 'price' | 'pe_ratio' | 'dividend_yield' | 'quality_score' | 'perf_1m' | 'perf_3m';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface TreemapNode {
  name: string;
  value: number;
  sector: string;
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  yield?: number;
  change?: number;
  rsi?: number;
  perf_1m?: number;
  perf_3m?: number;
  gross_margin?: number;
  net_margin?: number;
  metricValue?: number;
  children?: TreemapNode[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
  invested: number;
}

export interface TimeRange {
  label: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  days?: number;
}

export type TreemapMetric = 
  | 'pe_ratio' 
  | 'roe' 
  | 'dividend_yield' 
  | 'change_percent' 
  | 'rsi_14' 
  | 'perf_1m' 
  | 'perf_3m' 
  | 'pb_ratio' 
  | 'gross_margin' 
  | 'sector';

export type ChartScale = 'linear' | 'log';

export interface ErrorState {
  message: string;
  code?: string;
  details?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: ErrorState;
}

export interface DashboardState {
  timeRange: TimeRange['label'];
  chartScale: ChartScale;
  treemapMetric: TreemapMetric;
}