// Allow process.env usage without @types/node
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

export type TradeType = 'Achat' | 'Vente';
export type CashTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'TAX_ADJUSTMENT' | 'CUSTODY_FEE' | 'SUBSCRIPTION';

export interface Trade {
  id?: string; // Unique identifier for CRUD operations
  date: string;
  type: TradeType;
  ticker: string;
  qty: number;
  price: number;
  notes?: string;
  // Calculated fields
  calculatedFees?: number;
  calculatedTax?: number;
  netAmount?: number;
  realizedPnL?: number;
  taxableGain?: number;
}

export interface Position {
  ticker: string;
  qty: number;
  avgCost: number; // PRU (Prix de Revient Unitaire) including fees
  totalCost: number;
  marketPrice: number; 
  marketValue: number;
  unrealizedPnL: number;
  breakEven: number; // Price needed to exit with 0 profit after sell fees
  totalSoldVal: number;
  realizedPnL: number; // Total realized profit/loss after tax
  totalFeesPaid: number;
  totalTaxPaid: number;
  buyCount: number;
  sellCount: number;
}

export interface MonthlyMetric {
  month: string;
  buys: number;
  sells: number;
  trades: number;
  fees: number;
}

export interface TickerFrequency {
  ticker: string;
  count: number;
}

export interface PortfolioSummary {
    totalBuys: number;
    totalSells: number;
    netInvested: number;
    totalMarketValue: number;
    totalUnrealizedPnL: number;
    uniqueTickers: number;
    tradeCount: number;
    totalFees: number;
    totalTaxes: number;
    totalRealizedPnL: number;
    winRate: number;
    // Advanced Quant Metrics
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    kellyPercent: number;
    expectancy: number;
}

export interface CashTransaction {
    id?: string;
    date: string;
    type: CashTransactionType;
    amount: number;
    description: string;
}

export interface PriceAlert {
    id: string;
    ticker: string;
    threshold: number;
    condition: 'ABOVE' | 'BELOW'; // 'ABOVE' = >= Threshold, 'BELOW' = <= Threshold
}