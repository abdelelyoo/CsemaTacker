import { GoogleGenAI } from "@google/genai";
import { PortfolioSummary, AIAnalysisResult, Holding } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalDividends: number;
  cashBalance: number;
  holdingsCount: number;
  totalFees: number;
  feeDragPercent: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netTaxImpact: number;
  
  // Performance metrics
  totalReturn: number;
  totalReturnPercent: number;
  unrealizedReturnPercent: number;
  realizedReturnPercent: number;
  dividendYield: number;
  cashPercent: number;
  
  // Risk metrics
  hhiScore: number;
  hhiRiskLevel: string;
  topHolding: Holding | null;
  top3Allocation: number;
  top5Allocation: number;
  
  // Trading metrics
  winRate: number;
  profitableHoldingsCount: number;
  losingHoldingsCount: number;
  avgHoldingReturn: number;
  bestPerformer: Holding | null;
  worstPerformer: Holding | null;
  
  // Execution metrics
  executionScore: number;
  executionStatus: string;
  avgBuyVWAP: number;
  avgSellVWAP: number;
  
  // Sector analysis
  sectorDistribution: Record<string, number>;
  sectorCount: number;
  largestSector: string;
  largestSectorPercent: number;
  
  // History metrics
  historyLength: number;
  maxValue: number;
  minValue: number;
  volatility: number;
}

const computePortfolioMetrics = (portfolio: PortfolioSummary): PortfolioMetrics => {
  const holdings = portfolio.holdings || [];
  const history = portfolio.history || [];
  
  // Core totals
  const totalValue = portfolio.totalValue || 0;
  const totalCost = portfolio.totalCost || 0;
  const totalRealizedPL = portfolio.totalRealizedPL || 0;
  const totalUnrealizedPL = portfolio.totalUnrealizedPL || 0;
  const totalDividends = portfolio.totalDividends || 0;
  const cashBalance = portfolio.cashBalance || 0;
  const holdingsCount = holdings.length;
  
  // Fee analysis
  const totalFees = (portfolio.totalTradingFees || 0) + 
                   (portfolio.totalCustodyFees || 0) + 
                   (portfolio.totalSubscriptionFees || 0) + 
                   (portfolio.totalBankFees || 0);
  const feeDragPercent = totalValue > 0 ? (totalFees / totalValue) * 100 : 0;
  
  // Performance metrics
  const totalReturn = totalRealizedPL + totalUnrealizedPL;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const unrealizedReturnPercent = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
  const realizedReturnPercent = totalCost > 0 ? (totalRealizedPL / totalCost) * 100 : 0;
  const dividendYield = totalValue > 0 ? (totalDividends / totalValue) * 100 : 0;
  const cashPercent = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0;
  
  // Risk metrics - HHI concentration
  let hhiScore = 0;
  holdings.forEach(h => {
    hhiScore += (h.allocation || 0) * (h.allocation || 0);
  });
  
  let hhiRiskLevel: string;
  if (hhiScore < 1500) hhiRiskLevel = "DIVERSIFIED";
  else if (hhiScore < 2500) hhiRiskLevel = "MODERATE";
  else if (hhiScore < 5000) hhiRiskLevel = "CONCENTRATED";
  else hhiRiskLevel = "HIGHLY CONCENTRATED";
  
  // Top holdings
  const sortedByAllocation = [...holdings].sort((a, b) => (b.allocation || 0) - (a.allocation || 0));
  const topHolding = sortedByAllocation[0] || null;
  const top3Allocation = sortedByAllocation.slice(0, 3).reduce((sum, h) => sum + (h.allocation || 0), 0);
  const top5Allocation = sortedByAllocation.slice(0, 5).reduce((sum, h) => sum + (h.allocation || 0), 0);
  
  // Win rate
  const profitableHoldings = holdings.filter(h => (h.unrealizedPL || 0) > 0);
  const losingHoldings = holdings.filter(h => (h.unrealizedPL || 0) < 0);
  const winRate = holdingsCount > 0 ? (profitableHoldings.length / holdingsCount) * 100 : 0;
  const avgHoldingReturn = holdingsCount > 0 
    ? holdings.reduce((sum, h) => sum + (h.unrealizedPLPercent || 0), 0) / holdingsCount 
    : 0;
  
  // Best/worst performers
  const sortedByReturn = [...holdings].sort((a, b) => (b.unrealizedPLPercent || 0) - (a.unrealizedPLPercent || 0));
  const bestPerformer = sortedByReturn[0] || null;
  const worstPerformer = sortedByReturn[sortedByReturn.length - 1] || null;
  
  // Execution metrics
  let weightedEdgeSum = 0;
  let totalWeight = 0;
  let totalBuyVWAP = 0;
  let totalSellVWAP = 0;
  let buyCount = 0;
  let sellCount = 0;
  
  holdings.forEach(h => {
    const weight = h.allocation || 0;
    if (weight > 0 && h.averagePrice > 0) {
      const edge = ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100;
      weightedEdgeSum += edge * weight;
      totalWeight += weight;
    }
    if ((h.buyVWAP || 0) > 0) {
      totalBuyVWAP += h.buyVWAP || 0;
      buyCount++;
    }
    if ((h.sellVWAP || 0) > 0) {
      totalSellVWAP += h.sellVWAP || 0;
      sellCount++;
    }
  });
  
  const executionScore = totalWeight > 0 ? weightedEdgeSum / totalWeight : 0;
  const executionStatus = executionScore > 0 ? "Positive (Buying Value)" : "Negative (Paying Premium)";
  const avgBuyVWAP = buyCount > 0 ? totalBuyVWAP / buyCount : 0;
  const avgSellVWAP = sellCount > 0 ? totalSellVWAP / sellCount : 0;
  
  // Sector analysis
  const sectorDistribution: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = h.sector || 'Unknown';
    sectorDistribution[sector] = (sectorDistribution[sector] || 0) + (h.allocation || 0);
  });
  
  const sectorCount = Object.keys(sectorDistribution).length;
  const sortedSectors = Object.entries(sectorDistribution).sort((a, b) => b[1] - a[1]);
  const largestSector = sortedSectors[0]?.[0] || 'N/A';
  const largestSectorPercent = sortedSectors[0]?.[1] || 0;
  
  // History metrics
  const historyLength = history.length;
  const values = history.map(p => p.value || 0).filter(v => v > 0);
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  
  // Calculate volatility
  let volatility = 0;
  if (values.length > 1) {
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const current = values[i];
      const prev = values[i - 1];
      if (prev > 0) {
        returns.push((current - prev) / prev);
      }
    }
    if (returns.length > 0) {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
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
    executionStatus,
    avgBuyVWAP,
    avgSellVWAP,
    sectorDistribution,
    sectorCount,
    largestSector,
    largestSectorPercent,
    historyLength,
    maxValue,
    minValue,
    volatility
  };
};

const formatHoldingText = (holdings: Holding[]): string => {
  return holdings.map(h => {
    const entryAlpha = (h.buyVWAP || 0) > 0 ? ((h.currentPrice / h.buyVWAP) - 1) * 100 : 0;
    const exitAlpha = (h.sellVWAP || 0) > 0 ? ((h.sellVWAP / h.currentPrice) - 1) * 100 : 0;
    return `- ${h.ticker} (${h.sector || 'Unknown'}): ${(h.allocation || 0).toFixed(2)}% of portfolio. Entry VWAP: ${(h.buyVWAP || 0).toFixed(2)} (Alpha: ${entryAlpha.toFixed(2)}%). Exit VWAP: ${(h.sellVWAP || 0).toFixed(2)} (Alpha: ${exitAlpha.toFixed(2)}%). Current: ${h.currentPrice.toFixed(2)}. P/L: ${(h.unrealizedPLPercent || 0).toFixed(2)}% (${(h.unrealizedPL || 0).toLocaleString()} MAD)`;
  }).join('\n');
};

const formatSectorText = (sectors: Record<string, number>): string => {
  return Object.entries(sectors)
    .sort((a, b) => b[1] - a[1])
    .map(([sec, val]) => `${sec}: ${val.toFixed(2)}%`)
    .join(', ');
};

export const analyzePortfolio = async (portfolio: PortfolioSummary): Promise<AIAnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const metrics = computePortfolioMetrics(portfolio);
  const holdingsText = formatHoldingText(portfolio.holdings || []);
  const sectorText = formatSectorText(metrics.sectorDistribution);
  
  // Data completeness check
  const dataCompleteness = {
    hasHoldings: metrics.holdingsCount > 0,
    hasHistory: metrics.historyLength > 0,
    hasDividends: metrics.totalDividends > 0,
    hasFees: metrics.totalFees > 0,
    hasRealizedPL: metrics.totalRealizedPL !== 0,
    hasCash: metrics.cashBalance !== 0
  };
  
  const prompt = `
# MOROCCAN PORTFOLIO AI ADVISOR
## Comprehensive Investment Audit for Casablanca Stock Exchange (Bourse de Casablanca)

You are a **Senior Investment Strategist** with 20+ years specializing in the Moroccan capital market (Bourse de Casablanca). You combine quantitative rigor with deep knowledge of local market dynamics — including MASI index behavior, Moroccan corporate governance norms, sector cyclicality, and BAM monetary policy. Produce institutional-grade analysis that a Moroccan OPCVM fund manager would respect.

---

## 📊 DATA COMPLETENESS CHECK

| Data Available | Status |
|---------------|--------|
| Holdings (${metrics.holdingsCount}) | ${dataCompleteness.hasHoldings ? '✅' : '❌'} |
| Historical Data (${metrics.historyLength} points) | ${dataCompleteness.hasHistory ? '✅' : '❌'} |
| Dividend Income | ${dataCompleteness.hasDividends ? '✅' : '❌'} |
| Fee History | ${dataCompleteness.hasFees ? '✅' : '❌'} |
| Realized P/L | ${dataCompleteness.hasRealizedPL ? '✅' : '❌'} |
| Cash Position | ${dataCompleteness.hasCash ? '✅' : '❌'} |

---

## 📊 PORTFOLIO SNAPSHOT

### Core Metrics
| Metric | Value |
|--------|-------|
| **Total Equity** | ${metrics.totalValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Total Cost Basis** | ${metrics.totalCost.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Cash Position** | ${metrics.cashBalance.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${metrics.cashPercent.toFixed(1)}%) |
| **Unrealized P/L** | ${metrics.totalUnrealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${metrics.unrealizedReturnPercent.toFixed(2)}%) |
| **Realized P/L (YTD)** | ${metrics.totalRealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${metrics.realizedReturnPercent.toFixed(2)}%) |
| **Total Return** | ${metrics.totalReturn.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${metrics.totalReturnPercent.toFixed(2)}%) |
| **Dividend Income** | ${metrics.totalDividends.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Dividend Yield** | ${metrics.dividendYield.toFixed(2)}% |
| **Holdings Count** | ${metrics.holdingsCount} stocks |

### Cash Flow Analysis
| Flow | Amount (MAD) |
|------|--------------|
| Total Deposits | ${metrics.totalDeposits.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| Total Withdrawals | ${metrics.totalWithdrawals.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| Net Tax Impact | ${metrics.netTaxImpact.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |

### Fee Analysis
| Fee Type | Amount (MAD) | Impact |
|----------|--------------|--------|
| **Total Fee Drag** | ${metrics.totalFees.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | **${metrics.feeDragPercent.toFixed(2)}%** of equity |

---

## 🎯 RISK PROFILE

### Concentration Analysis
- **HHI Score**: ${metrics.hhiScore.toFixed(0)} (${metrics.hhiRiskLevel})
- **Top Holding**: ${metrics.topHolding?.ticker || 'N/A'} at ${(metrics.topHolding?.allocation || 0).toFixed(1)}%
- **Top 3 Holdings**: ${metrics.top3Allocation.toFixed(1)}% of portfolio
- **Top 5 Holdings**: ${metrics.top5Allocation.toFixed(1)}% of portfolio
- **Win Rate**: ${metrics.winRate.toFixed(1)}% (${metrics.profitableHoldingsCount} winners / ${metrics.losingHoldingsCount} losers)
- **Average Holding Return**: ${metrics.avgHoldingReturn.toFixed(2)}%

### Performance Leaders
- **Best Performer**: ${metrics.bestPerformer?.ticker || 'N/A'} at ${(metrics.bestPerformer?.unrealizedPLPercent || 0).toFixed(2)}%
- **Worst Performer**: ${metrics.worstPerformer?.ticker || 'N/A'} at ${(metrics.worstPerformer?.unrealizedPLPercent || 0).toFixed(2)}%

### Sector Allocation
${sectorText}
- **Sector Count**: ${metrics.sectorCount}
- **Largest Sector**: ${metrics.largestSector} (${metrics.largestSectorPercent.toFixed(1)}%)

### Execution Quality
- **VWAP Score**: ${metrics.executionScore > 0 ? '+' : ''}${metrics.executionScore.toFixed(2)}% (${metrics.executionStatus})
- **Average Buy VWAP**: ${metrics.avgBuyVWAP.toFixed(2)}
- **Average Sell VWAP**: ${metrics.avgSellVWAP.toFixed(2)}
- Positive = bought below market average; Negative = bought above market average

### Historical Volatility
- **Portfolio Volatility (Annualized)**: ${metrics.volatility.toFixed(2)}%
- **Max Portfolio Value**: ${metrics.maxValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
- **Min Portfolio Value**: ${metrics.minValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}

---

## 📈 HOLDINGS PERFORMANCE

${holdingsText}

---

## 🏦 ANALYSIS MANDATE

You are producing a formal investment review. Follow each section precisely. Do not skip or merge sections. Use professional financial language throughout. All monetary figures must be in MAD.

---

### SECTION 1 — PORTFOLIO SCORECARD

Open with a scored dashboard. Rate the portfolio on each dimension from 1–10 and give a one-line verdict:

| Dimension | Score /10 | Verdict |
|-----------|-----------|---------|
| Return Quality | | |
| Risk Management | | |
| Diversification | | |
| Execution Discipline | | |
| Fee Efficiency | | |
| **Overall Grade** | | A / B / C / D |

Scoring anchors (apply these to every rating):
- **Return Quality**: 10 = P/L outpaces MASI + dividends compound well; 1 = negative total return with no income offset
- **Risk Management**: 10 = HHI <1500, drawdown <10%, cash buffer adequate; 1 = HHI >5000, no stop strategy visible
- **Diversification**: 10 = 5+ uncorrelated sectors, no single position >15%; 1 = 1–2 sectors dominate, top holding >40%
- **Execution Discipline**: 10 = VWAP score >+3% across portfolio; 1 = consistently buying above VWAP (paying premium)
- **Fee Efficiency**: 10 = total drag <0.5%; 5 = drag at 1–1.5%; 1 = drag >2.5%

---

### SECTION 2 — PERFORMANCE ATTRIBUTION

Answer three specific questions using the data above:

1. **Return drivers**: Which 1–3 holdings are responsible for the majority of unrealized P/L? Are gains broad-based or concentrated in one name?
2. **Income vs. capital gains split**: Dividend yield is ${metrics.dividendYield.toFixed(2)}%. For a Moroccan retail investor, is this income stream sufficient, or is the portfolio overly reliant on price appreciation?
3. **Fee verdict**: Fee drag is ${metrics.feeDragPercent.toFixed(2)}%. Benchmark: passive OPCVM in Morocco charges ~0.5–0.8% annually. Is this portfolio's drag justified by active management alpha? Answer YES or NO with a one-sentence reason.

---

### SECTION 3 — RISK & CONCENTRATION DEEP DIVE

Structure your answer around three explicit risk layers:

**Layer 1 — Position Concentration**
- HHI of ${metrics.hhiScore.toFixed(0)} signals ${metrics.hhiRiskLevel}. State whether this is structurally appropriate for the portfolio size (${metrics.totalValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}) and the illiquidity typical of Casablanca's mid/small-cap universe.
- Top 3 holdings = ${metrics.top3Allocation.toFixed(1)}%. Compare to the 40% rule of thumb for a well-diversified individual portfolio.

**Layer 2 — Sector Concentration**
- Identify which sector(s) exceed 30% allocation. Flag any structural risk: for Morocco specifically, overweight Banking is a BAM rate-sensitivity risk; overweight Real Estate is a credit-cycle risk; overweight Telecoms is a regulatory/ARPU compression risk.
- State whether sector exposure is deliberate (high-conviction) or accidental (drift from price appreciation).

**Layer 3 — Cash & Liquidity**
- Cash at ${metrics.cashPercent.toFixed(1)}%. Optimal range for Casablanca's illiquid market: 5–15%. State whether current cash is a tactical reserve, idle drag, or insufficient buffer.
- Give one specific trigger condition under which this cash should be deployed (e.g., "deploy if MASI corrects >8% from current levels").

---

### SECTION 4 — HOLDINGS QUALITY AUDIT

For every holding with allocation ≥ 10%, produce a structured mini-review using this exact template:

**[TICKER] — [SECTOR] | [ALLOCATION]%**
- Entry Quality: VWAP alpha of [X]% indicates [disciplined/expensive] entry
- Current Status: [brief one-line description of P/L situation]
- Key Risk: [single most important risk for this name on Casablanca]
- Thesis Intact?: YES / NO / WATCH — with one-sentence reasoning
- Recommendation: **HOLD / ADD / TRIM / EXIT** — state the price level or condition that would change this verdict

If no holding exceeds 10%, apply this template to the top 3 holdings by allocation.

---

### SECTION 5 — STRATEGIC ACTION PLAN

List exactly **5 prioritized actions**. Each must be grounded in a specific number from the data above. Use this format strictly:

**[#] [PRIORITY: HIGH / MEDIUM / LOW] | [TICKER or CATEGORY] | [ACTION: BUY / SELL / HOLD / ROTATE / REDUCE / DEPLOY]**
> Rationale: [One sentence citing the specific metric that drives this action — e.g., "HHI of 4,200 exceeds concentrated threshold; trimming top holding reduces score below 2,500"]
> Target: [Specific price, allocation %, or time horizon]

---

### SECTION 6 — RED FLAGS & EARLY WARNINGS 🚩

List only genuine concerns — do not pad with generic risk disclaimers. For each flag, state:
- **Flag**: [Name of the issue]
- **Evidence**: [The specific data point that triggers it]
- **Severity**: 🔴 Critical / 🟡 Moderate / 🟢 Watch
- **Resolution**: [One concrete action to neutralize it]

If no critical flags exist, state that explicitly rather than inventing them.

---

### SECTION 7 — MARKET CONTEXT (Morocco-Specific)

Close with 2–3 sentences situating this portfolio within the current Moroccan macro environment. Reference at least one of: BAM policy rate, MASI YTD performance, sector rotation trends, or upcoming IPO pipeline on Casablanca. This section should make the analysis feel local and timely, not generic.

---

## 📋 HARD OUTPUT RULES

1. Follow all 7 sections in order — do not skip or reorder
2. The Scorecard table must be the first thing after the opening line
3. Total response must be 700–900 words — not shorter, not longer
4. Never use phrases like "it is important to note" or "in conclusion" or "please consult a financial advisor"
5. Every recommendation must reference a specific number from the data
6. Use MAD for all monetary figures
7. Bold every final recommendation (HOLD / ADD / TRIM / EXIT / BUY / SELL)
`;

  if (!ai) {
    return {
      markdown: "AI service is not configured. Please set VITE_GEMINI_API_KEY in your .env.local file."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return {
      markdown: response.text || "Analysis could not be generated at this time."
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      markdown: `Error connecting to AI service. Please check your API key.\n\nDetails: ${errorMessage}`
    };
  }
};

export const fetchLatestPrices = async (tickers: string[]): Promise<Record<string, number>> => {
  if (tickers.length === 0) return {};
  if (!ai) return {};

  const model = "gemini-3-flash-preview";

  const prompt = `
    Find the latest stock price in MAD (Moroccan Dirham) for the following companies listed on the Casablanca Stock Exchange.
    Tickers: ${tickers.join(', ')}
    
    Use Google Search to find the most recent closing price or live price for each.
    Look for sources like 'Bourse de Casablanca', 'LeBoursier', or 'TradingView CSEMA'.

    Return the data strictly in this format per line: 
    TICKER: PRICE
    
    Example:
    IAM: 95.50
    ATW: 450.00
    
    Do not add any other text or markdown formatting. Only the list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const prices: Record<string, number> = {};

    const lines = text.split('\n');
    lines.forEach(line => {
      const cleanLine = line.replace(/`/g, '').trim();
      if (!cleanLine) return;

      const parts = cleanLine.split(':');
      if (parts.length >= 2) {
        let ticker = parts[0].trim().toUpperCase();
        ticker = ticker.replace('CSEMA:', '').replace('MA:', '');

        const finalPriceStr = parts[1].replace(/[^0-9.]/g, '');
        const price = parseFloat(finalPriceStr);

        if (!isNaN(price) && tickers.includes(ticker)) {
          prices[ticker] = price;
        }
      }
    });

    return prices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return {};
  }
};

export const getKellyStrategyAdvice = async (
  winRate: number,
  winLossRatio: number,
  kellyPercent: number,
  capital: number,
  hhiScore: number,
  hhiStatus: string,
  executionScore: number,
  monteCarloStats: {
    riskOfRuin: number;
    medianOutcome: number;
    worstCase: number;
    bestCase: number;
  },
  riskMetrics: {
    volatility: number;
    var95: number;
    var95Percent: number;
    maxDrawdown: number;
    sharpe: number;
  } | null,
  behaviorStats: {
    profitFactor: number;
    avgHoldWin: number;
    avgHoldLoss: number;
    largestWin: number;
    largestLoss: number;
  } | null
): Promise<{ markdown: string }> => {
  const model = "gemini-3-flash-preview";

  const kellyFraction = kellyPercent > 0 ? "Full Kelly" : kellyPercent === 0 ? "No Kelly Edge" : "Negative Kelly";
  const kellyRecommendation = kellyPercent > 0
    ? kellyPercent > 25
      ? "Consider Half-Kelly (12.5%) to reduce volatility"
      : "Kelly fraction is reasonable"
    : "No statistical edge detected - avoid increasing position size";

  const dispositionSeverity = behaviorStats
    ? behaviorStats.avgHoldLoss > behaviorStats.avgHoldWin
      ? `DETECTED — losers held ${(behaviorStats.avgHoldLoss - behaviorStats.avgHoldWin).toFixed(1)} days longer than winners`
      : `NOT DETECTED — winners held ${(behaviorStats.avgHoldWin - behaviorStats.avgHoldLoss).toFixed(1)} days longer than losers`
    : "INSUFFICIENT DATA";

  const prompt = `
# QUANTITATIVE RISK & TRADING PSYCHOLOGY AUDIT
## Kelly Criterion + Behavioral Finance Analysis for Moroccan Stock Portfolio

You are a **Quantitative Risk Manager** and **Behavioral Finance Specialist** with deep expertise in emerging market retail investor psychology. Your job is to diagnose mathematical edge, sizing discipline, and cognitive biases — using only the numbers below as evidence. Every claim you make must cite a specific figure. Never give generic advice.

---

## 📊 CORE TRADING METRICS

| Metric | Value | Signal |
|--------|-------|--------|
| **Win Rate** | ${winRate.toFixed(1)}% | ${winRate >= 60 ? '✅ Strong edge' : winRate >= 50 ? '⚠️ Marginal edge' : '🔴 Below breakeven'} |
| **Win/Loss Ratio** | ${winLossRatio.toFixed(2)}R | ${winLossRatio >= 1.5 ? '✅ Favorable' : winLossRatio >= 1.0 ? '⚠️ Neutral' : '🔴 Unfavorable'} |
| **Full Kelly %** | ${kellyPercent.toFixed(2)}% | ${kellyFraction} |
| **Half-Kelly %** | ${(kellyPercent / 2).toFixed(2)}% | Recommended max position size |
| **Capital** | ${capital.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
| **Concentration (HHI)** | ${hhiScore.toFixed(0)} | ${hhiStatus} |
| **Execution Edge** | ${executionScore > 0 ? '+' : ''}${executionScore.toFixed(2)}% VWAP | ${executionScore > 1 ? '✅ Disciplined buyer' : executionScore >= 0 ? '⚠️ Neutral execution' : '🔴 Buying at premium'} |

---

## 📈 RISK METRICS

${riskMetrics ? `
| Metric | Value | Benchmark | Status |
|--------|-------|-----------|--------|
| Annualized Volatility | ${riskMetrics.volatility.toFixed(2)}% | <20% Low / 20–35% Medium / >35% High | ${riskMetrics.volatility < 20 ? '✅' : riskMetrics.volatility < 35 ? '⚠️' : '🔴'} |
| VaR (95%, Daily) | ${riskMetrics.var95.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${riskMetrics.var95Percent.toFixed(2)}%) | <2% of equity | ${riskMetrics.var95Percent < 2 ? '✅' : '🔴'} |
| Max Drawdown | ${riskMetrics.maxDrawdown.toFixed(2)}% | <15% Acceptable / >25% Critical | ${riskMetrics.maxDrawdown < 15 ? '✅' : riskMetrics.maxDrawdown < 25 ? '⚠️' : '🔴'} |
| Sharpe Ratio (Rf=3%) | ${riskMetrics.sharpe.toFixed(2)} | >1 Good / >2 Excellent | ${riskMetrics.sharpe > 2 ? '✅' : riskMetrics.sharpe > 1 ? '⚠️' : '🔴'} |
` : '⚠️ Insufficient closed-trade history to compute risk metrics.'}

---

## 🧠 TRADING BEHAVIOR METRICS

${behaviorStats ? `
| Behavior Metric | Value | Benchmark | Assessment |
|----------------|-------|-----------|------------|
| Profit Factor | ${behaviorStats.profitFactor.toFixed(2)} | >2.0 Excellent / 1.5–2.0 Good / <1.2 Poor | ${behaviorStats.profitFactor >= 2 ? '✅' : behaviorStats.profitFactor >= 1.5 ? '⚠️' : '🔴'} |
| Avg Hold — Winners | ${behaviorStats.avgHoldWin.toFixed(1)} days | Should be ≥ avg hold losers | |
| Avg Hold — Losers | ${behaviorStats.avgHoldLoss.toFixed(1)} days | Should be ≤ avg hold winners | |
| Disposition Effect | ${dispositionSeverity} | | |
| Largest Win | ${behaviorStats.largestWin.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | | |
| Largest Loss | ${behaviorStats.largestLoss.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | | |
` : '⚠️ Insufficient trade history for behavioral analysis.'}

---

## 🎲 MONTE CARLO SIMULATION (Next 50 Trades)

| Scenario | Projected Equity | Change vs Today |
|----------|-----------------|-----------------|
| 🟢 Best Case (90th %ile) | ${monteCarloStats.bestCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | +${((monteCarloStats.bestCase - capital) / capital * 100).toFixed(1)}% |
| ⚪ Median Outcome | ${monteCarloStats.medianOutcome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${((monteCarloStats.medianOutcome - capital) / capital * 100).toFixed(1) > '0' ? '+' : ''}${((monteCarloStats.medianOutcome - capital) / capital * 100).toFixed(1)}% |
| 🔴 Worst Case (10th %ile) | ${monteCarloStats.worstCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${((monteCarloStats.worstCase - capital) / capital * 100).toFixed(1)}% |
| ☠️ Risk of Ruin | ${monteCarloStats.riskOfRuin.toFixed(2)}% | ${monteCarloStats.riskOfRuin < 1 ? '✅ Negligible' : monteCarloStats.riskOfRuin < 5 ? '⚠️ Acceptable' : '🔴 DANGEROUS — resize immediately'} |

---

## 🏦 ANALYSIS MANDATE

Produce a structured report with the following four sections. Each section must directly cite at least one number from the tables above.

---

### SECTION 1 — EDGE DIAGNOSIS (Kelly Sizing)

Begin with one bold sentence stating whether this portfolio has a **proven mathematical edge** or not, based on the win rate (${winRate.toFixed(1)}%) and W/L ratio (${winLossRatio.toFixed(2)}R).

Then answer:
1. **Full Kelly vs. Half-Kelly**: Full Kelly is ${kellyPercent.toFixed(2)}%. Explain in concrete MAD terms what this means per trade on a ${capital.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} capital base. State whether you recommend Full Kelly, Half-Kelly, or Quarter-Kelly — and why (reference volatility or drawdown if available).
2. **Kelly vs. Actual Sizing**: Compare the Kelly-optimal position size to the current HHI-implied concentration (${hhiScore.toFixed(0)}). Is the investor over-sizing or under-sizing relative to their statistical edge?
3. **Edge Sustainability**: Is the win rate and W/L ratio sample-robust, or potentially noise? State the minimum number of trades needed to consider this edge statistically meaningful (use N > 30 as the threshold).

---

### SECTION 2 — BEHAVIORAL BIAS FINGERPRINT

Diagnose exactly **three cognitive biases** from the behavioral data. For each bias, use this template:

**[BIAS NAME]**
- 🔍 Evidence: [Quote the specific numbers that confirm or rule out this bias]
- 📊 Severity: 🔴 Confirmed / 🟡 Possible / 🟢 Not present
- 🎯 Correction: [One specific, mechanical rule to counteract it — e.g., "Set a hard stop at -8% on entry; review if position is not closed within 20 days of going negative"]

The three biases to diagnose (always diagnose all three, even if data is insufficient — state "INSUFFICIENT DATA" with severity 🟡):
1. **Disposition Effect** (cutting winners early, holding losers too long)
2. **Loss Aversion / Revenge Trading** (letting largest loss grow; averaging down on losers)
3. **Overconfidence / Concentration Bias** (HHI vs. Kelly-optimal sizing; is the investor risking more than their edge justifies?)

---

### SECTION 3 — MONTE CARLO REALITY CHECK

Answer these three questions using only the simulation data:

1. **Survivability**: Given a risk of ruin of ${monteCarloStats.riskOfRuin.toFixed(2)}%, what is the probability-weighted expected outcome over 50 trades? Is the median outcome (${monteCarloStats.medianOutcome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}) worth the downside risk (${monteCarloStats.worstCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })})?
2. **Drawdown Tolerance Test**: If the worst-case scenario materializes, the portfolio loses ${((capital - monteCarloStats.worstCase) / capital * 100).toFixed(1)}%. State honestly: at what drawdown level does the average retail investor capitulate (psychological ruin), and does this portfolio's structure protect against that threshold?
3. **Asymmetry Assessment**: Is the upside (best case) sufficiently larger than the downside (worst case) to justify the strategy? Calculate the reward-to-risk ratio of the simulation: (best case gain) / (worst case loss).

---

### SECTION 4 — 6 PRECISE RECOMMENDATIONS

List exactly **6 recommendations**. Each must be a mechanical, implementable rule — not vague advice. Format strictly as:

**[#] [CATEGORY] | [SPECIFIC RULE]**
> Why: [One sentence with the exact metric that justifies this rule]
> Implement: [By when or under what condition]

Categories available: Kelly Sizing | Stop-Loss Discipline | Position Management | Psychology Protocol | Risk Reduction | Execution Improvement

---

### CLOSING — ONE HABIT THIS WEEK

End the entire report with a single bolded sentence:
**This week's priority action: [One specific, measurable habit — e.g., "Log the reason for every trade not closed within 15 days of going negative, and review weekly."]**

---

## 📋 HARD OUTPUT RULES

1. Follow all 4 sections in order — do not skip or merge
2. Maximum 550 words total — be precise, not verbose
3. Every claim must cite a specific number from the data tables
4. Never use phrases like "it is important to consider" or "you should consult a financial advisor"
5. Severity icons (✅ 🔴 🟡) must be used consistently
6. The closing habit must be the last line — bolded, on its own line
`;

  if (!ai) {
    return { markdown: "AI service is not configured. Please set VITE_GEMINI_API_KEY in your .env.local file." };
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return { markdown: response.text || "No analysis generated." };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { markdown: "Error connecting to AI risk analyst." };
  }
};
