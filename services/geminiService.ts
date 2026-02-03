import { GoogleGenAI } from "@google/genai";
import { PortfolioSummary, AIAnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePortfolio = async (portfolio: PortfolioSummary): Promise<AIAnalysisResult> => {
  const model = "gemini-3-flash-preview";

  // Construct a concise summary for the AI
  const holdingsSummary = portfolio.holdings.map(h => {
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

  // Calculate VWAP Execution Score (Weighted average of price difference)
  let totalWeight = 0;
  let weightedEdgeSum = 0;

  portfolio.holdings.forEach(h => {
    if (h.allocation > 0 && h.averagePrice > 0) {
      // Positive edge means Current > Average (Buying low, holding high)
      const edge = ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100;
      weightedEdgeSum += edge * h.allocation;
      totalWeight += h.allocation;
    }
  });

  const executionScore = totalWeight > 0 ? weightedEdgeSum / totalWeight : 0;
  const executionStatus = executionScore > 0 ? "Positive (Buying Value)" : "Negative (Paying Premium)";

  // --- New Risk Calculations ---

  // 1. Calculate HHI (Herfindahl-Hirschman Index)
  // Sum of squared allocations (0-100 scale). 
  // Result ranges from ~0 (infinite diversification) to 10,000 (100% in one asset).
  let hhiScore = 0;
  portfolio.holdings.forEach(h => {
    hhiScore += (h.allocation * h.allocation);
  });

  // 2. Fee Drag Calculation
  // Total costs relative to current portfolio value
  const totalFees = portfolio.totalTradingFees + portfolio.totalCustodyFees;
  const feeDragPercent = portfolio.totalValue > 0 ? (totalFees / portfolio.totalValue) * 100 : 0;


  const prompt = `
    You are a senior financial analyst specializing in the Moroccan Stock Market (Bourse de Casablanca).
    Analyze the following portfolio data:

    **Portfolio Stats:**
    - Total Equity Value: ${portfolio.totalValue.toFixed(2)} MAD
    - Available Cash: ${portfolio.cashBalance.toFixed(2)} MAD
    - Unrealized P/L: ${portfolio.totalUnrealizedPL.toFixed(2)} MAD
    - Realized P/L: ${portfolio.totalRealizedPL.toFixed(2)} MAD
    - Total Dividends: ${portfolio.totalDividends.toFixed(2)} MAD
    
    **Risk & Concentration Metrics:**
    - HHI Score (Concentration): ${hhiScore.toFixed(0)} 
      *(Reference: <1500 Diversified, 1500-2500 Moderate, >2500 Concentrated)*
    - Fee Drag: ${feeDragPercent.toFixed(2)}% of Portfolio Value
    - Total Trading Fees Paid: ${portfolio.totalTradingFees.toFixed(2)} MAD

    **Execution Quality (VWAP Analysis):**
    - Aggregate Execution Score: ${executionScore > 0 ? '+' : ''}${executionScore.toFixed(2)}%
    - Status: ${executionStatus}
    (This metric compares Volume Weighted Average Price of holdings vs Current Market Price).

    **Sector Allocation:**
    ${sectorSummary}

    **Holdings:**
    ${holdingsSummary}

    **Task:**
    1. **Financial Health**: Evaluate performance considering the fee drag. Is the strategy profitable after costs?
    2. **Execution Timing**: Analyze the VWAP Score. Are trades generally timed well?
    3. **Strategy**: Suggest moves to optimize returns.
    4. **Potential Red Flags 🚩**: Create a dedicated section highlighting specific risks:
       - **Over-Concentration**: Use the HHI score to warn if the portfolio is too dependent on specific stocks or sectors (e.g. Banks or Construction).
       - **Excessive Churn**: Analyze the 'Fee Drag'. If > 2%, warn about over-trading or high brokerage costs.
       - **Loser Retention**: Identify if large allocations are tied up in losing positions (Loss Aversion bias).
       - **Sector Risk**: Flag if the portfolio is missing key defensive sectors or is over-exposed to cyclical ones.
    
    Format the response in clean Markdown with headers. Keep it professional but direct.
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

  const prompt = `
    You are a dual-expert: a **Quantitative Risk Manager** and a **Trading Psychologist**.
    Your goal is to audit a trader's portfolio to identify mathematical risks AND hidden cognitive/emotional biases.

    **Input Statistics:**
    - Win Rate: ${winRate.toFixed(1)}%
    - Win/Loss Ratio (R): ${winLossRatio.toFixed(2)}
    - Total Equity: ${capital.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}

    **Calculated Metrics:**
    - Optimal Full Kelly Allocation: ${kellyPercent.toFixed(2)}%
    - Portfolio Concentration (HHI): ${hhiScore.toFixed(0)} (${hhiStatus})
    - VWAP Execution Edge: ${executionScore > 0 ? '+' : ''}${executionScore.toFixed(2)}%

    **Portfolio Risk Analysis:**
    ${riskText}

    **Trading Behavior & Psychology:**
    ${behaviorText}

    **Monte Carlo Simulation (Next 50 Trades):**
    - Median Expected Equity: ${monteCarloStats.medianOutcome.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
    - Worst Case (10th %ile): ${monteCarloStats.worstCase.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
    - Risk of Ruin: ${monteCarloStats.riskOfRuin.toFixed(2)}%

    **Task:**
    1. **Cognitive & Emotional Patterns Analysis**:
       - **Disposition Effect**: Analyze Avg Hold Time of Winners vs Losers. Are they selling winners too early (fear of missing profit) or holding losers too long (loss aversion)?
       - **Overconfidence / Discipline**: Analyze the 'Largest Loss' relative to the 'Avg Loss'. Does this indicate "revenge trading" or a failure to respect stop-losses?
       - **Consistency**: Does the Profit Factor indicate a stable psychological approach?
    
    2. **Strategic Roadmap (Financial Advisor Mode)**:
       - **Immediate Optimization**: Recommend specific, actionable changes to position sizing (based on Kelly) and risk limits (based on VaR).
       - **Strategic Adjustments**: How to balance the HHI concentration risk with the statistical edge.
       - **Psychological Protocol**: Give 1 specific habit to fix the identified cognitive bias (e.g., "Implement a time-stop" or "Set hard stop at -5%").

    Format as markdown with clear headers. Tone: Professional, Insightful, and Constructive. Max 600 words.
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