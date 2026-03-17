import { PortfolioSummary, Holding, Transaction, BankOperation } from '../types';
import { RiskMetrics, TradingMetrics, StockMetrics } from '../types/metrics';
import { logger, logContext } from '../utils/logger';

const GLM_API_URL = '/api/opencode/v1/chat/completions';
const GLM_API_KEY = import.meta.env.VITE_OPENCODE_API_KEY || import.meta.env.VITE_GLM_API_KEY || '';

if (!GLM_API_KEY) {
  logger.warn(logContext.AI, "VITE_OPENCODE_API_KEY or VITE_GLM_API_KEY is not set. GLM-5 AI features will be disabled.");
}

interface ComprehensiveAnalysisInput {
  portfolio: PortfolioSummary;
  transactions: Transaction[];
  bankOperations: BankOperation[];
  riskMetrics: RiskMetrics | null;
  tradingMetrics: TradingMetrics | null;
  marketData: Map<string, StockMetrics>;
  monteCarloStats?: {
    riskOfRuin: number;
    medianOutcome: number;
    worstCase: number;
    bestCase: number;
  };
  dividendData?: {
    annualIncome: number;
    currentYield: number;
    upcomingPayments: Array<{ ticker: string; amount: number; date: string }>;
  };
  signalData?: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    topSignals: Array<{ ticker: string; signal: string; strength: number }>;
  };
}

interface ComprehensiveAnalysisResult {
  markdown: string;
  actionItems: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    deadline: string;
    rationale: string;
  }>;
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  compositionScore: number;
}

const computePortfolioMetrics = (portfolio: PortfolioSummary) => {
  const holdings = portfolio.holdings || [];
  const history = portfolio.history || [];
  
  const totalValue = portfolio.totalValue || 0;
  const totalCost = portfolio.totalCost || 0;
  const totalRealizedPL = portfolio.totalRealizedPL || 0;
  const totalUnrealizedPL = portfolio.totalUnrealizedPL || 0;
  const totalDividends = portfolio.totalDividends || 0;
  const cashBalance = portfolio.cashBalance || 0;
  const holdingsCount = holdings.length;
  
  const totalFees = (portfolio.totalTradingFees || 0) + 
                    (portfolio.totalCustodyFees || 0) + 
                    (portfolio.totalSubscriptionFees || 0) + 
                    (portfolio.totalBankFees || 0);
  const feeDragPercent = totalValue > 0 ? (totalFees / totalValue) * 100 : 0;
  
  const totalReturn = totalRealizedPL + totalUnrealizedPL;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const unrealizedReturnPercent = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
  const realizedReturnPercent = totalCost > 0 ? (totalRealizedPL / totalCost) * 100 : 0;
  const dividendYield = totalValue > 0 ? (totalDividends / totalValue) * 100 : 0;
  const cashPercent = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0;
  
  let hhiScore = 0;
  holdings.forEach(h => {
    hhiScore += (h.allocation || 0) * (h.allocation || 0);
  });
  
  let hhiRiskLevel: string;
  if (hhiScore < 1500) hhiRiskLevel = "DIVERSIFIED";
  else if (hhiScore < 2500) hhiRiskLevel = "MODERATE";
  else if (hhiScore < 5000) hhiRiskLevel = "CONCENTRATED";
  else hhiRiskLevel = "HIGHLY CONCENTRATED";
  
  const sortedByAllocation = [...holdings].sort((a, b) => (b.allocation || 0) - (a.allocation || 0));
  const topHolding = sortedByAllocation[0] || null;
  const top3Allocation = sortedByAllocation.slice(0, 3).reduce((sum, h) => sum + (h.allocation || 0), 0);
  const top5Allocation = sortedByAllocation.slice(0, 5).reduce((sum, h) => sum + (h.allocation || 0), 0);
  
  const profitableHoldings = holdings.filter(h => (h.unrealizedPL || 0) > 0);
  const losingHoldings = holdings.filter(h => (h.unrealizedPL || 0) < 0);
  const winRate = holdingsCount > 0 ? (profitableHoldings.length / holdingsCount) * 100 : 0;
  const avgHoldingReturn = holdingsCount > 0 
    ? holdings.reduce((sum, h) => sum + (h.unrealizedPLPercent || 0), 0) / holdingsCount 
    : 0;
  
  const sortedByReturn = [...holdings].sort((a, b) => (b.unrealizedPLPercent || 0) - (a.unrealizedPLPercent || 0));
  const bestPerformer = sortedByReturn[0] || null;
  const worstPerformer = sortedByReturn[sortedByReturn.length - 1] || null;
  
  let weightedEdgeSum = 0;
  let totalWeight = 0;
  holdings.forEach(h => {
    const weight = h.allocation || 0;
    if (weight > 0 && h.averagePrice > 0) {
      const edge = ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100;
      weightedEdgeSum += edge * weight;
      totalWeight += weight;
    }
  });
  const executionScore = totalWeight > 0 ? weightedEdgeSum / totalWeight : 0;
  
  const sectorDistribution: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = h.sector || 'Unknown';
    sectorDistribution[sector] = (sectorDistribution[sector] || 0) + (h.allocation || 0);
  });
  
  const sectorCount = Object.keys(sectorDistribution).length;
  const sortedSectors = Object.entries(sectorDistribution).sort((a, b) => b[1] - a[1]);
  const largestSector = sortedSectors[0]?.[0] || 'N/A';
  const largestSectorPercent = sortedSectors[0]?.[1] || 0;
  
  const historyLength = history.length;
  const values = history.map(p => p.value || 0).filter(v => v > 0);
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  
  let volatility = 0;
  if (values.length > 1) {
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i - 1];
      const currValue = values[i];
      if (prevValue !== undefined && currValue !== undefined && prevValue > 0) {
        returns.push((currValue - prevValue) / prevValue);
      }
    }
    if (returns.length > 0) {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }
  }
  
  let maxDrawdown = 0;
  if (values.length > 0) {
    const firstValue = values[0];
    let peak = firstValue ?? 0;
    for (const val of values) {
      if (val !== undefined && val > peak) peak = val;
      if (peak > 0 && val !== undefined) {
        const dd = ((peak - val) / peak) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }
    }
  }
  
  return {
    totalValue,
    totalCost,
    totalRealizedPL,
    totalUnrealizedPL,
    totalDividends,
    cashBalance,
    holdingsCount,
    totalFees,
    feeDragPercent,
    totalDeposits: portfolio.totalDeposits || 0,
    totalWithdrawals: portfolio.totalWithdrawals || 0,
    netTaxImpact: portfolio.netTaxImpact || 0,
    totalReturn,
    totalReturnPercent,
    unrealizedReturnPercent,
    realizedReturnPercent,
    dividendYield,
    cashPercent,
    hhiScore,
    hhiRiskLevel,
    topHolding,
    top3Allocation,
    top5Allocation,
    winRate,
    profitableHoldingsCount: profitableHoldings.length,
    losingHoldingsCount: losingHoldings.length,
    avgHoldingReturn,
    bestPerformer,
    worstPerformer,
    executionScore,
    sectorDistribution,
    sectorCount,
    largestSector,
    largestSectorPercent,
    historyLength,
    maxValue,
    minValue,
    volatility,
    maxDrawdown,
    holdings
  };
};

const formatHoldingsTable = (holdings: Holding[], marketData: Map<string, StockMetrics>): string => {
  return holdings.map(h => {
    const market = marketData.get(h.ticker);
    const entryAlpha = (h.buyVWAP || 0) > 0 ? ((h.currentPrice / h.buyVWAP) - 1) * 100 : 0;
    const quality = market?.qualityGrade || 'N/A';
    const qualityScore = market?.qualityScore || 0;
    const pe = market?.peRatio?.toFixed(1) || 'N/A';
    const techRating = market?.techRating || 'N/A';
    const signal = market?.signal || 'N/A';
    
    return `| ${h.ticker} | ${h.sector || 'N/A'} | ${(h.allocation || 0).toFixed(1)}% | ${h.quantity} | ${h.currentPrice.toFixed(2)} | ${(h.unrealizedPLPercent || 0).toFixed(1)}% | ${quality} (${qualityScore}) | ${pe} | ${techRating} | ${signal} | ${entryAlpha > 0 ? '+' : ''}${entryAlpha.toFixed(1)}% |`;
  }).join('\n');
};

const formatTransactionSummary = (transactions: Transaction[]): string => {
  const buys = transactions.filter(t => t.Operation === 'Achat');
  const sells = transactions.filter(t => t.Operation === 'Vente');
  const totalBuyVolume = buys.reduce((sum, t) => sum + t.Total, 0);
  const totalSellVolume = sells.reduce((sum, t) => sum + t.Total, 0);
  const totalFees = transactions.reduce((sum, t) => sum + (t.Fees || 0), 0);
  const totalTax = transactions.reduce((sum, t) => sum + (t.Tax || 0), 0);
  
  return `
| Metric | Value |
|--------|-------|
| Total Buy Transactions | ${buys.length} |
| Total Sell Transactions | ${sells.length} |
| Total Buy Volume (MAD) | ${totalBuyVolume.toLocaleString('fr-MA')} |
| Total Sell Volume (MAD) | ${totalSellVolume.toLocaleString('fr-MA')} |
| Net Cash Flow (MAD) | ${(totalSellVolume - totalBuyVolume).toLocaleString('fr-MA')} |
| Total Trading Fees (MAD) | ${totalFees.toLocaleString('fr-MA')} |
| Total Trading Tax (MAD) | ${totalTax.toLocaleString('fr-MA')} |
| Average Trade Size (MAD) | ${((totalBuyVolume + totalSellVolume) / (buys.length + sells.length) || 0).toLocaleString('fr-MA')} |`;
};

const formatBankOperationsSummary = (operations: BankOperation[]): string => {
  const deposits = operations.filter(o => o.Category === 'DEPOSIT');
  const withdrawals = operations.filter(o => o.Category === 'WITHDRAWAL');
  const dividends = operations.filter(o => o.Category === 'DIVIDEND');
  const fees = operations.filter(o => o.Category === 'BANK_FEE' || o.Category === 'CUSTODY' || o.Category === 'SUBSCRIPTION');
  
  const totalDeposits = deposits.reduce((sum, o) => sum + o.Amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, o) => sum + Math.abs(o.Amount), 0);
  const totalDividends = dividends.reduce((sum, o) => sum + o.Amount, 0);
  const totalBankFees = fees.reduce((sum, o) => sum + Math.abs(o.Amount), 0);
  
  return `
| Category | Count | Total (MAD) |
|----------|-------|-------------|
| Deposits | ${deposits.length} | ${totalDeposits.toLocaleString('fr-MA')} |
| Withdrawals | ${withdrawals.length} | ${totalWithdrawals.toLocaleString('fr-MA')} |
| Dividends Received | ${dividends.length} | ${totalDividends.toLocaleString('fr-MA')} |
| Bank/Custody Fees | ${fees.length} | -${totalBankFees.toLocaleString('fr-MA')} |
| Net Cash Movement | - | ${(totalDeposits + totalDividends - totalWithdrawals - totalBankFees).toLocaleString('fr-MA')} |`;
};

const formatMarketContext = (marketData: Map<string, StockMetrics>): string => {
  const stocks = Array.from(marketData.values());
  if (stocks.length === 0) return 'No market data available.';
  
  const avgQuality = stocks.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / stocks.length;
  const avgPE = stocks.filter(s => s.peRatio).reduce((sum, s) => sum + (s.peRatio || 0), 0) / stocks.filter(s => s.peRatio).length || 0;
  const avgROE = stocks.filter(s => s.roe).reduce((sum, s) => sum + (s.roe || 0), 0) / stocks.filter(s => s.roe).length || 0;
  
  const undervalued = stocks.filter(s => s.signal === 'undervalued').length;
  const overvalued = stocks.filter(s => s.signal === 'overvalued').length;
  const fair = stocks.filter(s => s.signal === 'fair').length;
  
  const bullish = stocks.filter(s => s.trend === 'bullish').length;
  const bearish = stocks.filter(s => s.trend === 'bearish').length;
  
  return `
| Market Indicator | Value |
|------------------|-------|
| Stocks Analyzed | ${stocks.length} |
| Average Quality Score | ${avgQuality.toFixed(1)} |
| Average P/E Ratio | ${avgPE.toFixed(1)} |
| Average ROE | ${avgROE.toFixed(1)}% |
| Undervalued Stocks | ${undervalued} (${((undervalued/stocks.length)*100).toFixed(0)}%) |
| Fair Value Stocks | ${fair} (${((fair/stocks.length)*100).toFixed(0)}%) |
| Overvalued Stocks | ${overvalued} (${((overvalued/stocks.length)*100).toFixed(0)}%) |
| Bullish Trend | ${bullish} stocks |
| Bearish Trend | ${bearish} stocks |`;
};

export const generateComprehensiveAnalysis = async (input: ComprehensiveAnalysisInput): Promise<ComprehensiveAnalysisResult> => {
  const metrics = computePortfolioMetrics(input.portfolio);
  const holdingsTable = formatHoldingsTable(input.portfolio.holdings || [], input.marketData);
  const transactionSummary = formatTransactionSummary(input.transactions);
  const bankOpsSummary = formatBankOperationsSummary(input.bankOperations);
  const marketContext = formatMarketContext(input.marketData);
  
  const dataCompleteness = {
    hasHoldings: metrics.holdingsCount > 0,
    hasHistory: metrics.historyLength > 0,
    hasDividends: metrics.totalDividends > 0,
    hasFees: metrics.totalFees > 0,
    hasRealizedPL: metrics.totalRealizedPL !== 0,
    hasTransactions: input.transactions.length > 0,
    hasBankOps: input.bankOperations.length > 0,
    hasMarketData: input.marketData.size > 0
  };

  const prompt = `
# ATLAS PORTFOLIO COMMAND CENTER
## Institutional-Grade Comprehensive Analysis for Bourse de Casablanca

You are the **Chief Investment Officer (CIO)** of a major Moroccan asset management firm, with additional credentials as a **Senior Risk Officer** and **Behavioral Finance Specialist**. You have 25+ years of experience in emerging markets, specifically the Casablanca Stock Exchange (Bourse de Casablanca), with deep knowledge of:

- MASI index dynamics and BAM monetary policy
- Moroccan corporate governance and family-controlled enterprises
- Sector cyclicality in Banking, Real Estate, Telecommunications, and Insurance
- Tax optimization strategies for Moroccan retail investors
- OPCVM (mutual fund) structures and(fiduciary best practices
- HHI concentration limits and VaR frameworks used by Bank Al-Maghrib

Your analysis must be **institutional-grade**: precise, data-driven, and actionable. Every claim must cite specific numbers from the data below.

---

## 📊 DATA COMPLETENESS ASSESSMENT

| Data Source | Status | Records |
|-------------|--------|---------|
| Holdings Portfolio | ${dataCompleteness.hasHoldings ? '✅ Available' : '❌ Missing'} | ${metrics.holdingsCount} positions |
| Performance History | ${dataCompleteness.hasHistory ? '✅ Available' : '❌ Missing'} | ${metrics.historyLength} data points |
| Transaction History | ${dataCompleteness.hasTransactions ? '✅ Available' : '❌ Missing'} | ${input.transactions.length} trades |
| Bank Operations | ${dataCompleteness.hasBankOps ? '✅ Available' : '❌ Missing'} | ${input.bankOperations.length} records |
| Dividend Income | ${dataCompleteness.hasDividends ? '✅ Available' : '❌ Missing'} | ${metrics.totalDividends.toLocaleString('fr-MA')} MAD |
| Fee Analysis | ${dataCompleteness.hasFees ? '✅ Available' : '❌ Missing'} | ${metrics.totalFees.toLocaleString('fr-MA')} MAD total |
| Market Data | ${dataCompleteness.hasMarketData ? '✅ Available' : '❌ Missing'} | ${input.marketData.size} stocks |

---

## 📈 PORTFOLIO SNAPSHOT

### Core Financial Metrics

| Metric | Value | Benchmark |
|--------|-------|-----------|
| **Total Equity** | ${metrics.totalValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | Portfolio NAV |
| **Cost Basis** | ${metrics.totalCost.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | Invested Capital |
| **Cash Position** | ${metrics.cashBalance.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.cashPercent.toFixed(1)}% of portfolio |
| **Unrealized P/L** | ${metrics.totalUnrealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.unrealizedReturnPercent.toFixed(2)}% |
| **Realized P/L** | ${metrics.totalRealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.realizedReturnPercent.toFixed(2)}% |
| **Total Return** | ${metrics.totalReturn.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.totalReturnPercent.toFixed(2)}% |
| **Dividend Income** | ${metrics.totalDividends.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.dividendYield.toFixed(2)}% yield |
| **Holdings Count** | ${metrics.holdingsCount} | Diversification metric |
| **Fee Drag** | ${metrics.totalFees.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${metrics.feeDragPercent.toFixed(2)}% of equity |

### Concentration Risk Analysis

| Metric | Value | Risk Level |
|--------|-------|------------|
| **HHI Score** | ${metrics.hhiScore.toFixed(0)} | ${metrics.hhiRiskLevel} |
| **Top 3 Concentration** | ${metrics.top3Allocation.toFixed(1)}% | ${metrics.top3Allocation > 50 ? '🔴 HIGH' : metrics.top3Allocation > 40 ? '⚠️ MODERATE' : '✅ ACCEPTABLE'} |
| **Top 5 Concentration** | ${metrics.top5Allocation.toFixed(1)}% | ${metrics.top5Allocation > 70 ? '🔴 HIGH' : metrics.top5Allocation > 60 ? '⚠️ MODERATE' : '✅ ACCEPTABLE'} |
| **Largest Position** | ${metrics.topHolding?.ticker || 'N/A'} at ${(metrics.topHolding?.allocation || 0).toFixed(1)}% | ${(metrics.topHolding?.allocation || 0) > 20 ? '🔴 HIGH' : (metrics.topHolding?.allocation || 0) > 15 ? '⚠️ MODERATE' : '✅ ACCEPTABLE'} |
| **Sector Count** | ${metrics.sectorCount} | ${metrics.sectorCount < 3 ? '🔴 UNDER-DIVERSIFIED' : metrics.sectorCount < 5 ? '⚠️ MODERATE' : '✅ DIVERSIFIED'} |
| **Largest Sector** | ${metrics.largestSector} at ${metrics.largestSectorPercent.toFixed(1)}% | ${metrics.largestSectorPercent > 40 ? '🔴 HIGH' : metrics.largestSectorPercent > 30 ? '⚠️ MODERATE' : '✅ ACCEPTABLE'} |

### Performance Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| **Win Rate (Holdings)** | ${metrics.winRate.toFixed(1)}% | ${metrics.winRate >= 70 ? '✅ STRONG' : metrics.winRate >= 50 ? '⚠️ MODERATE' : '🔴 WEAK'} |
| **Avg Holding Return** | ${metrics.avgHoldingReturn.toFixed(2)}% | ${metrics.avgHoldingReturn > 0 ? '✅ POSITIVE' : '🔴 NEGATIVE'} |
| **Best Performer** | ${metrics.bestPerformer?.ticker || 'N/A'} @ ${(metrics.bestPerformer?.unrealizedPLPercent || 0).toFixed(1)}% | - |
| **Worst Performer** | ${metrics.worstPerformer?.ticker || 'N/A'} @ ${(metrics.worstPerformer?.unrealizedPLPercent || 0).toFixed(1)}% | - |
| **Execution Edge** | ${metrics.executionScore > 0 ? '+' : ''}${metrics.executionScore.toFixed(2)}% | ${metrics.executionScore > 2 ? '✅ DISCIPLINED' : metrics.executionScore >= 0 ? '⚠️ NEUTRAL' : '🔴 PAYING PREMIUM'} |
| **Historical Volatility** | ${metrics.volatility.toFixed(2)}% | ${metrics.volatility < 15 ? '✅ LOW' : metrics.volatility < 25 ? '⚠️ MODERATE' : '🔴 HIGH'} |
| **Max Drawdown** | ${metrics.maxDrawdown.toFixed(2)}% | ${metrics.maxDrawdown < 10 ? '✅ CONTROLLED' : metrics.maxDrawdown < 20 ? '⚠️ MODERATE' : '🔴 SIGNIFICANT'} |

### Sector Allocation

${Object.entries(metrics.sectorDistribution).sort((a, b) => b[1] - a[1]).map(([sector, alloc]) => `- **${sector}**: ${alloc.toFixed(1)}% ${alloc > 30 ? '🔴' : alloc > 20 ? '⚠️' : '✅'}`).join('\n')}

---

## 📊 HOLDINGS DETAIL TABLE

| Ticker | Sector | Weight | Qty | Price | P/L% | Quality | P/E | Tech | Signal | Entry α |
|--------|--------|--------|-----|-------|------|---------|-----|------|--------|---------|
${holdingsTable}

---

## 💵 TRANSACTION HISTORY SUMMARY

${transactionSummary}

---

## 🏦 BANK OPERATIONS SUMMARY

${bankOpsSummary}

---

## 📊 MARKET CONTEXT

${marketContext}

---

${input.riskMetrics ? `
## ⚠️ RISK METRICS (Quantitative)

| Metric | Value | Benchmark | Status |
|--------|-------|-----------|--------|
| Annualized Volatility | ${input.riskMetrics.volatility.toFixed(2)}% | <20% Low / 20-35% Medium / >35% High | ${input.riskMetrics.volatility < 20 ? '✅' : input.riskMetrics.volatility < 35 ? '⚠️' : '🔴'} |
| VaR (95%, Daily) | ${input.riskMetrics.var95.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${input.riskMetrics.var95Percent.toFixed(2)}%) | <2% of NAV | ${input.riskMetrics.var95Percent < 2 ? '✅' : '🔴'} |
| Max Drawdown | ${input.riskMetrics.maxDrawdown.toFixed(2)}% | <15% Acceptable | ${input.riskMetrics.maxDrawdown < 15 ? '✅' : input.riskMetrics.maxDrawdown < 25 ? '⚠️' : '🔴'} |
| Sharpe Ratio (Rf=3%) | ${input.riskMetrics.sharpe.toFixed(2)} | >1 Good / >2 Excellent | ${input.riskMetrics.sharpe > 2 ? '✅' : input.riskMetrics.sharpe > 1 ? '⚠️' : '🔴'} |
| HHI Concentration | ${input.riskMetrics.hhi?.toFixed(0) || 'N/A'} | <1500 Diversified / <2500 Moderate | ${!input.riskMetrics.hhi ? 'N/A' : input.riskMetrics.hhi < 1500 ? '✅' : input.riskMetrics.hhi < 2500 ? '⚠️' : '🔴'} |
` : '⚠️ No quantitative risk metrics available (insufficient closed-trade history).'}

---

${input.tradingMetrics ? `
## 🎯 TRADING METRICS (Kelly Criterion)

| Metric | Value | Signal |
|--------|-------|--------|
| Win Rate | ${input.tradingMetrics.winRate.toFixed(1)}% | ${input.tradingMetrics.winRate >= 60 ? '✅ Strong edge' : input.tradingMetrics.winRate >= 50 ? '⚠️ Marginal edge' : '🔴 Below breakeven'} |
| Profit Factor | ${input.tradingMetrics.profitFactor.toFixed(2)} | ${input.tradingMetrics.profitFactor >= 2 ? '✅ Excellent' : input.tradingMetrics.profitFactor >= 1.5 ? '⚠️ Good' : '🔴 Poor'} |
| Full Kelly % | ${input.tradingMetrics.kellyPercent.toFixed(2)}% | ${input.tradingMetrics.kellyPercent > 0 ? 'Positive edge detected' : 'No statistical edge'} |
| Half Kelly % | ${(input.tradingMetrics.kellyPercent / 2).toFixed(2)}% | Recommended max position |
| Total Trades | ${input.tradingMetrics.totalTrades} | ${input.tradingMetrics.totalTrades >= 30 ? '✅ Statistically meaningful' : '⚠️ Sample too small for significance'} |
| Wins / Losses | ${input.tradingMetrics.totalWins} / ${input.tradingMetrics.totalLosses} | - |
| Avg Win | ${input.tradingMetrics.avgWin.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | - |
| Avg Loss | ${input.tradingMetrics.avgLoss.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | - |
` : '⚠️ No trading metrics available (no closed trades with realized P/L).'}

---

${input.monteCarloStats ? `
## 🎲 MONTE CARLO SIMULATION (Next 50 Trades)

| Scenario | Projected Equity | Change vs Today |
|----------|------------------|-----------------|
| 🟢 Best Case (90th %ile) | ${input.monteCarloStats.bestCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | +${((input.monteCarloStats.bestCase - metrics.totalValue) / metrics.totalValue * 100).toFixed(1)}% |
| ⚪ Median Outcome | ${input.monteCarloStats.medianOutcome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${((input.monteCarloStats.medianOutcome - metrics.totalValue) / metrics.totalValue * 100).toFixed(1) > '0' ? '+' : ''}${((input.monteCarloStats.medianOutcome - metrics.totalValue) / metrics.totalValue * 100).toFixed(1)}% |
| 🔴 Worst Case (10th %ile) | ${input.monteCarloStats.worstCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${((input.monteCarloStats.worstCase - metrics.totalValue) / metrics.totalValue * 100).toFixed(1)}% |
| ☠️ Risk of Ruin | ${input.monteCarloStats.riskOfRuin.toFixed(2)}% | ${input.monteCarloStats.riskOfRuin < 1 ? '✅ Negligible' : input.monteCarloStats.riskOfRuin < 5 ? '⚠️ Acceptable' : '🔴 DANGEROUS'} |
` : ''}

---

## 📋 ANALYSIS MANDATE

You MUST produce a comprehensive institutional-grade report with the following **10 SECTIONS** in exact order. Each section must be data-grounded and actionable.

---

### SECTION 1 — EXECUTIVE SUMMARY (Board-Level)

Provide a 3-bullet executive summary that a board of directors would read in 30 seconds:
1. **Net Position**: Total return, largest contributor, largest detractor
2. **Risk Status**: HHI level, VaR exposure, drawdown status
3. **Top Priority**: Single most urgent action required (with specific ticker/sector if applicable)

---

### SECTION 2 — PORTFOLIO HEALTH SCORECARD

Rate the portfolio on each dimension from 1–10. Each score MUST reference a specific metric from the data above.

| Dimension | Score /10 | One-Line Verdict |
|-----------|-----------|------------------|
| Return Quality | | |
| Risk Management | | |
| Diversification | | |
| Execution Discipline | | |
| Fee Efficiency | | |
| Income Generation | | |
| Cash Management | | |
| **Overall Grade** | | A / B / C / D / F |

---

### SECTION 3 — RISK STRESS TEST (Bank-Level)

Perform institutional risk stress testing:

**A. Concentration Stress Test**
- HHI of ${metrics.hhiScore.toFixed(0)}: Explain what happens if the largest position drops 20%
- Calculate portfolio impact in MAD: ${(metrics.totalValue * ((metrics.topHolding?.allocation || 0) / 100) * 0.2).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
- Recommend HHI target and rebalancing trigger

**B. Sector Stress Test**
- Largest sector (${metrics.largestSector}) at ${metrics.largestSectorPercent.toFixed(1)}%
- Identify sector-specific risks (Morocco context: BAM rate changes, regulatory shifts, ARPU compression, credit cycles)
- Recommend sector allocation bands

**C. Liquidity Stress Test**
- Cash at ${metrics.cashPercent.toFixed(1)}%
- Compare to optimal 5-15% range for illiquid Casablanca market
- Recommend deployment trigger conditions (e.g., "if MASI drops >8%")

**D. Drawdown Recovery Test**
- Max drawdown experienced: ${metrics.maxDrawdown.toFixed(2)}%
- Calculate recovery time at current return rate
- Compare to psychological ruin threshold (typically 30% for retail investors)

---

### SECTION 4 — HOLDINGS QUALITY AUDIT

For every holding with allocation ≥ 5%, produce a structured mini-review:

**[TICKER] — [SECTOR] | [ALLOCATION]%, [P/L%]**
- **Quality Grade**: [A/B/C/D/F] from market data
- **Valuation Signal**: [Undervalued/Fair/Overvalued]
- **Technical Trend**: [Bullish/Bearish/Neutral]
- **Entry Quality**: VWAP alpha [(+/-)X%]
- **Thesis Status**: ✅ Intact / ⚠️ Watch / ❌ Broken
- **Risk Specific to Casablanca**: [Single most important risk]
- **Action**: **HOLD / ADD @ [price] / TRIM @ [price] / EXIT IMMEDIATELY**
- **Stop Level**: [Specific MAD price for stop-loss]

---

### SECTION 5 — TRADING PSYCHOLOGY & BEHAVIORAL AUDIT

Diagnose behavioral biases from the data:

**A. Disposition Effect Analysis**
- Compare holding periods of winners vs losers (if data available)
- Identify if winners are being cut early or losers being held too long
- Provide specific correction rules

**B. Overconfidence Check**
- HHI of ${metrics.hhiScore.toFixed(0)} vs Kelly-optimal sizing
- Is the investor sizing positions beyond their statistical edge?

**C. Fee Blindness**
- Fee drag of ${metrics.feeDragPercent.toFixed(2)}%
- Compare to typical OPCVM expense ratio (0.5-0.8%)
- Is active management generating alpha to justify costs?

**D. Execution Quality**
- VWAP score of ${metrics.executionScore > 0 ? '+' : ''}${metrics.executionScore.toFixed(2)}%
- Diagnosis: disciplined buyer or paying market premium?
- 3 specific rules to improve execution

---

### SECTION 6 — ACTION PLAN TO-DO LIST

Generate a prioritized **TO-DO LIST** with exactly 8 actionable items. Use this format:

**Priority Level Definitions:**
- 🔴 CRITICAL: Execute within 24-48 hours
- 🟠 HIGH: Execute within 1 week  
- 🟡 MEDIUM: Execute within 2-4 weeks
- 🟢 LOW: Review monthly

**Format:**
| # | Priority | Category | Action | Deadline | Rationale |
|---|----------|----------|--------|----------|-----------|
| 1 | [Critical/High/Medium/Low] | [Risk/Position/Execution/etc.] | [Specific action] | [Date or trigger] | [Data-driven reason] |
...

Each action MUST:
1. Reference specific tickers or percentages
2. Have a clear deadline OR trigger condition
3. Cite the exact metric that triggered it

---

### SECTION 7 — DIVIDEND & INCOME ANALYSIS

${input.dividendData ? `
**Current Dividend Income:**
- Annual Dividend Income: ${input.dividendData.annualIncome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
- Current Yield: ${input.dividendData.currentYield.toFixed(2)}%

**Upcoming Payments:**
${input.dividendData.upcomingPayments.map(p => `- ${p.ticker}: ${p.amount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} on ${p.date}`).join('\n')}
` : `
**Dividend Analysis:**
- Total Dividends Received: ${metrics.totalDividends.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
- Dividend Yield on Equity: ${metrics.dividendYield.toFixed(2)}%
`}

**Income vs Capital Gains Split:**
- ${metrics.dividendYield.toFixed(2)}% dividend yield vs ${metrics.unrealizedReturnPercent.toFixed(2)}% unrealized capital gains
- Is the portfolio income-focused or growth-focused?
- Recommend specific dividend stocks if yield is below 2%

---

### SECTION 8 — MARKET TIMING & SIGNALS

${input.signalData ? `
**Market Signal Summary:**
- Bullish Signals: ${input.signalData.bullishCount} stocks
- Bearish Signals: ${input.signalData.bearishCount} stocks
- Neutral: ${input.signalData.neutralCount} stocks

**Top Signal Opportunities:**
${input.signalData.topSignals.map(s => `- **${s.ticker}**: ${s.signal} (Strength: ${s.strength}%)`).join('\n')}
` : '**No technical signal data available for analysis.**'}

**Current Market Regime:**
- Assess if the market is in bullish, bearish, or sideways mode
- Recommend position sizing adjustment based on regime

---

### SECTION 9 — BANK-LEVEL RISK MANAGEMENT RECOMMENDATIONS

Provide 5 specific risk management recommendations as a senior risk officer:

1. **Position Limit Recommendation**: Based on HHI and VaR
2. **Stop-Loss Protocol**: Specific percentages for each major position
3. **Sector Cap Recommendation**: Maximum exposure per sector
4. **Cash Buffer Policy**: Minimum cash reserve percentage
5. **Rebalancing Trigger**: Specific conditions that trigger rebalancing

---

### SECTION 10 — MOROCCAN MARKET CONTEXT

Close with 2-3 sentences situating this portfolio within the current Moroccan macro environment. Reference:
- Bank Al-Maghrib policy rates
- MASI index recent performance
- Sector rotation trends
- IPO pipeline on Casablanca

---

## 📋 HARD OUTPUT RULES

1. Follow ALL 10 sections in exact order — do not skip or merge
2. Every numeric claim MUST cite a specific number from the data tables above
3. Every recommendation MUST specify a ticker, percentage, or MAD amount
4. The To-Do List MUST have exactly 8 items with deadlines
5. Total response: 1200-1500 words — precise and dense, not verbose
6. Never use phrases like "it is important to note" or "you should consult a financial advisor"
7. All monetary figures MUST be in MAD
8. Bold ALL final recommendations (HOLD / ADD / TRIM / EXIT / BUY / SELL)
9. Use ✅ ⚠️ 🔴 icons consistently to indicate status
10. Provide a single-sentence "Investment Thesis Summary" at the very end
`;

  if (!GLM_API_KEY) {
    return {
      markdown: "OpenCode API key not configured. Please set VITE_OPENCODE_API_KEY in your .env.local file.",
      actionItems: [],
      riskGrade: 'F',
      compositionScore: 0
    };
  }

  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-5',
        messages: [
          {
            role: 'system',
            content: 'You are a senior investment strategist and risk officer with 25+ years of experience in emerging markets, specifically the Casablanca Stock Exchange. Your analysis is institutional-grade, data-driven, and actionable. Every claim must cite specific numbers. You never give generic advice — only precise recommendations with tickers, percentages, and MAD amounts. You communicate like a hedge fund CIO: direct, rigorous, and focused on risk-adjusted returns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(logContext.AI, 'GLM API Error:', errorData);
      return {
        markdown: `**API Error (${response.status})**

${response.status === 401 ? 'Invalid API key. Please check your VITE_OPENCODE_API_KEY in .env.local' : 
  response.status === 429 ? 'Rate limit exceeded. Please wait and try again.' :
  response.status === 500 ? 'Server error. Please try again later.' :
  'Connection failed.'}

**Details:** ${JSON.stringify(errorData)}

**Troubleshooting:**
1. Ensure VITE_OPENCODE_API_KEY is set in .env.local
2. Restart the dev server after adding the key
3. Check that your API key is valid`,
        actionItems: [],
        riskGrade: 'F',
        compositionScore: 0
      };
    }

    const data = await response.json();
    const markdown = data.choices?.[0]?.message?.content || 'No analysis generated.';

    const actionItems = extractActionItems(markdown);
    const riskGrade = extractRiskGrade(markdown);
    const compositionScore = calculateCompositionScore(metrics, input.riskMetrics, input.tradingMetrics);

    return {
      markdown,
      actionItems,
      riskGrade,
      compositionScore
    };
  } catch (error) {
    logger.error(logContext.AI, 'GLM API Error:', error);
    const isCorsError = error instanceof TypeError && error.message === 'Failed to fetch';
    return {
      markdown: isCorsError 
        ? `**CORS/Network Error**

The API request was blocked. This usually happens when:
1. The dev server needs to be restarted (run \`npm run dev\` again)
2. The API key is not set in \`.env.local\`

**Quick Fix:**
1. Add to \`.env.local\`:\`\`\`
VITE_OPENCODE_API_KEY=your_api_key_here
\`\`\`

2. Restart dev server:
\`\`\`bash
npm run dev
\`\`\`

3. Refresh the browser

If the error persists, the API endpoint may be temporarily unavailable.`
        : `**API Connection Error**

${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
1. Verify your API key in \`.env.local\`
2. Restart the dev server
3. Check your internet connection`,
      actionItems: [],
      riskGrade: 'F',
      compositionScore: 0
    };
  }
};

const extractActionItems = (markdown: string): Array<{
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  deadline: string;
  rationale: string;
}> => {
  const items: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    deadline: string;
    rationale: string;
  }> = [];
  
  const tableRegex = /\|\s*\d+\s*\|\s*(Critical|High|Medium|Low)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/gi;
  
  let match;
  while ((match = tableRegex.exec(markdown)) !== null) {
    const priorityRaw = match[1];
    const categoryRaw = match[2];
    const actionRaw = match[3];
    const deadlineRaw = match[4];
    const rationaleRaw = match[5];
    
    if (!priorityRaw || !categoryRaw || !actionRaw || !deadlineRaw || !rationaleRaw) continue;
    
    const priority = priorityRaw.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    items.push({
      priority,
      category: categoryRaw.trim(),
      action: actionRaw.trim(),
      deadline: deadlineRaw.trim(),
      rationale: rationaleRaw.trim()
    });
  }
  
  return items;
};

const extractRiskGrade = (markdown: string): 'A' | 'B' | 'C' | 'D' | 'F' => {
  const gradeMatch = markdown.match(/\*\*Overall Grade\*\*.*?\|\s*([A-F])\s*\|/i) || 
                     markdown.match(/Overall Grade.*?([A-F])\s*$/im);
  
  if (gradeMatch && gradeMatch[1]) {
    const grade = gradeMatch[1].toUpperCase();
    if (['A', 'B', 'C', 'D', 'F'].includes(grade)) {
      return grade as 'A' | 'B' | 'C' | 'D' | 'F';
    }
  }
  return 'C';
};

const calculateCompositionScore = (
  metrics: ReturnType<typeof computePortfolioMetrics>,
  riskMetrics: RiskMetrics | null,
  tradingMetrics: TradingMetrics | null
): number => {
  let score = 50;
  
  if (metrics.hhiScore < 1500) score += 15;
  else if (metrics.hhiScore < 2500) score += 5;
  else if (metrics.hhiScore < 5000) score -= 5;
  else score -= 15;
  
  if (metrics.sectorCount >= 5) score += 10;
  else if (metrics.sectorCount >= 3) score += 5;
  else score -= 5;
  
  if (metrics.cashPercent >= 5 && metrics.cashPercent <= 15) score += 10;
  else if (metrics.cashPercent > 15) score += 5;
  else score -= 5;
  
  if (metrics.totalReturnPercent > 0) score += 10;
  if (metrics.feeDragPercent < 0.5) score += 5;
  else if (metrics.feeDragPercent > 2) score -= 10;
  
  if (riskMetrics) {
    if (riskMetrics.sharpe > 1) score += 10;
    if (riskMetrics.maxDrawdown < 15) score += 5;
    else if (riskMetrics.maxDrawdown > 25) score -= 10;
  }
  
  if (tradingMetrics) {
    if (tradingMetrics.winRate >= 60) score += 10;
    else if (tradingMetrics.winRate < 50) score -= 10;
    if (tradingMetrics.profitFactor >= 2) score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
};

export const glmService = {
  generateComprehensiveAnalysis
};