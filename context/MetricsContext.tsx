import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { createDefaultTradingMetrics, createDefaultRiskMetrics, createDefaultPortfolioMetrics, TradingMetrics, RiskMetrics, PortfolioMetrics, StockMetrics } from '../types/metrics';

interface MetricsContextType {
  // Ticker navigation
  selectedTicker: string | null;
  setSelectedTicker: (ticker: string | null) => void;
  
  // Portfolio metrics
  portfolioMetrics: PortfolioMetrics;
  setPortfolioMetrics: (metrics: PortfolioMetrics) => void;
  
  // Trading metrics (from Money Mgmt)
  tradingMetrics: TradingMetrics;
  setTradingMetrics: (metrics: TradingMetrics) => void;
  
  // Risk metrics (from Money Mgmt + Risk Dashboard)
  riskMetrics: RiskMetrics;
  setRiskMetrics: (metrics: RiskMetrics) => void;
  
  // Market data cache (from tvscreener)
  marketData: Map<string, StockMetrics>;
  isLoadingMarketData: boolean;
  updateMarketData: (tickers: string[]) => Promise<void>;
  
  // Active tab tracking (for subtab sync)
  activeMainTab: string;
  activeSubTab: string;
  setActiveMainTab: (tab: string) => void;
  setActiveSubTab: (tab: string) => void;
  
  // Navigation helper - navigate to Analysis tab with specific ticker
  navigateToAnalysis: (ticker: string) => void;
  
  // Get stock metrics for a specific ticker
  getStockMetrics: (ticker: string) => StockMetrics | undefined;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

interface MetricsProviderProps {
  children: ReactNode;
  onNavigateToTab?: (tab: string) => void;
}

export const MetricsProvider: React.FC<MetricsProviderProps> = ({ children, onNavigateToTab }) => {
  // Ticker selection
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  
  // Portfolio metrics
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics>(createDefaultPortfolioMetrics());
  
  // Trading metrics
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics>(createDefaultTradingMetrics());
  
  // Risk metrics
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>(createDefaultRiskMetrics());
  
  // Market data cache
  const [marketData, setMarketData] = useState<Map<string, StockMetrics>>(new Map());
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  
  // Tab tracking
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('fundamentals');
  
  // Update market data for given tickers
  const updateMarketData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    
    setIsLoadingMarketData(true);
    try {
      const stocks = await MarketDataService.getAllStocks({ limit: tickers.length });
      const newMarketData = new Map<string, StockMetrics>();
      
      stocks.forEach(stock => {
        newMarketData.set(stock.ticker, {
          ticker: stock.ticker,
          name: stock.name,
          sector: stock.sector,
          price: stock.price,
          changePercent: stock.change_percent,
          qualityScore: stock.quality_score || 0,
          qualityGrade: (stock.quality_grade as 'A' | 'B' | 'C' | 'D' | 'F') || 'F',
          peRatio: stock.pe_ratio,
          pbRatio: stock.pb_ratio,
          dividendYield: stock.dividend_yield,
          roe: stock.roe,
          roa: stock.roa,
          grossMargin: stock.gross_margin,
          netMargin: stock.net_margin,
          rsi14: stock.rsi_14,
          sma50: stock.sma_50,
          sma200: stock.sma_200,
          techRating: stock.tech_rating,
          lastUpdated: stock.last_updated,
          signal: calculateSignal(stock),
        });
      });
      
      setMarketData(newMarketData);
    } catch (error) {
      console.error('Failed to update market data:', error);
    } finally {
      setIsLoadingMarketData(false);
    }
  }, []);
  
  // Navigate to Analysis tab with ticker
  const navigateToAnalysis = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    setActiveMainTab('analysis');
    setActiveSubTab('fundamentals');
    onNavigateToTab?.('analysis');
  }, [onNavigateToTab]);
  
  // Get stock metrics for a ticker
  const getStockMetrics = useCallback((ticker: string): StockMetrics | undefined => {
    return marketData.get(ticker.toUpperCase());
  }, [marketData]);
  
  const value: MetricsContextType = {
    selectedTicker,
    setSelectedTicker,
    portfolioMetrics,
    setPortfolioMetrics,
    tradingMetrics,
    setTradingMetrics,
    riskMetrics,
    setRiskMetrics,
    marketData,
    isLoadingMarketData,
    updateMarketData,
    activeMainTab,
    activeSubTab,
    setActiveMainTab,
    setActiveSubTab,
    navigateToAnalysis,
    getStockMetrics,
  };
  
  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
};

export const useMetrics = (): MetricsContextType => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

// Helper function to calculate valuation signal
function calculateSignal(stock: MarketStock): 'undervalued' | 'fair' | 'overvalued' {
  const pe = stock.pe_ratio;
  const quality = stock.quality_score;
  
  if (!pe || !quality) return 'fair';
  
  if (pe < 10 && quality >= 70) return 'undervalued';
  if (pe > 25 || quality < 40) return 'overvalued';
  return 'fair';
}

export default MetricsContext;
