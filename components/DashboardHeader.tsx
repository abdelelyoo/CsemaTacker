import React from 'react';
import { Activity, Shield, Zap, Globe, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  onMarketDataOpen: () => void;
  isLoadingMarketData: boolean;
  headerMetrics: {
    health: string;
    healthColor: string;
    sentiment: string;
    sentimentPercent: number;
    riskLevel: string;
    buySignals: number;
    sellSignals: number;
    totalReturnPercent: number;
    volatility: number;
  };
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onMarketDataOpen,
  isLoadingMarketData,
  headerMetrics
}) => {
  return (
    <motion.div
      className="relative overflow-hidden bg-slate-900 rounded-2xl p-3 md:p-5"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" aria-hidden="true"></span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Atlas</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-slate-700"></div>
          <span className="hidden md:inline text-xs text-slate-500">
            {new Date().getHours() < 12 ? 'Morning' : 'Evening'} Session
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500" aria-label="Portfolio Return">Return</span>
            <span 
              className={`text-xs font-bold ${headerMetrics.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              aria-label={`${headerMetrics.totalReturnPercent.toFixed(1)}% return`}
            >
              {headerMetrics.totalReturnPercent >= 0 ? '+' : ''}{headerMetrics.totalReturnPercent.toFixed(1)}%
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <Activity 
              size={12} 
              className={headerMetrics.sentiment === 'BULLISH' ? 'text-emerald-400' : headerMetrics.sentiment === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'} 
              aria-label="Market sentiment indicator"
            />
            <span className="hidden sm:inline text-xs text-slate-500" aria-label="Market Sentiment">Sentiment</span>
            <span 
              className={`text-xs font-bold ${headerMetrics.sentiment === 'BULLISH' ? 'text-emerald-400' : headerMetrics.sentiment === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'}`}
              aria-label={headerMetrics.sentiment}
            >
              {headerMetrics.sentiment}
            </span>
            <span className="text-xs text-slate-600">{headerMetrics.sentimentPercent}%</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <Shield 
              size={12} 
              className={headerMetrics.riskLevel === 'Concentrated' ? 'text-rose-400' : headerMetrics.riskLevel === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'} 
              aria-label="Risk level indicator"
            />
            <span className="hidden sm:inline text-xs text-slate-500" aria-label="Risk Level">Risk</span>
            <span 
              className={`text-xs font-bold ${headerMetrics.riskLevel === 'Concentrated' ? 'text-rose-400' : headerMetrics.riskLevel === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'}`}
              aria-label={headerMetrics.riskLevel}
            >
              {headerMetrics.riskLevel}
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-700"></div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" aria-label="Trading signals" />
            <span className="text-xs text-slate-500" aria-label="Trading Signals">Signals</span>
            <span className="text-xs font-bold text-emerald-400" aria-label={`${headerMetrics.buySignals} buy signals`}>
              {headerMetrics.buySignals} buy
            </span>
            <span className="text-xs font-bold text-rose-400" aria-label={`${headerMetrics.sellSignals} sell signals`}>
              {headerMetrics.sellSignals} sell
            </span>
          </div>
        </div>

        <button
          onClick={onMarketDataOpen}
          disabled={isLoadingMarketData}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isLoadingMarketData ? "Loading market data..." : "Open market data modal"}
        >
          {isLoadingMarketData ? (
            <RefreshCw size={14} className="text-slate-400 animate-spin" />
          ) : (
            <Globe size={14} className="text-slate-400" />
          )}
          <span className="text-xs font-bold text-slate-300 hidden sm:inline">Market Data</span>
        </button>
      </div>
    </motion.div>
  );
};