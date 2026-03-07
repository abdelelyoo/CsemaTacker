import React, { useState, useEffect, useCallback } from 'react';
import { motion, Variants } from 'framer-motion';

import { usePortfolioContext } from '../context/PortfolioContext';
import { MarketData } from './MarketData';
import { DashboardHeader } from './DashboardHeader';
import { PerformanceChart } from './PerformanceChart';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { AllocationSunburst } from './AllocationSunburst';
import { PortfolioTreemap } from './PortfolioTreemap';
import { HoldingsTable } from './HoldingsTable';
import { MarketContext } from './MarketContext';

import { useHeaderMetrics } from '../hooks/useHeaderMetrics';
import { useTreemapData, useSectorData, useFilteredChartData } from '../hooks/useDashboardData';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { TreemapMetric, TimeRange } from '../types/dashboard';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export const Dashboard: React.FC = () => {
  const { portfolio } = usePortfolioContext();
  
  const [isMarketDataOpen, setIsMarketDataOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange['label']>('ALL');
  const [treemapMetric, setTreemapMetric] = useState<TreemapMetric>('roe');
  const [marketData, setMarketData] = useState<Map<string, MarketStock>>(new Map());
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);

  const headerMetrics = useHeaderMetrics(marketData);
  const treemapData = useTreemapData(marketData, treemapMetric);
  const sectorData = useSectorData();
  const filteredChartData = useFilteredChartData(timeRange);

  useEffect(() => {
    const loadMarketData = async () => {
      const tickers = portfolio.holdings.map(h => h.ticker);
      if (tickers.length === 0) {
        return;
      }
      setIsLoadingMarketData(true);
      try {
        const stocks = await MarketDataService.getAllStocks({ limit: 200 });
        const dataMap = new Map<string, MarketStock>();
        stocks.forEach(stock => dataMap.set(stock.ticker, stock));
        setMarketData(dataMap);
      } catch (err) {
        console.error('Failed to load market data:', err);
      } finally {
        setIsLoadingMarketData(false);
      }
    };
    loadMarketData();
  }, [portfolio.holdings]);

  const handleTimeRangeChange = useCallback((range: TimeRange['label']) => {
    setTimeRange(range);
  }, []);

  const handleTreemapMetricChange = useCallback((metric: string) => {
    setTreemapMetric(metric as TreemapMetric);
  }, []);

  return (
    <motion.div
      className="space-y-6 pb-20 md:pb-0 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="main"
      aria-label="Portfolio Dashboard"
    >
      {isMarketDataOpen && (
        <MarketData
          holdings={portfolio.holdings.map(h => h.ticker)}
          currentPrices={{}}
          onUpdatePrices={() => {}}
          onClose={() => setIsMarketDataOpen(false)}
        />
      )}

      <DashboardHeader
        onMarketDataOpen={() => setIsMarketDataOpen(true)}
        isLoadingMarketData={isLoadingMarketData}
        headerMetrics={headerMetrics}
      />

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[300px] lg:min-h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 lg:mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight">Performance History</h2>
              <p className="text-xs text-slate-500 hidden sm:block">Net Worth vs. Invested Capital</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-0">
              <div className="text-left px-2 lg:px-3 py-1 lg:py-1.5 bg-slate-50 rounded-lg border border-slate-200 mr-0 lg:mr-2">
                <p className="text-[9px] text-slate-400 uppercase hidden lg:block">Net Worth Breakdown</p>
                <p className="text-xs font-mono">
                  <span className="text-emerald-600 text-[10px] lg:text-xs">{portfolio.totalValue.toLocaleString()}</span>
                  <span className="text-slate-300 mx-0.5 lg:mx-1">+</span>
                  <span className="text-indigo-600 text-[10px] lg:text-xs">{portfolio.cashBalance.toLocaleString()}</span>
                  <span className="text-slate-300 mx-0.5 lg:mx-1 hidden sm:inline">=</span>
                  <span className="text-slate-800 font-bold text-[10px] lg:text-xs hidden sm:inline">{(portfolio.totalValue + portfolio.cashBalance).toLocaleString()}</span>
                </p>
              </div>
              <div 
                className="flex bg-slate-100 p-1 rounded-xl gap-1"
                role="group"
                aria-label="Time range selector"
              >
                {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleTimeRangeChange(r)}
                    className={`px-2 lg:px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      timeRange === r 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-pressed={timeRange === r}
                    aria-label={`Show ${r} performance`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PerformanceChart
            filteredChartData={filteredChartData}
            timeRange={timeRange}
            chartScale="linear"
            onTimeRangeChange={handleTimeRangeChange}
          />
        </div>

        <div className="lg:col-span-1">
          <PortfolioSummaryCard />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <AllocationSunburst />

        <PortfolioTreemap
          treemapData={treemapData}
          treemapMetric={treemapMetric}
          onMetricChange={handleTreemapMetricChange}
          marketData={marketData}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <MarketContext
            sectorData={sectorData}
            totalValue={portfolio.totalValue}
            volatility={headerMetrics.volatility}
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <HoldingsTable marketData={marketData} />
      </motion.div>
    </motion.div>
  );
};