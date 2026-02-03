
export enum TransactionType {
  BUY = 'Achat',
  SELL = 'Vente',
  DEPOSIT = 'Depot',
  WITHDRAWAL = 'Retrait',
  DIVIDEND = 'Dividende',
  TAX = 'Taxe',
  FEE = 'Frais'
}

export type FeeType = 'CUS' | 'SUB';

export interface FeeRecord {
  id?: number;
  date: Date;
  type: FeeType;
  amount: number;
  description?: string;
}

export interface RawTransaction {
  Date: string;
  Company: string;
  ISIN: string;
  Operation: string;
  Ticker: string;
  Qty: number;
  Price: number;
  Total: number;
  Fees?: number;
  Tax?: number;
  RealizedPL?: number;
}

export interface Transaction extends RawTransaction {
  parsedDate: Date;
  id?: number; // Optional for new records (auto-increment in DB)
}

export interface Holding {
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  averageCost: number; // Net Cost Basis (includes fees)
  averagePrice: number; // Gross Price Basis (excludes fees, for Tax calc)
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number; // Profit/Loss
  unrealizedPLPercent: number;
  allocation: number; // % of total portfolio
  transactionCount: number;
  breakEvenPrice: number;
  // Execution Analysis (VWAP)
  buyVWAP: number;
  buyVolume: number;
  sellVWAP: number;
  sellVolume: number;
}

export interface PerformancePoint {
  date: string; // ISO Date YYYY-MM-DD
  value: number; // Total Equity
  invested: number; // Net Invested Capital
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalDividends: number;
  totalDeposits: number;
  holdings: Holding[];
  cashBalance: number;
  // Fee Breakdown
  totalTradingFees: number; // Commissions on Buy/Sell
  totalCustodyFees: number; // Account maintenance
  netTaxImpact: number; // Taxes paid (negative) or refunded (positive)
  history: PerformancePoint[]; // Historical performance data
  enrichedTransactions: Transaction[]; // Transactions with calculated/inferred fees, taxes, and P&L
}

export interface SectorAlloc {
  name: string;
  value: number;
  percentage: number;
}

export interface AIAnalysisResult {
  markdown: string;
}