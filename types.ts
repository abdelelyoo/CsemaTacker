
export enum TransactionType {
  BUY = 'Achat',
  SELL = 'Vente'
}

export enum BankOperationType {
  DEPOSIT = 'Depot',
  WITHDRAWAL = 'Retrait',
  DIVIDEND = 'Dividende',
  TAX = 'Taxe',
  BANK_FEE = 'Frais',
  SUBSCRIPTION = 'Abonnement'
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
  operationType?: 'TRADE'; // Distinguishes from bank operations
}

// Bank Operations - Cash movements separate from trades
export interface BankOperation {
  id?: number;
  Date: string;
  parsedDate: Date;
  Operation: BankOperationType;
  Description?: string; // e.g., "Tax Authority", "Monthly Fee"
  Amount: number; // Positive for deposits/dividends, negative for fees/taxes/withdrawals
  Category: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'TAX' | 'BANK_FEE' | 'SUBSCRIPTION';
  Reference?: string; // Optional reference number
}

// Combined view for calculations
export type PortfolioOperation = Transaction | BankOperation;

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
  totalWithdrawals: number; // NEW: Track withdrawals separately
  holdings: Holding[];
  cashBalance: number;
  
  // Fee Breakdown
  totalTradingFees: number; // Commissions on Buy/Sell
  totalCustodyFees: number; // Account maintenance (CUS fees from separate fees table)
  totalSubscriptionFees: number; // Subscription fees (SUB fees)
  totalBankFees: number; // Bank fees from bank operations
  netTaxImpact: number; // Taxes paid from bank operations
  
  history: PerformancePoint[]; // Historical performance data
  
  // Separate data sources
  enrichedTransactions: Transaction[]; // Stock trades only
  bankOperations: BankOperation[]; // Cash movements only
}

export interface SectorAlloc {
  name: string;
  value: number;
  percentage: number;
}

export interface AIAnalysisResult {
  markdown: string;
}

// Profile Data Interfaces
export interface CompanyProfile {
  id?: number;
  ticker: string; // Primary key (e.g., "NKL", "AKT")
  name: string;
  sector: string; // from TICKER_TO_SECTOR
  headquarters?: string;
  website?: string;
  phone?: string;
  fax?: string;
  auditors?: string[];
  date_of_incorporation?: string;
  introduction_date_bourse?: string;
  fiscal_year_duration_months?: number;
  investor_relations_person?: string;
  investor_relations_email?: string;
  investor_relations_phone?: string;
  flottant?: number; // Free float percentage
}

export interface ManagementMember {
  id?: number;
  ticker: string;
  role: string;
  name: string;
}

export interface FinancialFigure {
  id?: number;
  ticker: string;
  year: number;
  consolidated_accounts?: boolean;
  revenue?: number;
  operating_income?: number;
  net_income_group_share?: number;
  shareholders_equity?: number;
  shares_outstanding?: number;
  capital_social?: number;
}

export interface FinancialRatio {
  id?: number;
  ticker: string;
  year: number;
  eps_bpa?: number;
  roe_percent?: number;
  per?: number; // P/E ratio
  pbr?: number; // P/B ratio
  payout_percent?: number;
  dividend_yield_percent?: number;
}

export interface DividendRecord {
  id?: number;
  ticker: string;
  year: number;
  amount: number; // per share
  type?: string; // "Ordinaire", etc.
  ex_date?: Date;
  detachment_date?: Date;
  payment_date?: Date;
}

export interface Shareholder {
  id?: number;
  ticker: string;
  name: string;
  percentage: number;
  as_of_date?: Date;
}

export interface CapitalEvent {
  id?: number;
  ticker: string;
  date: Date;
  event_type: 'capital_increase' | 'threshold_crossing';
  description: string;
  shares_variation?: number;
  nature?: string;
  threshold_percent?: number;
  declarant?: string;
  direction?: 'Hausse' | 'Baisse';
}