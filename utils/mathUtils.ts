/**
 * Centralized Math Utilities
 * All formulas used across the application in one place
 */

export interface Trade {
  RealizedPL?: number | null;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Convert score to letter grade
 */
export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate percentile rank of a value in an array
 */
export function calculatePercentile(value: number, array: number[]): number {
  if (array.length === 0) return 0;
  const strictlyLess = array.filter(v => v < value).length;
  return (strictlyLess / array.length) * 100;
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI) for concentration
 * Input: Array of allocations as percentages (e.g., 50 for 50%)
 * Output: HHI score (0-10000 scale)
 */
export function calculateHHI(allocations: number[]): number {
  return allocations.reduce((sum, share) => sum + share * share, 0);
}

/**
 * Calculate effective diversification from HHI
 * Input: HHI score (0-10000 scale)
 * Output: Diversification percentage (0-100)
 */
export function calculateEffectiveDiversification(hhi: number): number {
  return Math.max(0, (1 - hhi / 10000) * 100);
}

/**
 * Get risk level from HHI score
 */
export function getRiskLevelFromHHI(hhi: number): 'low' | 'moderate' | 'high' | 'extreme' {
  if (hhi < 1500) return 'low';
  if (hhi < 2500) return 'moderate';
  if (hhi < 5000) return 'high';
  return 'extreme';
}

/**
 * Calculate volatility from returns array
 */
export function calculateVolatility(returns: number[]): { daily: number; annual: number } {
  if (returns.length === 0) return { daily: 0, annual: 0 };

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);

  return {
    daily: dailyVol,
    annual: dailyVol * Math.sqrt(252)
  };
}

/**
 * Calculate Value at Risk (VaR)
 * @param returns Array of historical returns
 * @param confidence Confidence level (e.g., 0.95 for 95%)
 * @param portfolioValue Current portfolio value
 */
export function calculateVaR(returns: number[], confidence: number, portfolioValue: number): { percent: number; value: number } {
  if (returns.length === 0) return { percent: 0, value: 0 };

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  const varPercent = Math.abs(sorted[index] || 0);

  return {
    percent: varPercent * 100,
    value: portfolioValue * varPercent
  };
}

/**
 * Calculate Sharpe Ratio
 * @param returns Array of historical returns
 * @param riskFreeRate Risk-free rate (e.g., 0.03 for 3%)
 */
export function calculateSharpe(returns: number[], riskFreeRate: number = 0.03): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualReturn = avgReturn * 252;

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252);

  if (annualVol === 0) return 0;
  return (annualReturn - riskFreeRate) / annualVol;
}

/**
 * Calculate Maximum Drawdown from portfolio values
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length === 0) return 0;

  let peak = -Infinity;
  let maxDrawdown = 0;

  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100; // Return as percentage
}

/**
 * Calculate Win Rate from trades
 */
export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.RealizedPL !== undefined && t.RealizedPL !== null && t.RealizedPL !== 0);
  if (closedTrades.length === 0) return 0;

  const wins = closedTrades.filter(t => (t.RealizedPL || 0) > 0).length;
  return (wins / closedTrades.length) * 100;
}

/**
 * Calculate Profit Factor
 */
export function calculateProfitFactor(wins: number, losses: number): number {
  if (losses === 0) return wins > 0 ? Infinity : 0;
  return wins / losses;
}

/**
 * Calculate Kelly Criterion percentage
 * @param winRate Win probability (e.g., 50 for 50%)
 * @param avgWin Average win amount
 * @param avgLoss Average loss amount
 */
export function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (winRate <= 0 || avgLoss <= 0) return 0;

  const W = winRate / 100;
  const R = avgWin / avgLoss;

  const kelly = W - ((1 - W) / R);
  return Math.max(0, kelly * 100); // Return as percentage, min 0
}

/**
 * Calculate position size using Kelly Criterion
 */
export function calculatePositionSize(
  portfolioValue: number,
  winRate: number,
  avgWin: number,
  avgLoss: number
): number {
  const kellyPercent = calculateKellyCriterion(winRate, avgWin, avgLoss);
  const halfKelly = kellyPercent / 2; // Half-Kelly for more conservative sizing

  return portfolioValue * (halfKelly / 100);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate GARP score (Growth at Reasonable Price)
 * @param pe P/E ratio
 * @param growthRate Expected growth rate (as percentage)
 * @param roe Return on Equity (as percentage)
 */
export function calculateGARPScore(pe: number, growthRate: number, roe: number): number {
  let score = 70; // Base score

  // PEG adjustments
  const peg = pe / (growthRate || 1);
  if (peg < 1) score += 25;
  else if (peg < 1.5) score += 15;
  else if (peg < 2) score += 5;

  // ROE trend (simplified - could be enhanced with historical data)
  if (roe > 20) score += 10;
  else if (roe > 15) score += 5;
  else if (roe < 5) score -= 10;

  return clamp(score, 0, 100);
}

/**
 * Get valuation signal based on PEG ratio
 */
export function getValuationSignal(peg: number): 'undervalued' | 'fair' | 'overvalued' {
  if (peg < 0.8) return 'undervalued';
  if (peg > 2.0) return 'overvalued';
  return 'fair';
}
