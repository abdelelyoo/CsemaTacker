import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RefreshCcw, AlertTriangle, Info, CheckCircle2, XCircle, Clock, TrendingUp, Shield, Target, Zap, ChevronDown, ChevronUp, ListTodo, BarChart3, PieChart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { usePortfolioContext } from '../context/PortfolioContext';
import { useMetrics } from '../context/MetricsContext';
import { generateComprehensiveAnalysis } from '../services/glmService';
import { MarketDataService } from '../services/marketDataService';
import { StockMetrics } from '../types/metrics';
import { Transaction, BankOperation } from '../types';

interface ActionItem {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  deadline: string;
  rationale: string;
}

interface AnalysisResult {
  markdown: string;
  actionItems: ActionItem[];
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  compositionScore: number;
}

export const GLMInsights: React.FC = () => {
  const { portfolio, enrichedTransactions, bankOperations } = usePortfolioContext();
  const { riskMetrics, tradingMetrics } = useMetrics();
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisDate, setAnalysisDate] = useState<Date | null>(null);
  const [showActionItems, setShowActionItems] = useState(true);
  const [marketData, setMarketData] = useState<Map<string, StockMetrics>>(new Map());
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const tickers = portfolio.holdings.map(h => h.ticker);
        if (tickers.length === 0) return;
        
        const stocks = await MarketDataService.getAllStocks({ limit: 200 });
        const dataMap = new Map<string, StockMetrics>();
        
        stocks.forEach(stock => {
          dataMap.set(stock.ticker, {
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
            trend: calculateTrend(stock)
          });
        });
        
        setMarketData(dataMap);
      } catch (err) {
        console.error('Failed to load market data:', err);
      }
    };
    
    loadMarketData();
  }, [portfolio.holdings]);
  
  const monteCarloStats = useMemo(() => {
    if (!tradingMetrics || tradingMetrics.totalTrades < 5) return undefined;
    
    const capital = portfolio.totalValue + portfolio.cashBalance;
    const winRate = tradingMetrics.winRate / 100;
    const avgWin = tradingMetrics.avgWin;
    const avgLoss = tradingMetrics.avgLoss;
    
    const simulations: number[][] = [];
    const numSimulations = 1000;
    const numTrades = 50;
    
    for (let i = 0; i < numSimulations; i++) {
      const trajectory: number[] = [];
      let value = capital;
      
      for (let t = 0; t < numTrades; t++) {
        const isWin = Math.random() < winRate;
        const result = isWin ? avgWin : -avgLoss;
        value = Math.max(0, value + result);
        trajectory.push(value);
      }
      simulations.push(trajectory);
    }
    
    const lastValues = simulations.map(s => s[s.length - 1]);
    lastValues.sort((a, b) => a - b);
    
    const medianOutcome = lastValues[Math.floor(numSimulations * 0.5)];
    const worstCase = lastValues[Math.floor(numSimulations * 0.1)];
    const bestCase = lastValues[Math.floor(numSimulations * 0.9)];
    const riskOfRuin = (lastValues.filter(v => v <= capital * 0.5).length / numSimulations) * 100;
    
    return { riskOfRuin, medianOutcome, worstCase, bestCase };
  }, [tradingMetrics, portfolio.totalValue, portfolio.cashBalance]);
  
  const signalData = useMemo(() => {
    const stocks = Array.from(marketData.values());
    if (stocks.length === 0) return undefined;
    
    const bullish = stocks.filter(s => s.trend === 'bullish').length;
    const bearish = stocks.filter(s => s.trend === 'bearish').length;
    const neutral = stocks.filter(s => s.trend === 'neutral' || !s.trend).length;
    
    const topSignals = stocks
      .filter(s => s.signal && s.signal !== 'fair')
      .map(s => ({
        ticker: s.ticker,
        signal: s.signal || 'fair',
        strength: s.qualityScore || 50
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
    
    return { bullishCount: bullish, bearishCount: bearish, neutralCount: neutral, topSignals };
  }, [marketData]);
  
  const dividendData = useMemo(() => {
    const dividendOps = bankOperations.filter(op => op.Category === 'DIVIDEND');
    if (dividendOps.length === 0 && portfolio.totalDividends === 0) return undefined;
    
    const annualIncome = portfolio.totalDividends;
    const currentYield = portfolio.totalValue > 0 ? (annualIncome / portfolio.totalValue) * 100 : 0;
    
    const upcomingPayments = dividendOps
      .filter(op => new Date(op.parsedDate) > new Date())
      .slice(0, 5)
      .map(op => ({
        ticker: op.Description || 'Unknown',
        amount: op.Amount,
        date: op.Date
      }));
    
    return { annualIncome, currentYield, upcomingPayments };
  }, [bankOperations, portfolio.totalDividends, portfolio.totalValue]);
  
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateComprehensiveAnalysis({
        portfolio,
        transactions: enrichedTransactions,
        bankOperations,
        riskMetrics,
        tradingMetrics,
        marketData,
        monteCarloStats,
        dividendData,
        signalData
      });
      
      setAnalysis(result);
      setAnalysisDate(new Date());
    } catch (err) {
      console.error('Comprehensive Analysis error:', err);
      setError('Failed to generate comprehensive analysis. Please check your OpenCode API key and try again.');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [portfolio, enrichedTransactions, bankOperations, riskMetrics, tradingMetrics, marketData, monteCarloStats, dividendData, signalData]);
  
  useEffect(() => {
    if (!analysis && !loading && !error && portfolio.holdings.length > 0) {
      runAnalysis();
    }
  }, [analysis, loading, error, portfolio.holdings.length]);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-green-100 border-green-500 text-green-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <XCircle size={16} className="text-red-500" />;
      case 'high': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'medium': return <Clock size={16} className="text-yellow-500" />;
      case 'low': return <CheckCircle2 size={16} className="text-green-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };
  
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-emerald-500 bg-emerald-50';
      case 'B': return 'text-blue-500 bg-blue-50';
      case 'C': return 'text-yellow-500 bg-yellow-50';
      case 'D': return 'text-orange-500 bg-orange-50';
      case 'F': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 p-6 border-b border-slate-700">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg">
                <Brain className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Atlas AI Command Center</h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-slate-400 text-sm">Powered by GLM-5</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm flex items-center">
                    <Zap size={14} className="text-yellow-500 mr-1" />
                    Institutional-Grade Analysis
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {analysis && (
                <div className="flex items-center space-x-4 mr-4">
                  <div className={`px-4 py-2 rounded-lg ${getGradeColor(analysis.riskGrade)}`}>
                    <div className="text-xs uppercase tracking-wider opacity-70">Risk Grade</div>
                    <div className="text-2xl font-bold">{analysis.riskGrade}</div>
                  </div>
                  <div className="bg-slate-700/50 px-4 py-2 rounded-lg">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Composition</div>
                    <div className="text-lg font-bold text-white">{analysis.compositionScore}/100</div>
                  </div>
                </div>
              )}
              <div className="group relative">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm cursor-help">
                  <Info size={18} className="text-slate-300" />
                </div>
                <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <p className="font-medium mb-2">Comprehensive Analysis Features:</p>
                  <ul className="space-y-1 text-slate-300">
                    <li>• Portfolio health scorecard (A-F grades)</li>
                    <li>• Risk stress testing (VaR, HHI, drawdown)</li>
                    <li>• Behavioral bias detection</li>
                    <li>• Actionable to-do list</li>
                    <li>• Bank-level risk management</li>
                    <li>• Moroccan market context</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition-all shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Analyzing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
          
          {analysisDate && (
            <div className="mt-4 flex items-center space-x-4 text-sm">
              <span className="text-slate-400">
                Last updated: {analysisDate.toLocaleString('fr-MA', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short'
                })}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                {portfolio.holdings.length} holdings • {enrichedTransactions.length} transactions
              </span>
            </div>
          )}
        </div>
        
        {analysis && analysis.actionItems.length > 0 && (
          <div className="bg-slate-800/50 border-b border-slate-700">
            <button
              onClick={() => setShowActionItems(!showActionItems)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <ListTodo size={20} className="text-violet-400" />
                <span className="text-white font-medium">Priority Action Items</span>
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                  {analysis.actionItems.length} items
                </span>
              </div>
              {showActionItems ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
            
            <AnimatePresence>
              {showActionItems && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 space-y-2">
                    {analysis.actionItems.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${getPriorityColor(item.priority)}`}
                      >
                        {getPriorityIcon(item.priority)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.category}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="font-mono text-sm">{item.action}</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              {item.deadline}
                            </span>
                            <span>{item.rationale}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <Brain size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-300 text-lg font-medium">Analyzing portfolio...</p>
                <div className="flex items-center justify-center space-x-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center"><BarChart3 size={14} className="mr-1 text-violet-400" /> Risk metrics</span>
                  <span className="flex items-center"><PieChart size={14} className="mr-1 text-indigo-400" /> Concentration</span>
                  <span className="flex items-center"><Target size={14} className="mr-1 text-pink-400" /> Kelly criterion</span>
                </div>
                <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center"><Shield size={14} className="mr-1 text-emerald-400" /> VaR analysis</span>
                  <span className="flex items-center"><TrendingUp size={14} className="mr-1 text-yellow-400" /> Monte Carlo</span>
                  <span className="flex items-center"><Zap size={14} className="mr-1 text-orange-400" /> Behavioral audit</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertTriangle size={48} className="mb-4 text-red-400" />
              <p className="text-lg mb-2">{error}</p>
              <button
                onClick={runAnalysis}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : analysis ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{analysis.markdown}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Brain size={48} className="mb-4 opacity-50" />
              <p>No analysis available. Click refresh to generate.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
        <h3 className="font-semibold text-amber-800 mb-2 flex items-center">
          <AlertTriangle size={18} className="mr-2" />
          Important Disclaimer
        </h3>
        <p className="text-sm text-amber-700 leading-relaxed">
          This analysis is generated by Artificial Intelligence (GLM-5) based on portfolio data and general market principles.
          It is for <strong>educational purposes only</strong> and does not constitute personalized financial advice.
          Past performance does not guarantee future results. Stock market investments carry significant risks.
          Always consult with a certified financial advisor registered with AMMC before making investment decisions.
        </p>
      </div>
    </div>
  );
};

function calculateSignal(stock: { pe_ratio?: number; quality_score?: number }): 'undervalued' | 'fair' | 'overvalued' {
  const pe = stock.pe_ratio;
  const quality = stock.quality_score;
  
  if (!pe || !quality) return 'fair';
  
  if (pe < 10 && quality >= 70) return 'undervalued';
  if (pe > 25 || quality < 40) return 'overvalued';
  return 'fair';
}

function calculateTrend(stock: { rsi_14?: number; tech_rating?: string | number }): 'bullish' | 'bearish' | 'neutral' {
  const rsi = stock.rsi_14;
  const rating = typeof stock.tech_rating === 'string' ? parseInt(stock.tech_rating) : stock.tech_rating;
  
  if (!rsi && !rating) return 'neutral';
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (rsi) {
    if (rsi > 60) bullishSignals++;
    if (rsi < 40) bearishSignals++;
  }
  
  if (rating) {
    if (rating >= 7) bullishSignals++;
    if (rating <= 3) bearishSignals++;
  }
  
  if (bullishSignals > bearishSignals) return 'bullish';
  if (bearishSignals > bullishSignals) return 'bearish';
  return 'neutral';
}

export default GLMInsights;