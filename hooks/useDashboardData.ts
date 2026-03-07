import { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { MarketStock } from '../services/marketDataService';

export function useTreemapData(marketData: Map<string, MarketStock>, treemapMetric: string) {
  const { portfolio } = usePortfolioContext();

  return useMemo(() => {
    const sectors: Record<string, { name: string; children: any[] }> = {};

    portfolio.holdings.forEach(h => {
      if (h.marketValue > 0) {
        const stock = marketData.get(h.ticker);
        const sector = stock?.sector || h.sector || 'Unknown';

        if (!sectors[sector]) {
          sectors[sector] = { name: sector, children: [] };
        }
        sectors[sector].children.push({
          name: h.ticker,
          value: h.marketValue,
          sector: sector,
          pe: stock?.pe_ratio,
          pb: stock?.pb_ratio,
          roe: stock?.roe,
          roa: stock?.roa,
          yield: stock?.dividend_yield,
          change: stock?.change_percent,
          rsi: stock?.rsi_14,
          perf_1m: stock?.perf_1m,
          perf_3m: stock?.perf_3m,
          gross_margin: stock?.gross_margin,
          net_margin: stock?.net_margin,
          metricValue: stock?.[treemapMetric as keyof MarketStock] ?? 0
        });
      }
    });

    return Object.values(sectors);
  }, [portfolio.holdings, marketData, treemapMetric]);
}

export function useSectorData() {
  const { portfolio } = usePortfolioContext();

  return useMemo(() => {
    const sectors: Record<string, number> = {};

    portfolio.holdings.forEach(h => {
      if (h.marketValue > 0) {
        sectors[h.sector] = (sectors[h.sector] || 0) + h.marketValue;
      }
    });

    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio.holdings]);
}

export function useFilteredChartData(timeRange: '1M' | '3M' | '6M' | '1Y' | 'ALL') {
  const { portfolio } = usePortfolioContext();

  return useMemo(() => {
    if (!portfolio.history?.length || portfolio.history.length < 2) {
      return [];
    }

    if (timeRange === 'ALL') {
      return portfolio.history;
    }

    const now = new Date();
    const cutoff = new Date();
    if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (timeRange === '3M') cutoff.setMonth(now.getMonth() - 3);
    else if (timeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
    else if (timeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);

    return portfolio.history.filter(pt => new Date(pt.date) >= cutoff);
  }, [portfolio.history, timeRange]);
}
