import React, { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { formatCurrency } from '../utils/helpers';
import { TrendingUp, TrendingDown, Shield, PieChart, BarChart3, Activity } from 'lucide-react';

interface MarketContextProps {
  sectorData: { name: string; value: number }[];
  totalValue: number;
  volatility: number;
}

export const MarketContext: React.FC<MarketContextProps> = ({
  sectorData,
  totalValue,
  volatility
}) => {
  const { portfolio } = usePortfolioContext();
  const [marketData, setMarketData] = React.useState<Map<string, MarketStock>>(new Map());

  React.useEffect(() => {
    const loadMarketData = async () => {
      const tickers = portfolio.holdings.map(h => h.ticker);
      if (tickers.length === 0) return;
      try {
        const stocks = await MarketDataService.getAllStocks({ limit: 200 });
        const dataMap = new Map<string, MarketStock>();
        stocks.forEach(stock => dataMap.set(stock.ticker, stock));
        setMarketData(dataMap);
      } catch (err) { }
    };
    loadMarketData();
  }, [portfolio.holdings]);

  const portfolioMetrics = useMemo(() => {
    let totalPE = 0;
    let totalPB = 0;
    let totalYield = 0;
    let totalROE = 0;
    let totalMarketCap = 0;
    let countWithPE = 0;
    let countWithPB = 0;
    let countWithYield = 0;
    let countWithROE = 0;
    let countWithMarketCap = 0;

    portfolio.holdings.forEach(h => {
      const stock = marketData.get(h.ticker);
      if (stock) {
        if (stock.pe_ratio && stock.pe_ratio > 0) {
          totalPE += stock.pe_ratio * h.marketValue;
          countWithPE += h.marketValue;
        }
        if (stock.pb_ratio && stock.pb_ratio > 0) {
          totalPB += stock.pb_ratio * h.marketValue;
          countWithPB += h.marketValue;
        }
        if (stock.dividend_yield && stock.dividend_yield > 0) {
          totalYield += stock.dividend_yield * h.marketValue;
          countWithYield += h.marketValue;
        }
        if (stock.roe && stock.roe > 0) {
          totalROE += stock.roe * h.marketValue;
          countWithROE += h.marketValue;
        }
        if (stock.market_cap && stock.market_cap > 0) {
          totalMarketCap += stock.market_cap * h.marketValue;
          countWithMarketCap += h.marketValue;
        }
      }
    });

    const avgPE = countWithPE > 0 ? totalPE / countWithPE : 0;
    const avgPB = countWithPB > 0 ? totalPB / countWithPB : 0;
    const avgYield = countWithYield > 0 ? totalYield / countWithYield : 0;
    const avgROE = countWithROE > 0 ? totalROE / countWithROE : 0;
    const avgMarketCap = countWithMarketCap > 0 ? totalMarketCap / countWithMarketCap : 0;

    return { avgPE, avgPB, avgYield, avgROE, avgMarketCap };
  }, [portfolio.holdings, marketData]);

  const topSectorPercent = sectorData.length > 0 ? (sectorData[0].value / totalValue * 100).toFixed(1) : '0';
  const topSectorName = sectorData[0]?.name || 'N/A';

  const getVolatilityLevel = (vol: number) => {
    if (vol <= 0) return { label: 'LOW', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (vol < 15) return { label: 'LOW', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (vol < 25) return { label: 'MEDIUM', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { label: 'HIGH', color: 'text-rose-600', bg: 'bg-rose-100' };
  };

  const volLevel = getVolatilityLevel(volatility);

  const getMarketCapCategory = (cap: number) => {
    if (cap >= 200e9) return { label: 'Mega Cap', color: 'text-purple-600' };
    if (cap >= 10e9) return { label: 'Large Cap', color: 'text-blue-600' };
    if (cap >= 2e9) return { label: 'Mid Cap', color: 'text-green-600' };
    if (cap >= 300e6) return { label: 'Small Cap', color: 'text-amber-600' };
    return { label: 'Micro Cap', color: 'text-rose-600' };
  };

  const marketCapCategory = getMarketCapCategory(portfolioMetrics.avgMarketCap);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Market Context</h2>
          <p className="text-xs text-slate-500 font-medium">Portfolio Fundamentals</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <PieChart size={14} className="text-blue-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Avg P/E</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {portfolioMetrics.avgPE > 0 ? portfolioMetrics.avgPE.toFixed(1) : '--'}
          </div>
          <div className={`text-[9px] font-bold ${portfolioMetrics.avgPE > 0 && portfolioMetrics.avgPE < 15 ? 'text-emerald-600' : portfolioMetrics.avgPE > 25 ? 'text-rose-600' : 'text-slate-500'}`}>
            {portfolioMetrics.avgPE > 0 ? (portfolioMetrics.avgPE < 15 ? 'Undervalued' : portfolioMetrics.avgPE > 25 ? 'Overvalued' : 'Fair') : 'N/A'}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={14} className="text-purple-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Avg P/B</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {portfolioMetrics.avgPB > 0 ? portfolioMetrics.avgPB.toFixed(1) : '--'}
          </div>
          <div className={`text-[9px] font-bold ${portfolioMetrics.avgPB > 0 && portfolioMetrics.avgPB < 1 ? 'text-emerald-600' : portfolioMetrics.avgPB > 3 ? 'text-rose-600' : 'text-slate-500'}`}>
            {portfolioMetrics.avgPB > 0 ? (portfolioMetrics.avgPB < 1 ? 'Undervalued' : portfolioMetrics.avgPB > 3 ? 'Overvalued' : 'Fair') : 'N/A'}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Avg Yield</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {portfolioMetrics.avgYield > 0 ? `${portfolioMetrics.avgYield.toFixed(1)}%` : '--'}
          </div>
          <div className={`text-[9px] font-bold ${portfolioMetrics.avgYield > 3 ? 'text-emerald-600' : portfolioMetrics.avgYield > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {portfolioMetrics.avgYield > 3 ? 'High Yield' : portfolioMetrics.avgYield > 0 ? 'Standard' : 'N/A'}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={14} className="text-cyan-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Volatility</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {volatility > 0 ? `${volatility.toFixed(0)}%` : '--'}
          </div>
          <div className={`text-[9px] font-bold ${volLevel.color}`}>
            {volLevel.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={14} className="text-rose-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Avg ROE</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {portfolioMetrics.avgROE > 0 ? `${portfolioMetrics.avgROE.toFixed(1)}%` : '--'}
          </div>
          <div className={`text-[9px] font-bold ${portfolioMetrics.avgROE > 15 ? 'text-emerald-600' : portfolioMetrics.avgROE > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {portfolioMetrics.avgROE > 15 ? 'Strong' : portfolioMetrics.avgROE > 0 ? 'Weak' : 'N/A'}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <PieChart size={14} className="text-indigo-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Sectors</span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {sectorData.length}
          </div>
          <div className="text-[9px] font-bold text-slate-500">
            {sectorData.length >= 5 ? 'Diversified' : sectorData.length >= 3 ? 'Moderate' : 'Concentrated'}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-orange-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Top Sector</span>
          </div>
          <div className="text-lg font-black text-slate-800 truncate">
            {topSectorName}
          </div>
          <div className="text-[9px] font-bold text-emerald-600">
            {topSectorPercent}% weight
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={14} className="text-teal-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Market Cap</span>
          </div>
          <div className="text-lg font-black text-slate-800 truncate">
            {marketCapCategory.label}
          </div>
          <div className={`text-[9px] font-bold ${marketCapCategory.color}`}>
            Avg Cap
          </div>
        </div>
      </div>
    </div>
  );
};