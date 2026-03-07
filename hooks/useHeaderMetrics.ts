import { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { MarketStock } from '../services/marketDataService';

interface HeaderMetrics {
  health: string;
  healthColor: string;
  sentiment: string;
  sentimentPercent: number;
  riskLevel: string;
  buySignals: number;
  sellSignals: number;
  totalReturnPercent: number;
  volatility: number;
}

export function useHeaderMetrics(marketData: Map<string, MarketStock>): HeaderMetrics {
  const { portfolio } = usePortfolioContext();

  return useMemo(() => {
    const totalReturn = portfolio.totalUnrealizedPL + portfolio.totalRealizedPL;
    const totalReturnPercent = portfolio.totalCost > 0 ? (totalReturn / portfolio.totalCost) * 100 : 0;

    let health = 'Neutral';
    let healthColor = 'text-slate-600';
    if (totalReturnPercent > 10) { health = 'Excellent'; healthColor = 'text-emerald-600'; }
    else if (totalReturnPercent > 5) { health = 'Good'; healthColor = 'text-emerald-500'; }
    else if (totalReturnPercent > 0) { health = 'Fair'; healthColor = 'text-amber-500'; }
    else if (totalReturnPercent < -5) { health = 'Poor'; healthColor = 'text-rose-500'; }

    let totalChange = 0;
    let weightedChange = 0;
    let totalWeight = 0;
    portfolio.holdings.forEach(h => {
      const stock = marketData.get(h.ticker);
      const change = stock?.change_percent || 0;
      weightedChange += change * h.marketValue;
      totalWeight += h.marketValue;
    });
    totalChange = totalWeight > 0 ? weightedChange / totalWeight : 0;
    const sentiment = totalChange > 2 ? 'BULLISH' : totalChange < -2 ? 'BEARISH' : 'NEUTRAL';
    const sentimentPercent = Math.abs(totalChange).toFixed(0);

    const herfindahlIndex = portfolio.holdings.length > 0
      ? portfolio.holdings.reduce((sum, h) => sum + Math.pow(h.allocation / 100, 2) * 10000, 0)
      : 0;
    let riskLevel = 'Diversified';
    if (herfindahlIndex > 3000) riskLevel = 'Concentrated';
    else if (herfindahlIndex > 1500) riskLevel = 'Moderate';

    let volatility = 0;
    if (portfolio.history && portfolio.history.length > 1) {
      const returns: number[] = [];
      for (let i = 1; i < portfolio.history.length; i++) {
        const current = portfolio.history[i].value;
        const prev = portfolio.history[i - 1].value;
        if (prev > 0) {
          returns.push((current - prev) / prev);
        }
      }
      if (returns.length > 0) {
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const dailyVol = Math.sqrt(variance);
        volatility = dailyVol * Math.sqrt(252) * 100;
      }
    }

    let buySignals = 0;
    let sellSignals = 0;
    portfolio.holdings.forEach(h => {
      const stock = marketData.get(h.ticker);
      if (stock) {
        if (stock.rsi_14 && stock.rsi_14 < 30) buySignals++;
        if (stock.rsi_14 && stock.rsi_14 > 70) sellSignals++;
        if (stock.price && stock.sma_50 && stock.price > stock.sma_50) buySignals++;
        if (stock.price && stock.sma_50 && stock.price < stock.sma_50) sellSignals++;
        if (stock.sma_50 && stock.sma_200 && stock.sma_50 > stock.sma_200) buySignals++;
        if (stock.sma_50 && stock.sma_200 && stock.sma_50 < stock.sma_200) sellSignals++;
      }
    });

    const result = {
      health,
      healthColor,
      sentiment,
      sentimentPercent: parseFloat(sentimentPercent),
      riskLevel,
      buySignals,
      sellSignals,
      totalReturnPercent,
      volatility
    };

    return result;
  }, [portfolio, marketData]);
}