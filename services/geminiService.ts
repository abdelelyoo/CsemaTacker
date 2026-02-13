import { GoogleGenAI } from "@google/genai";
import { PortfolioSummary, AIAnalysisResult, Holding } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ExtendedHoldingMetrics {
  ticker: string;
  companyName: string;
  sector: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  allocation: number;
  averageCost: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  buyVWAP: number;
  sellVWAP: number;
  pe?: number;
  pb?: number;
  roe?: number;
  dividendYield?: number;
  payoutRatio?: number;
  valuationSignal?: 'overvalued' | 'fair' | 'undervalued';
  qualityScore?: number;
  qualityRating?: 'A' | 'B' | 'C' | 'D' | 'F';
  redFlags: string[];
  greenFlags: string[];
}

export const analyzePortfolio = async (portfolio: PortfolioSummary): Promise<AIAnalysisResult> => {
  const model = "gemini-3-flash-preview";

  const holdingsSummary = portfolio.holdings.map(h => {
    const entryAlpha = h.buyVWAP > 0 ? ((h.currentPrice / h.buyVWAP) - 1) * 100 : 0;
    const exitAlpha = h.sellVWAP > 0 ? ((h.sellVWAP / h.currentPrice) - 1) * 100 : 0;
    return {
      ticker: h.ticker,
      sector: h.sector,
      allocation: h.allocation,
      entryAlpha,
      exitAlpha,
      currentPrice: h.currentPrice,
      unrealizedPLPercent: h.unrealizedPLPercent,
      buyVWAP: h.buyVWAP,
      sellVWAP: h.sellVWAP
    };
  });

  const holdingsText = portfolio.holdings.map(h => {
    const entryAlpha = h.buyVWAP > 0 ? ((h.currentPrice / h.buyVWAP) - 1) * 100 : 0;
    const exitAlpha = h.sellVWAP > 0 ? ((h.sellVWAP / h.currentPrice) - 1) * 100 : 0;
    return `- ${h.ticker} (${h.sector}): ${h.allocation.toFixed(2)}% of portfolio. Entry VWAP: ${h.buyVWAP.toFixed(2)} (Alpha: ${entryAlpha.toFixed(2)}%). Exit VWAP: ${h.sellVWAP.toFixed(2)} (Alpha: ${exitAlpha.toFixed(2)}%). Current: ${h.currentPrice.toFixed(2)}. P/L: ${h.unrealizedPLPercent.toFixed(2)}%`;
  }).join('\n');

  const sectorDistribution = portfolio.holdings.reduce((acc, curr) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + curr.allocation;
    return acc;
  }, {} as Record<string, number>);

  const sectorSummary = Object.entries(sectorDistribution)
    .map(([sec, val]) => `${sec}: ${val.toFixed(2)}%`)
    .join(', ');

  let totalWeight = 0;
  let weightedEdgeSum = 0;

  portfolio.holdings.forEach(h => {
    if (h.allocation > 0 && h.averagePrice > 0) {
      const edge = ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100;
      weightedEdgeSum += edge * h.allocation;
      totalWeight += h.allocation;
    }
  });

  const executionScore = totalWeight > 0 ? weightedEdgeSum / totalWeight : 0;
  const executionStatus = executionScore > 0 ? "Positive (Buying Value)" : "Negative (Paying Premium)";

  let hhiScore = 0;
  portfolio.holdings.forEach(h => {
    hhiScore += (h.allocation * h.allocation);
  });

  const totalFees = portfolio.totalTradingFees + portfolio.totalCustodyFees;
  const feeDragPercent = portfolio.totalValue > 0 ? (totalFees / portfolio.totalValue) * 100 : 0;

  const topHolding = portfolio.holdings.reduce((max, h) => h.allocation > max.allocation ? h : max, portfolio.holdings[0]);
  const top3Allocation = [...portfolio.holdings]
    .sort((a, b) => b.allocation - a.allocation)
    .slice(0, 3)
    .reduce((sum, h) => sum + h.allocation, 0);

  const profitableHoldings = portfolio.holdings.filter(h => h.unrealizedPL > 0);
  const losingHoldings = portfolio.holdings.filter(h => h.unrealizedPL < 0);
  const winRate = portfolio.holdings.length > 0 ? (profitableHoldings.length / portfolio.holdings.length) * 100 : 0;

  const totalDividendYield = portfolio.totalValue > 0 ? (portfolio.totalDividends / portfolio.totalValue) * 100 : 0;

  const cashPercent = portfolio.totalValue > 0 ? (portfolio.cashBalance / portfolio.totalValue) * 100 : 0;

  let hhiRiskLevel: string;
  if (hhiScore < 1500) hhiRiskLevel = "DIVERSIFIED";
  else if (hhiScore < 2500) hhiRiskLevel = "MODERATE";
  else if (hhiScore < 5000) hhiRiskLevel = "CONCENTRATED";
  else hhiRiskLevel = "HIGHLY CONCENTRATED";

  const prompt = `
# MOROCCAN PORTFOLIO AI ADVISOR
## Comprehensive Investment Audit for Casablanca Stock Exchange (Bourse de Casablanca)

You are a **Senior Investment Strategist** specializing in the Moroccan market. Your role is to provide institutional-grade analysis with actionable intelligence. Be precise, data-driven, and direct.

---

## 📊 PORTFOLIO SNAPSHOT

### Core Metrics
| Metric | Value |
|--------|-------|
| **Total Equity** | ${portfolio.totalValue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Cash Position** | ${portfolio.cashBalance.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${cashPercent.toFixed(1)}%) |
| **Unrealized P/L** | ${portfolio.totalUnrealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Realized P/L (YTD)** | ${portfolio.totalRealizedPL.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Dividend Income** | ${portfolio.totalDividends.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} |
| **Dividend Yield** | ${totalDividendYield.toFixed(2)}% |
| **Holdings Count** | ${portfolio.holdings.length} stocks |

### Fee Analysis
| Fee Type | Amount (MAD) | Impact |
|----------|--------------|--------|
| Trading Fees | ${portfolio.totalTradingFees.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
| Custody Fees | ${portfolio.totalCustodyFees.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
| **Total Fee Drag** | ${totalFees.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | **${feeDragPercent.toFixed(2)}%** of equity |

---

## 🎯 RISK PROFILE

### Concentration Analysis
- **HHI Score**: ${hhiScore.toFixed(0)} (${hhiRiskLevel})
- **Top Holding**: ${topHolding?.ticker || 'N/A'} at ${topHolding?.allocation.toFixed(1) || 0}%
- **Top 3 Holdings**: ${top3Allocation.toFixed(1)}% of portfolio
- **Win Rate**: ${winRate.toFixed(1)}% (${profitableHoldings.length} winners / ${losingHoldings.length} losers)

### Sector Allocation
${sectorSummary}

### Execution Quality
- **VWAP Score**: ${executionScore > 0 ? '+' : ''}${executionScore.toFixed(2)}% (${executionStatus})
- Positive = bought below market average; Negative = bought above market average

---

## 📈 HOLDINGS PERFORMANCE

${holdingsText}

---

## 🏦 YOUR MANDATE

Analyze the above data and produce a **structured investment report** with the following sections:

### 1. EXECUTIVE SUMMARY (Max 3 sentences)
- Overall portfolio health assessment
- Key strength or primary concern
- Immediate action required (if any)

### 2. PERFORMANCE ATTRIBUTION
- Is the unrealized P/L justified by market conditions?
- How does dividend income compare to total returns?
- Assess fee drag impact: Is ${feeDragPercent.toFixed(2)}% excessive for a long-term portfolio? (基准: >1.5% = High)

### 3. RISK & DIVERSIFICATION DEEP DIVE
- Evaluate concentration risk: Is ${hhiRiskLevel} appropriate for your risk tolerance?
- Sector analysis: Any over-reliance on cyclical sectors (Banking, Real Estate)?
- Cash deployment: Is ${cashPercent.toFixed(1)}% too much/idle cash?

### 4. HOLDINGS QUALITY AUDIT
For each holding >10% allocation, provide:
- Valuation outlook (fair/overvalued/undervalued)
- Key risks (from red flags if available)
- Recommendation (HOLD / TRIM / ADD)

### 5. STRATEGIC ACTION PLAN
Provide exactly **5 bullet points** with:
- **Priority** (HIGH/MEDIUM/LOW)
- **Ticker/Category** affected
- **Action** (BUY/SELL/HOLD/ROTATE)
- **Rationale** (1 sentence)

Format each as: **[PRIORITY] [TICKER]: [ACTION] - [RATIONALE]**

### 6. RED FLAGS 🚩
List any critical warnings:
- Over-concentration
- High fee drag
- Underperforming positions
- Sector imbalances
- Liquidity concerns

---

## 📋 OUTPUT REQUIREMENTS

1. Use professional financial language
2. All numbers must include MAD currency where applicable
3. Provide specific, actionable recommendations (not generic advice)
4. Consider Moroccan market specifics (liquidity, sector dynamics, regulatory environment)
5. Keep total response under 800 words
6. Use tables for comparison data
7. Bold key metrics and recommendations
`;

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
    return {
      markdown: "Error connecting to AI service. Please check your API key."
    };
  }
};

export const fetchLatestPrices = async (tickers: string[]): Promise<Record<string, number>> => {
  if (tickers.length === 0) return {};

  const model = "gemini-3-pro-preview"; // Upgraded for better search reasoning

  // Format tickers for explicit Moroccan context
  const searchContext = tickers.map(t => `CSEMA:${t}`).join(', ');

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

    // Parsing logic
    const lines = text.split('\n');
    lines.forEach(line => {
      // Clean up markdown code blocks if present
      const cleanLine = line.replace(/`/g, '').trim();
      if (!cleanLine) return;

      const parts = cleanLine.split(':');
      if (parts.length >= 2) {
        let ticker = parts[0].trim().toUpperCase();
        // Handle cases where AI might return "CSEMA:IAM" instead of "IAM"
        ticker = ticker.replace('CSEMA:', '').replace('MA:', '');

        // Parse price
        // Remove 'MAD', commas, or spaces
        const priceStr = parts[1]
          .replace(/MAD/i, '')
          .replace(/\s/g, '') // remove spaces
          .replace(/,/g, '.') // ensure dot decimal (sometimes search returns 1,200.00 or 1.200,00)

        // Re-clean for simple float
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
    avgHoldWin: number; // in days
    avgHoldLoss: number; // in days
    largestWin: number;
    largestLoss: number;
  } | null
): Promise<{ markdown: string }> => {
  const model = "gemini-3-flash-preview";

  // Format risk metrics text
  const riskText = riskMetrics
    ? `
    - Annualized Volatility: ${riskMetrics.volatility.toFixed(2)}%
    - Value at Risk (VaR 95% Daily): ${riskMetrics.var95.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} (${riskMetrics.var95Percent.toFixed(2)}%)
    - Max Drawdown: ${riskMetrics.maxDrawdown.toFixed(2)}%
    - Sharpe Ratio (Rf=3%): ${riskMetrics.sharpe.toFixed(2)}`
    : "Not enough historical data.";

  // Format behavior metrics text
  const behaviorText = behaviorStats
    ? `
    - Profit Factor (Gross Win / Gross Loss): ${behaviorStats.profitFactor.toFixed(2)}
    - Avg Hold Time (Winners): ${behaviorStats.avgHoldWin.toFixed(1)} days
    - Avg Hold Time (Losers): ${behaviorStats.avgHoldLoss.toFixed(1)} days
    - Largest Win: ${behaviorStats.largestWin.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
    - Largest Loss: ${behaviorStats.largestLoss.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
    `
    : "Not enough closed trades to analyze behavior.";

  const kellyFraction = kellyPercent > 0 ? "Full Kelly" : kellyPercent === 0 ? "No Kelly Edge" : "Negative Kelly";
  const kellyRecommendation = kellyPercent > 0 
    ? kellyPercent > 25 
      ? "Consider Half-Kelly (12.5%) to reduce volatility" 
      : "Kelly fraction is reasonable"
    : "No statistical edge detected - avoid increasing position size";

  const prompt = `
# QUANTITATIVE RISK & TRADING PSYCHOLOGY AUDIT
## Kelly Criterion Analysis for Moroccan Stock Portfolio

You are a **Quantitative Risk Manager** and **Trading Psychologist** combined. Your mission is to identify mathematical risks AND cognitive/emotional biases that undermine performance.

---

## 📊 CORE TRADING METRICS

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **Win Rate** | ${winRate.toFixed(1)}% | ${winRate > 50 ? 'Positive edge' : 'Below breakeven'} |
| **Win/Loss Ratio** | ${winLossRatio.toFixed(2)}R | ${winLossRatio > 1 ? 'Favorable' : 'Unfavorable'} reward/risk |
| **Kelly %** | ${kellyPercent.toFixed(2)}% | ${kellyFraction} |
| **Equity** | ${capital.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
| **Concentration (HHI)** | ${hhiScore.toFixed(0)} | ${hhiStatus} |
| **Execution Edge** | ${executionScore > 0 ? '+' : ''}${executionScore.toFixed(2)}% | ${executionScore > 0 ? 'Buying at discount' : 'Buying at premium'} |

---

## 📈 RISK METRICS

${riskMetrics ? `
| Metric | Value | Benchmark |
|--------|-------|-----------|
| Volatility | ${riskMetrics.volatility.toFixed(2)}% | <20% = Low |
| VaR (95%) | ${riskMetrics.var95.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${riskMetrics.var95Percent.toFixed(2)}% of equity |
| Max Drawdown | ${riskMetrics.maxDrawdown.toFixed(2)}% | <15% = Acceptable |
| Sharpe Ratio | ${riskMetrics.sharpe.toFixed(2)} | >1 = Good, >2 = Excellent |
` : 'Insufficient data for risk metrics'}

---

## 🧠 TRADING BEHAVIOR ANALYSIS

${behaviorStats ? `
| Behavior Metric | Value | Assessment |
|----------------|-------|------------|
| Profit Factor | ${behaviorStats.profitFactor.toFixed(2)} | ${behaviorStats.profitFactor > 1.5 ? 'Healthy' : 'Needs improvement'} |
| Avg Hold Time (Winners) | ${behaviorStats.avgHoldWin.toFixed(1)} days | ${behaviorStats.avgHoldWin > behaviorStats.avgHoldLoss ? 'Good patience' : 'Possible early exit'} |
| Avg Hold Time (Losers) | ${behaviorStats.avgHoldLoss.toFixed(1)} days | ${behaviorStats.avgHoldLoss > behaviorStats.avgHoldWin ? 'Loss aversion detected' : 'Good discipline'} |
| Largest Win | ${behaviorStats.largestWin.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
| Largest Loss | ${behaviorStats.largestLoss.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | |
` : 'Insufficient trade history for behavior analysis'}

---

## 🎲 MONTE CARLO SIMULATION (Next 50 Trades)

| Scenario | Equity | Change |
|----------|--------|--------|
| **Best Case (90th %ile)** | ${monteCarloStats.bestCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | +${((monteCarloStats.bestCase - capital) / capital * 100).toFixed(1)}% |
| **Median Outcome** | ${monteCarloStats.medianOutcome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | +${((monteCarloStats.medianOutcome - capital) / capital * 100).toFixed(1)}% |
| **Worst Case (10th %ile)** | ${monteCarloStats.worstCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })} | ${((monteCarloStats.worstCase - capital) / capital * 100).toFixed(1)}% |
| **Risk of Ruin** | ${monteCarloStats.riskOfRuin.toFixed(2)}% | ${monteCarloStats.riskOfRuin < 5 ? 'ACCEPTABLE' : 'DANGEROUS'} |

---

## 🏦 YOUR ANALYSIS MANDATE

### Part 1: Cognitive & Emotional Patterns

Analyze the following behavioral biases:

1. **Disposition Effect**: Compare avg hold time winners vs losers. Are winners sold too early (fear of giving back profits) or are losers held too long (loss aversion)?

2. **Overconfidence/Discipline**: Relate largest loss to average loss. Multiple of 3x+ suggests possible revenge trading or stop-loss violation.

3. **Patience Score**: Evaluate if holding periods align with win rate - winners should be held longer than losers.

### Part 2: Risk & Position Sizing

1. **Kelly Recommendation**: ${kellyRecommendation}
2. **VaR Assessment**: Can you tolerate ${riskMetrics?.var95Percent.toFixed(1) || 'N/A'}% daily loss?
3. **Drawdown Tolerance**: ${riskMetrics?.maxDrawdown.toFixed(1) || 'N/A'}% max drawdown - will you stay invested?

### Part 3: Strategic Recommendations

Provide exactly **5 actionable recommendations** in this format:
- **[PRIORITY] [CATEGORY]: [ACTION] - [RATIONALE]**

Categories: Kelly Sizing | Risk Management | Psychology | Position Sizing | Exit Strategy

---

## 📋 OUTPUT FORMAT

- Maximum 600 words
- Use bold for key findings
- Lead with psychological assessment, then mathematical risk
- End with one specific habit to implement this week
`;

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