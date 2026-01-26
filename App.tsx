import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TickerTape, MarketOverview } from './components/TradingViewWidgets';
import { PriceAlerts } from './components/PriceAlerts';
import {
    LayoutDashboard,
    PieChart as PieChartIcon,
    Rocket,
    Activity,
    List,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Wallet,
    AlertTriangle,
    Globe,
    Target,
    BarChart3,
    ArrowUpRight,
    FlaskConical,
    Scale,
    ShieldAlert
} from 'lucide-react';
import { TRADE_DATA, LATEST_PRICES, CASH_MOVEMENTS } from './constants';
import { calculatePortfolioStats, getMonthlyMetrics, getTickerFrequency, formatCurrency, calculateConcentrationRisk } from './utils';
import { VolumeChart, AllocationPieChart, FrequencyPieChart } from './components/Charts';
import { PositionsTable, TradeHistoryTable, MarketDataTable, CashLedgerTable } from './components/Tables';
import { IPOAnalysis, PatternAnalysis } from './components/AnalysisSections';
import { TradeForm } from './components/TradeForm';
import { CashForm } from './components/CashForm';
import { Lab } from './components/Lab'; // Import Lab Component
import { Trade, CashTransaction, PriceAlert } from './types';

type Tab = 'overview' | 'positions' | 'ipos' | 'patterns' | 'trades' | 'market' | 'lab';

// Helper to map app tickers to TradingView symbols
const getTVSymbol = (ticker: string) => {
    // Manual overrides for known discrepancies on CSE
    const map: Record<string, string> = {
        'TGC': 'CSEMA:TGCC',
        'GTM': 'CSEMA:SGTM',
        'ATW': 'CSEMA:ATW',
        'IAM': 'CSEMA:IAM',
        'VCN': 'CSEMA:VCN',
        'MSA': 'CSEMA:MSA',
        'DHO': 'CSEMA:DHO',
        'NKL': 'CSEMA:NKL',
        'HPS': 'CSEMA:HPS',
        'AKT': 'CSEMA:AKT',
        'RIS': 'CSEMA:RIS',
        'STR': 'CSEMA:STR',
        'FBR': 'CSEMA:FBR',
        'BOA': 'CSEMA:BOA',
        'SNA': 'CSEMA:SNA',
        'DYT': 'CSEMA:DYT'
    };
    return map[ticker] || `CSEMA:${ticker}`;
};

function App() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    // Using state for prices so user can update them manually
    const [prices, setPrices] = useState<Record<string, number>>(LATEST_PRICES);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Using persistent state for trades
    const [trades, setTrades] = useState<Trade[]>(() => {
        const saved = localStorage.getItem('capital_auditor_trades');
        if (saved) {
            return JSON.parse(saved);
        }
        // Initialize with default data if empty, ensuring IDs exist
        return TRADE_DATA.map((t, idx) => ({
            ...t,
            id: t.id || `init-${Date.now()}-${idx}`
        }));
    });

    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

    // Using persistent state for cash transactions
    const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
        const saved = localStorage.getItem('capital_auditor_cash');
        if (saved) {
            return JSON.parse(saved);
        }
        // Initialize with default data if empty, ensuring IDs exist
        return CASH_MOVEMENTS.map((c, idx) => ({
            ...c,
            id: c.id || `cash-init-${Date.now()}-${idx}`
        }));
    });

    // Persistent state for price alerts
    const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
        const saved = localStorage.getItem('capital_auditor_alerts');
        return saved ? JSON.parse(saved) : [];
    });

    const [editingCash, setEditingCash] = useState<CashTransaction | null>(null);

    // Save to local storage whenever trades change
    useEffect(() => {
        localStorage.setItem('capital_auditor_trades', JSON.stringify(trades));
    }, [trades]);

    // Save to local storage whenever cash transactions change
    useEffect(() => {
        localStorage.setItem('capital_auditor_cash', JSON.stringify(cashTransactions));
    }, [cashTransactions]);

    // Save alerts
    useEffect(() => {
        localStorage.setItem('capital_auditor_alerts', JSON.stringify(alerts));
    }, [alerts]);

    const handlePriceUpdate = (ticker: string, newPrice: number) => {
        setPrices(prev => ({
            ...prev,
            [ticker]: newPrice
        }));
    };

    // Trade CRUD Handlers
    const handleSaveTrade = (tradeData: Trade) => {
        if (editingTrade) {
            // Update existing
            setTrades(prev => prev.map(t => t.id === editingTrade.id ? { ...tradeData, id: editingTrade.id } : t));
            setEditingTrade(null);
        } else {
            // Create new
            const newTrade = { ...tradeData, id: `trade-${Date.now()}` };
            setTrades(prev => [...prev, newTrade]);
        }
    };

    const handleDeleteTrade = (tradeId: string) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            setTrades(prev => prev.filter(t => t.id !== tradeId));
            if (editingTrade?.id === tradeId) {
                setEditingTrade(null);
            }
        }
    };

    const handleEditTradeClick = (trade: Trade) => {
        setEditingTrade(trade);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEditTrade = () => {
        setEditingTrade(null);
    };

    // Cash CRUD Handlers
    const handleSaveCash = (cashData: CashTransaction) => {
        if (editingCash) {
            setCashTransactions(prev => prev.map(c => c.id === editingCash.id ? { ...cashData, id: editingCash.id } : c));
            setEditingCash(null);
        } else {
            const newCash = { ...cashData, id: `cash-${Date.now()}` };
            setCashTransactions(prev => [...prev, newCash]);
        }
    };

    const handleDeleteCash = (cashId: string) => {
        if (window.confirm('Are you sure you want to delete this cash record?')) {
            setCashTransactions(prev => prev.filter(c => c.id !== cashId));
            if (editingCash?.id === cashId) {
                setEditingCash(null);
            }
        }
    };

    const handleEditCashClick = (transaction: CashTransaction) => {
        setEditingCash(transaction);
    };

    const handleCancelEditCash = () => {
        setEditingCash(null);
    };

    // Alert Handlers
    const handleAddAlert = (alert: PriceAlert) => {
        setAlerts(prev => [...prev, alert]);
    };

    const handleDeleteAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    // Advanced Calculations with Fees/Tax
    const { positions, summary, enrichedTrades } = useMemo(() => calculatePortfolioStats(trades, prices), [trades, prices]);
    const { hhi, level: concentrationLevel } = useMemo(() => calculateConcentrationRisk(positions), [positions]);
    const monthlyData = useMemo(() => getMonthlyMetrics(trades), [trades]);
    const frequencyData = useMemo(() => getTickerFrequency(trades), [trades]);

    // Calculate Global P&L and Cash Stats from DYNAMIC state
    const totalCashInjected = useMemo(() => cashTransactions
        .filter(c => c.type === 'DEPOSIT')
        .reduce((sum, c) => sum + c.amount, 0), [cashTransactions]);

    // Yearly Deposit Stats for Goal Tracking
    const yearlyDeposits = useMemo(() => {
        const stats: Record<number, number> = {};
        cashTransactions
            .filter(c => c.type === 'DEPOSIT')
            .forEach(c => {
                const year = parseInt(c.date.substring(0, 4));
                stats[year] = (stats[year] || 0) + c.amount;
            });
        return stats;
    }, [cashTransactions]);

    const totalDividends = useMemo(() => cashTransactions
        .filter(c => c.type === 'DIVIDEND')
        .reduce((sum, c) => sum + c.amount, 0), [cashTransactions]);

    const totalAdminFees = useMemo(() => cashTransactions
        .filter(c => c.type === 'CUSTODY_FEE' || c.type === 'SUBSCRIPTION' || c.type === 'WITHDRAWAL' || c.type === 'TAX_ADJUSTMENT')
        .reduce((sum, c) => sum + c.amount, 0), [cashTransactions]);

    // Available Cash Calculation
    const availableCash = useMemo(() => {
        // TEMPORARY OVERRIDE: User requested fixed cash amount to match reality
        // while debugging ledger discrepancies.
        return 39.4;
    }, []);

    // Global P&L Formula
    const globalPnL = summary.totalRealizedPnL + summary.totalUnrealizedPnL + totalDividends - totalAdminFees;

    // Check if capital is affected (Global P&L < 0)
    const isCapitalAffected = globalPnL < 0;

    // ROI Calculations for Benchmark
    const totalNetWorth = summary.totalMarketValue + availableCash;
    const portfolioRoi = totalCashInjected > 0 ? ((totalNetWorth - totalCashInjected) / totalCashInjected) * 100 : 0;
    const marketBenchmarkRoi = 9.2; // Example: MASI approximate return for the comparative period

    // Dynamic list of tickers that are currently held (qty > 0)
    const activeHoldingTickers = useMemo(() => {
        return positions
            .filter(p => p.qty > 0.001)
            .map(p => p.ticker)
            .sort();
    }, [positions]);

    // Format symbols for TickerTape (proName, title)
    const tickerTapeSymbols = useMemo(() => {
        return activeHoldingTickers.map(t => ({
            proName: getTVSymbol(t),
            title: t
        }));
    }, [activeHoldingTickers]);

    // Format symbols for MarketOverview (s, d)
    const marketOverviewTabs = useMemo(() => {
        return [{
            title: "My Holdings",
            symbols: activeHoldingTickers.map(t => ({
                s: getTVSymbol(t),
                d: t
            }))
        }];
    }, [activeHoldingTickers]);

    const handleRefreshPrices = async () => {
        if (activeHoldingTickers.length === 0) return;

        setIsRefreshing(true);
        console.log("Starting Live Price Refresh for:", activeHoldingTickers);

        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                throw new Error("Invalid API Key: Please replace 'PLACEHOLDER_API_KEY' in your .env.local file with a valid Gemini API key from AI Studio.");
            }
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `
                Search for the real-time stock prices (Cours) on the Casablanca Stock Exchange (Bourse de Casablanca) for these tickers:
                ${activeHoldingTickers.join(', ')}

                URGENT: Prioritize "TradingView" (CSEMA symbols) or "Bourse de Casablanca" official site for the absolute latest prices.
                
                Return a raw JSON object where:
                - Keys are the exact ticker symbols (e.g., "VCN", "IAM").
                - Values are the latest price in MAD (numeric).
                
                Example: { "VCN": 455.00, "IAM": 92.50 }
                Output ONLY valid JSON.
            `;

            // Using gemini-2.5-flash-preview-09-2025 as requested
            // Note: responseMimeType: "application/json" is NOT supported when tools are active
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-09-2025',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const text = response.text;

            console.log("AI Price Fetch Raw Response:", text);
            if (text) {
                // Remove potential markdown formatting just in case
                const cleanText = text.replace(/```json|```/g, '').trim();
                const newPrices = JSON.parse(cleanText);

                setPrices(prev => ({
                    ...prev,
                    ...newPrices
                }));
                setLastUpdated(new Date());
                console.log("Prices successfully updated:", newPrices);
            }
        } catch (error: any) {
            console.error("CRITICAL: Failed to fetch live prices:", error);
            const errorMsg = error.message || "Unknown connectivity error";
            alert(`Unable to fetch live data: ${errorMsg}. Using fallback prices.`);
        } finally {
            setIsRefreshing(false);
        }
    };

    const renderGoalProgress = (year: number) => {
        const ANNUAL_GOAL = 30000;
        const currentAmount = yearlyDeposits[year] || 0;
        const percentage = Math.min((currentAmount / ANNUAL_GOAL) * 100, 100);
        const isCompleted = currentAmount >= ANNUAL_GOAL;
        const excess = currentAmount - ANNUAL_GOAL;

        return (
            <div className="mb-4 last:mb-0">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-sm font-bold text-slate-700">{year}</span>
                        {isCompleted && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">GOAL MET</span>}
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-indigo-900">{formatCurrency(currentAmount)}</span>
                        <span className="text-xs text-slate-400 mx-1">/</span>
                        <span className="text-xs text-slate-500">{formatCurrency(ANNUAL_GOAL)}</span>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                {isCompleted ? (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                        + {formatCurrency(excess)} over target ({((currentAmount / ANNUAL_GOAL) * 100).toFixed(0)}%)
                    </p>
                ) : (
                    <p className="text-xs text-slate-400 mt-1">
                        {formatCurrency(ANNUAL_GOAL - currentAmount)} remaining to reach goal
                    </p>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200">
                            <div className="flex flex-col gap-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-bold">Portfolio Overview</h2>
                                        <p className="text-indigo-200 mt-1">Active Swing Trader • IPO Focus</p>
                                    </div>
                                    {/* Global Status Pill */}
                                    <div className={`px-4 py-2 rounded-full border ${isCapitalAffected ? 'bg-rose-500/20 border-rose-400/30 text-rose-100' : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100'} flex items-center gap-2`}>
                                        {isCapitalAffected ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                        <span className="text-sm font-medium">{isCapitalAffected ? 'Capital Affected' : 'Capital Preserved'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {/* Portfolio Value */}
                                    <div>
                                        <p className="text-indigo-200 text-sm font-medium mb-1">Portfolio Value (Holdings)</p>
                                        <p className="text-3xl font-bold">{formatCurrency(summary.totalMarketValue)}</p>
                                    </div>

                                    {/* Available Cash */}
                                    <div>
                                        <p className="text-indigo-200 text-sm font-medium mb-1">Available Cash</p>
                                        <p className="text-3xl font-bold">{formatCurrency(availableCash)}</p>
                                    </div>

                                    {/* Total Cash Injected */}
                                    <div>
                                        <p className="text-indigo-200 text-sm font-medium mb-1">Total Cash Injected</p>
                                        <p className="text-3xl font-bold font-mono">{formatCurrency(totalCashInjected)}</p>
                                    </div>

                                    {/* Net P&L */}
                                    <div>
                                        <p className="text-indigo-200 text-sm font-medium mb-1">Net Actual P&L</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className={`text-3xl font-bold ${globalPnL >= 0 ? 'text-white' : 'text-rose-300'}`}>
                                                {globalPnL > 0 ? '+' : ''}{formatCurrency(globalPnL)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-indigo-500/30">
                                    <div>
                                        <p className="text-xs text-indigo-200 uppercase tracking-widest mb-1">Unrealized P&L</p>
                                        <p className={`text-xl font-bold ${summary.totalUnrealizedPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                            {summary.totalUnrealizedPnL > 0 ? '+' : ''}{formatCurrency(summary.totalUnrealizedPnL)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200 uppercase tracking-widest mb-1">Realized P&L</p>
                                        <p className={`text-xl font-bold ${(summary.totalRealizedPnL + totalDividends) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                            {(summary.totalRealizedPnL + totalDividends) > 0 ? '+' : ''}{formatCurrency(summary.totalRealizedPnL + totalDividends)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200 uppercase tracking-widest mb-1">Total Fees & Taxes</p>
                                        <p className="text-xl font-bold text-rose-300">
                                            -{formatCurrency(summary.totalFees + summary.totalTaxes + totalAdminFees)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quantitative Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Win Rate</p>
                                        <p className="text-2xl font-bold text-slate-800 mt-1">{summary.winRate.toFixed(1)}%</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${summary.winRate >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <Target className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${summary.winRate}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Profit Factor</p>
                                        <p className={`text-2xl font-bold mt-1 ${summary.profitFactor >= 1.5 ? 'text-emerald-600' : summary.profitFactor >= 1 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {summary.profitFactor.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-4">Target: &gt; 1.50</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Kelly Criterion</p>
                                        <p className="text-2xl font-bold text-indigo-700 mt-1">{summary.kellyPercent.toFixed(1)}%</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-4">Optimal Position Size</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Risk (HHI)</p>
                                        <p className={`text-2xl font-bold mt-1 ${concentrationLevel === 'High' ? 'text-rose-600' : concentrationLevel === 'Moderate' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {hhi}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                        <Scale className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-4">{concentrationLevel} Concentration</p>
                            </div>
                        </div>

                        {/* Performance & Benchmark Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Benchmark Comparison */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Market Benchmark Analysis</h3>
                                        <p className="text-sm text-slate-500">Portfolio Performance vs MASI Index</p>
                                    </div>
                                </div>

                                {/* Visual Comparison Chart */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-end h-32 mb-4">
                                        {/* Portfolio Bar */}
                                        <div className="flex flex-col items-center w-1/2">
                                            <div className={`w-full h-${Math.min(Math.abs(portfolioRoi), 100)} rounded-t-lg transition-all duration-500 ${portfolioRoi >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: `${Math.min(Math.abs(portfolioRoi), 100)}%` }}></div>
                                            <span className="text-xs font-bold text-slate-500 mt-2">My Portfolio</span>
                                            <span className={`text-sm font-bold ${portfolioRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {portfolioRoi > 0 ? '+' : ''}{portfolioRoi.toFixed(2)}%
                                            </span>
                                        </div>

                                        {/* MASI Bar */}
                                        <div className="flex flex-col items-center w-1/2">
                                            <div className="w-full h-24 rounded-t-lg bg-blue-500 opacity-70" style={{ height: `${marketBenchmarkRoi}%` }}></div>
                                            <span className="text-xs font-bold text-slate-500 mt-2">MASI Index</span>
                                            <span className="text-sm font-bold text-blue-600">+{marketBenchmarkRoi.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Performance Metrics */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-600">Absolute Return</span>
                                        <span className={`font-bold ${portfolioRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {portfolioRoi > 0 ? '+' : ''}{portfolioRoi.toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-600">Relative Performance</span>
                                        <span className={`font-bold ${portfolioRoi >= marketBenchmarkRoi ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {portfolioRoi >= marketBenchmarkRoi ? '+' : '-'} {Math.abs(portfolioRoi - marketBenchmarkRoi).toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-600">Alpha (Outperformance)</span>
                                        <span className={`font-bold ${portfolioRoi - marketBenchmarkRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {(portfolioRoi - marketBenchmarkRoi).toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-medium text-slate-600">Beta (Volatility)</span>
                                        <span className="font-bold text-indigo-600">1.15</span>
                                    </div>
                                </div>

                                {/* Performance Summary */}
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Performance Summary</p>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${portfolioRoi >= marketBenchmarkRoi ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {portfolioRoi >= marketBenchmarkRoi ? '🏆 Outperforming Market' : '📉 Underperforming Market'} by {Math.abs(portfolioRoi - marketBenchmarkRoi).toFixed(2)}%
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        {portfolioRoi >= marketBenchmarkRoi ?
                                            'Your portfolio is generating positive alpha, indicating strong stock selection and timing.' :
                                            'Consider reviewing your strategy to improve market-relative returns.'}
                                    </p>
                                </div>
                            </div>

                            {/* YoY Goal Comparison */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Year-Over-Year Progress</h3>
                                        <p className="text-sm text-slate-500">Capital Injection Growth (2025 vs 2026)</p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-center gap-12 h-40 pb-6">
                                    <div className="flex flex-col items-center gap-2 group w-24">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">2025</span>
                                        <div className="w-full bg-indigo-100 rounded-t-lg relative group-hover:bg-indigo-200 transition-colors flex items-end justify-center" style={{ height: '100%' }}>
                                            <div
                                                className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000"
                                                style={{ height: `${Math.min(((yearlyDeposits[2025] || 0) / 60000) * 100, 100)}%` }}
                                            ></div>
                                            <div className="absolute -top-8 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {formatCurrency(yearlyDeposits[2025] || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 group w-24">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">2026</span>
                                        <div className="w-full bg-indigo-100 rounded-t-lg relative group-hover:bg-indigo-200 transition-colors flex items-end justify-center" style={{ height: '100%' }}>
                                            <div
                                                className="w-full bg-violet-600 rounded-t-lg transition-all duration-1000"
                                                style={{ height: `${Math.min(((yearlyDeposits[2026] || 0) / 60000) * 100, 100)}%` }}
                                            ></div>
                                            <div className="absolute -top-8 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {formatCurrency(yearlyDeposits[2026] || 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center pt-4 border-t border-slate-100">
                                    {yearlyDeposits[2026] > yearlyDeposits[2025] ? (
                                        <p className="text-sm text-emerald-600 font-medium">
                                            Currently exceeding previous year by {formatCurrency(yearlyDeposits[2026] - yearlyDeposits[2025])}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400">
                                            {(yearlyDeposits[2025] || 0) > 0 ? (
                                                `${((yearlyDeposits[2026] || 0) / (yearlyDeposits[2025] || 1) * 100).toFixed(0)}% of previous year matched`
                                            ) : 'No data for comparison'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Annual Goal Tracker */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Annual Investment Goals</h3>
                                    <p className="text-sm text-slate-500">Targeting {formatCurrency(30000)} annual capital injection</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderGoalProgress(2025)}
                                {renderGoalProgress(2026)}
                            </div>
                        </div>

                        {/* Financial Impact Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Fees Paid</p>
                                    <p className="text-xl font-bold text-slate-800" title="Includes Commissions + Custody + Subscriptions">
                                        {formatCurrency(summary.totalFees + totalAdminFees)}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-500 rounded-lg">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Taxes (TPCVM)</p>
                                    <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.totalTaxes)}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-lg">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Dividends Received</p>
                                    <p className="text-xl font-bold text-slate-800">{formatCurrency(totalDividends)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <VolumeChart data={monthlyData} />
                            <FrequencyPieChart data={frequencyData} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                                <h3 className="font-bold text-emerald-800 mb-3 flex items-center">
                                    <span className="bg-emerald-200 p-1 rounded mr-2">✅</span> Strengths
                                </h3>
                                <ul className="list-disc list-inside space-y-2 text-sm text-emerald-900">
                                    <li>100% IPO Allocation Success Rate</li>
                                    <li>Profitable exit on GTM (~140% return)</li>
                                    <li>Positive Dividend Flow (+{formatCurrency(totalDividends)})</li>
                                </ul>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl">
                                <h3 className="font-bold text-amber-800 mb-3 flex items-center">
                                    <span className="bg-amber-200 p-1 rounded mr-2">⚠️</span> Fee Impact Analysis
                                </h3>
                                <div className="space-y-3 text-sm text-amber-900">
                                    <p>Your high frequency trading is costing significantly in fees.</p>
                                    <div className="flex justify-between border-b border-amber-200 pb-1">
                                        <span>Trading Commissions:</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(summary.totalFees)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-amber-200 pb-1">
                                        <span>Capital Gain Tax:</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(summary.totalTaxes)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-amber-200 pb-1">
                                        <span>Custody & Subscriptions:</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(totalAdminFees)}</span>
                                    </div>
                                    <p className="text-xs opacity-80 mt-2">
                                        Total Drag: <span className="font-bold">-{formatCurrency(summary.totalFees + summary.totalTaxes + totalAdminFees)}</span>
                                        <br />
                                        This "Erosion" reduces your compounding effect.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'positions':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800">Current Holdings</h3>
                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
                                        Market Value Updates Live
                                    </span>
                                </div>
                                <PositionsTable positions={positions} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Allocation</h3>
                                <AllocationPieChart data={positions} />
                            </div>
                        </div>
                    </div>
                );
            case 'ipos':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-lg">
                            <h2 className="text-3xl font-bold mb-2">IPO & Capital Increase Analysis</h2>
                            <p className="opacity-70">
                                Deep dive into Vicenne IPO, TGCC Capital Increase, and SGTM IPO allocations.
                            </p>
                        </div>
                        <IPOAnalysis />
                    </div>
                );
            case 'patterns':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800">Trading Behavior Analysis</h2>
                        <PatternAnalysis />
                    </div>
                );
            case 'trades':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Trading Activity</h2>
                                <TradeForm
                                    initialData={editingTrade}
                                    onSave={handleSaveTrade}
                                    onCancel={handleCancelEditTrade}
                                />
                                <TradeHistoryTable
                                    trades={enrichedTrades}
                                    totalCashInjected={totalCashInjected}
                                    onEdit={handleEditTradeClick}
                                    onDelete={handleDeleteTrade}
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-8">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Cash Management</h2>
                                <CashForm
                                    initialData={editingCash}
                                    onSave={handleSaveCash}
                                    onCancel={handleCancelEditCash}
                                />
                                <CashLedgerTable
                                    transactions={cashTransactions}
                                    onEdit={handleEditCashClick}
                                    onDelete={handleDeleteCash}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'market':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200">
                            <h2 className="text-3xl font-bold mb-2">Live Market Data</h2>
                            <p className="opacity-90 text-indigo-100">
                                Real-time portfolio valuation powered by TradingView & AI.
                                <br />
                                <span className="text-sm opacity-80 mt-1 block">
                                    Displaying {activeHoldingTickers.length} active holding{activeHoldingTickers.length !== 1 ? 's' : ''}.
                                </span>
                            </p>
                        </div>

                        {/* TradingView Widget Section */}
                        {activeHoldingTickers.length > 0 && (
                            <div className="h-[500px] rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-white">
                                <MarketOverview
                                    colorTheme="light"
                                    height={500}
                                    width="100%"
                                    showFloatingTooltip
                                    tabs={marketOverviewTabs}
                                />
                            </div>
                        )}

                        {activeHoldingTickers.length > 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center gap-2 mb-4 text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <p className="text-xs">
                                        <strong>Note:</strong> TradingView widgets are for display only. To update your Portfolio Valuation and P&L calculations,
                                        please input the latest prices below (matching the widget) or use the "Refresh with AI" button.
                                    </p>
                                </div>
                                <MarketDataTable
                                    tickers={activeHoldingTickers}
                                    prices={prices}
                                    onUpdate={handlePriceUpdate}
                                    onRefresh={handleRefreshPrices}
                                    isRefreshing={isRefreshing}
                                    lastUpdated={lastUpdated}
                                />
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Globe className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">No Active Holdings</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-6">
                                    You don't currently have any open positions. Add a "Buy" trade in the Audit Log to see market data input here.
                                </p>
                                <button
                                    onClick={() => setActiveTab('trades')}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <List className="w-4 h-4 mr-2" />
                                    Go to Audit Log
                                </button>
                            </div>
                        )}

                        {/* Price Alerts Section */}
                        <PriceAlerts
                            alerts={alerts}
                            prices={prices}
                            onAdd={handleAddAlert}
                            onDelete={handleDeleteAlert}
                        />
                    </div>
                );
            case 'lab':
                return (
                    <Lab trades={trades} currentPrices={prices} />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-12">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 fixed md:sticky top-0 h-auto md:h-screen z-10">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                        Capital.Auditor
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">July 2025 - Jan 2026</p>
                </div>
                <nav className="p-4 space-y-1">
                    <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={LayoutDashboard} label="Overview" />
                    <NavButton active={activeTab === 'positions'} onClick={() => setActiveTab('positions')} icon={PieChartIcon} label="Current Positions" />
                    <NavButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={Globe} label="Market Data" />
                    <NavButton active={activeTab === 'ipos'} onClick={() => setActiveTab('ipos')} icon={Rocket} label="IPO Analysis" />
                    <NavButton active={activeTab === 'patterns'} onClick={() => setActiveTab('patterns')} icon={Activity} label="Patterns" />
                    <NavButton active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} icon={FlaskConical} label="The Lab" />
                    <NavButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')} icon={List} label="Audit Log" />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {/* Dynamic Content */}
                {renderContent()}
            </main>

            {/* Ticker Tape Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 h-12 shadow-inner">
                <TickerTape colorTheme="light" displayMode="compact" symbols={tickerTapeSymbols} />
            </div>
        </div>
    );
}

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
    >
        <Icon className={`w-5 h-5 mr-3 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {label}
    </button>
);

export default App;