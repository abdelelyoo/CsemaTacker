import React, { useState, useMemo, useEffect } from 'react';
import { TickerTape, MarketOverview, StockScreener } from './components/TradingViewWidgets';
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
    ShieldAlert,
    Loader2,
    FileText,
    Menu,
    X,
    RefreshCw
} from 'lucide-react';
import { TRADE_DATA, LATEST_PRICES, CASH_MOVEMENTS, ANALYST_TARGETS, TICKER_FUNDAMENTALS } from './constants';
import { calculatePortfolioStats, getMonthlyMetrics, getTickerFrequency, formatCurrency, calculateConcentrationRisk } from './utils';
import { VolumeChart, AllocationPieChart, FrequencyPieChart } from './components/Charts';
import { PositionsTable, TradeHistoryTable, MarketDataTable, CashLedgerTable } from './components/Tables';
import { IPOAnalysis, PatternAnalysis } from './components/AnalysisSections';
import { TradeForm } from './components/TradeForm';
import { CashForm } from './components/CashForm';
import { Lab } from './components/Lab'; // Import Lab Component
import { Trade, CashTransaction, PriceAlert, AnalystTarget, TickerFundamentals } from './types';

type Tab = 'overview' | 'market' | 'trades' | 'lab';

// Helper to map app tickers to TradingView symbols
const getTVSymbol = (ticker: string) => {
    // Manual overrides for known discrepancies on CSE
    const map: Record<string, string> = {
        'TGC': 'CSEMA:TGC',
        'GTM': 'CSEMA:GTM',
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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


    // Persistent state for Analyst Targets
    const [analystTargets, setAnalystTargets] = useState<AnalystTarget[]>(() => {
        const saved = localStorage.getItem('capital_auditor_targets');
        return saved ? JSON.parse(saved) : ANALYST_TARGETS;
    });

    useEffect(() => {
        localStorage.setItem('capital_auditor_targets', JSON.stringify(analystTargets));
    }, [analystTargets]);

    // Persistent state for Market Fundamentals (Synced from TradingView)
    const [fundamentals, setFundamentals] = useState<TickerFundamentals[]>(() => {
        const saved = localStorage.getItem('capital_auditor_fundamentals');
        const defaultFundamentals = saved ? JSON.parse(saved) : TICKER_FUNDAMENTALS;
        return defaultFundamentals;
    });

    useEffect(() => {
        localStorage.setItem('capital_auditor_fundamentals', JSON.stringify(fundamentals));
    }, [fundamentals]);


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

    const fundamentalsMap = useMemo(() => {
        const map: Record<string, TickerFundamentals> = {};
        fundamentals.forEach(f => map[f.ticker] = f);
        return map;
    }, [fundamentals]);

    const screenerInsights = useMemo(() => {
        if (activeHoldingTickers.length === 0) return null;

        const holdingFunds = activeHoldingTickers
            .map(t => fundamentalsMap[t])
            .filter(Boolean);

        const peValues = holdingFunds.map(f => f.peRatio).filter((v): v is number => v !== null && v > 0);
        const dyValues = holdingFunds.map(f => f.dividendYield).filter((v): v is number => v !== null);

        const avgPE = peValues.length > 0
            ? peValues.reduce((sum, v) => sum + v, 0) / peValues.length
            : 0;

        const avgDY = dyValues.length > 0
            ? dyValues.reduce((sum, v) => sum + v, 0) / dyValues.length
            : 0;

        return {
            avgPE,
            avgDY,
            holdingsCount: activeHoldingTickers.length,
            totalValue: summary.totalMarketValue
        };
    }, [activeHoldingTickers, fundamentalsMap, summary]);

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
        alert("To sync live prices and fundamentals, please run 'npm run sync' in your terminal and then refresh this page.");
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
                        {/* Current Holdings & Allocation Section (Ported from Positions Tab) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800">Current Holdings</h3>
                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
                                        Market Value Updates Live
                                    </span>
                                </div>
                                <PositionsTable positions={positions} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-800">Allocation</h3>
                                <AllocationPieChart data={positions} />
                            </div>
                        </div>

                        {/* Integrated Holdings Screener Header & Insights */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">Casablanca Stock Screener</h3>
                                        <p className="text-sm text-slate-500">Portfolio performance and fundamental metrics for held positions</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={handleRefreshPrices}
                                        disabled={isRefreshing}
                                        className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                                    >
                                        {isRefreshing ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                                        ) : (
                                            <><RefreshCw className="w-4 h-4 mr-2" /> Refresh Prices</>
                                        )}
                                    </button>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-slate-400">Prices in MAD</span>
                                        {lastUpdated && (
                                            <span className="text-xs text-emerald-600 font-medium animate-pulse">
                                                Updated: {lastUpdated.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {activeHoldingTickers.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4 text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <p className="text-xs">
                                            <strong>Note:</strong> TradingView widgets are for display only. To update your Portfolio Valuation and P&L calculations,
                                            please run <code className="bg-amber-100 px-1 rounded font-bold">npm run sync</code> in your terminal and then refresh this page.
                                        </p>
                                    </div>

                                    {/* Screener Insights Row */}
                                    {screenerInsights && (
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-8 border-b border-slate-100">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2 text-slate-500">
                                                    <Wallet className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Portfolio Value</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-800">
                                                    {formatCurrency(screenerInsights.totalValue)}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2 text-slate-500">
                                                    <Activity className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Avg Valuation</span>
                                                </div>
                                                <div className="text-xl font-bold text-indigo-600">
                                                    {screenerInsights.avgPE > 0 ? `${screenerInsights.avgPE.toFixed(2)}x P/E` : 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2 text-slate-500">
                                                    <TrendingUp className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Div Income Prof.</span>
                                                </div>
                                                <div className="text-xl font-bold text-emerald-600">
                                                    {screenerInsights.avgDY > 0 ? `${screenerInsights.avgDY.toFixed(2)}% Yield` : 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2 text-slate-500">
                                                    <Target className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Active Holdings</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-800">
                                                    {screenerInsights.holdingsCount} Positions
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-12 rounded-xl border border-dashed border-slate-200 text-center">
                                    <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-slate-600 mb-2">No Active Holdings</h4>
                                    <p className="text-slate-500 mb-6">Add a "Buy" trade in the Audit Log to see market data for your positions.</p>
                                    <button
                                        onClick={() => setActiveTab('trades')}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <List className="w-4 h-4 mr-2" />
                                        Go to Audit Log
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Market Discovery Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Market Discovery</h3>
                                    <p className="text-sm text-slate-500">Scan the full Casablanca Stock Exchange</p>
                                </div>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                <StockScreener height={550} market="morocco" />
                            </div>
                        </div>

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
        <div className="min-h-screen bg-slate-50 flex flex-col pb-14 md:pb-12">
            {/* Mobile Header with Hamburger */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                    Capital.Auditor
                </h1>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <div className="flex flex-1 pt-14 md:pt-0">
                {/* Sidebar Navigation */}
                <aside className={`
                    fixed md:sticky top-14 md:top-0 left-0 h-[calc(100vh-3.5rem)] md:h-screen w-72 md:w-64 
                    bg-white border-r border-slate-200 z-40
                    transform transition-transform duration-300 ease-in-out
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    overflow-y-auto
                `}>
                    <div className="hidden md:block p-6 border-b border-slate-100">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                            Capital.Auditor
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">July 2025 - Jan 2026</p>
                    </div>
                    <nav className="p-4 space-y-1">
                        <NavButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} icon={LayoutDashboard} label="Overview" />
                        <NavButton active={activeTab === 'market'} onClick={() => { setActiveTab('market'); setMobileMenuOpen(false); }} icon={Globe} label="Market Data" />
                        <NavButton active={activeTab === 'trades'} onClick={() => { setActiveTab('trades'); setMobileMenuOpen(false); }} icon={List} label="Audit Log" />
                        <NavButton active={activeTab === 'lab'} onClick={() => { setActiveTab('lab'); setMobileMenuOpen(false); }} icon={FlaskConical} label="The Lab" />
                    </nav>

                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    {/* Dynamic Content */}
                    {renderContent()}
                </main>
            </div>

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