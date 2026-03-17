import React, { useEffect, useState } from 'react';
import { RiskAnalysisService, ConcentrationMetrics, SectorExposure, OwnershipOverlap } from '../services/riskAnalysisService';
import { usePortfolioContext } from '../context/PortfolioContext';
import { useMetrics } from '../context/MetricsContext';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { AlertTriangle, PieChart as PieChartIcon, Users, TrendingDown, TrendingUp, Activity, Database } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, RISK_COLORS, getRiskColor } from '../constants/colors';
import { ProfileImportService } from '../services/profileImportService';

export const RiskDashboard: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const { selectedTicker } = useMetrics();
    const [concentration, setConcentration] = useState<ConcentrationMetrics | null>(null);
    const [sectorExposure, setSectorExposure] = useState<SectorExposure[]>([]);
    const [ownershipOverlap, setOwnershipOverlap] = useState<OwnershipOverlap[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Stock-specific risk from tvscreener
    const [stockRisks, setStockRisks] = useState<Map<string, MarketStock>>(new Map());
    const [loadingStocks, setLoadingStocks] = useState(false);

    // Ownership data status
    const [ownershipStatus, setOwnershipStatus] = useState<{ loaded: number } | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadOwnershipStatus();
    }, []);

    const loadOwnershipStatus = async () => {
        const status = await ProfileImportService.getImportStatus();
        setOwnershipStatus({ loaded: status.companiesLoaded });
    };

    const handleImportShareholders = async () => {
        setIsImporting(true);
        try {
            const files = await ProfileImportService.loadProfileFilesFromServer();
            if (files.length === 0) {
                alert('No profile files found');
            } else {
                await ProfileImportService.importAllProfiles(files);
                await loadOwnershipStatus();
                loadRiskAnalysis(); // Reload ownership overlap data
            }
        } catch (err) {
            console.error('Import failed:', err);
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        loadRiskAnalysis();
    }, [portfolio]);

    useEffect(() => {
        if (portfolio.holdings.length > 0) {
            loadStockRisks();
        }
    }, [portfolio.holdings]);

    const loadRiskAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const holdings = portfolio.holdings.map(h => ({
                ticker: h.ticker,
                value: h.marketValue,
                quantity: h.quantity,
                currentPrice: h.currentPrice
            }));

            const [conc, sectors, overlap, warns] = await Promise.all([
                RiskAnalysisService.getConcentrationMetrics(holdings.map(h => ({ ticker: h.ticker, value: h.value }))),
                RiskAnalysisService.getSectorExposure(holdings),
                RiskAnalysisService.getOwnershipOverlap(holdings.map(h => ({ ticker: h.ticker }))),
                RiskAnalysisService.getRiskWarnings(holdings)
            ]);

            setConcentration(conc);
            setSectorExposure(sectors);
            setOwnershipOverlap(overlap);
            setWarnings(warns);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze risk');
        } finally {
            setLoading(false);
        }
    };
    
    // Load stock-specific risk from tvscreener
    const loadStockRisks = async () => {
        if (portfolio.holdings.length === 0) return;
        
        setLoadingStocks(true);
        try {
            const tickers = portfolio.holdings.map(h => h.ticker);
            const stocks = await MarketDataService.getAllStocks({ limit: tickers.length });
            const newStockRisks = new Map<string, MarketStock>();
            stocks.forEach(stock => {
                newStockRisks.set(stock.ticker, stock);
            });
            setStockRisks(newStockRisks);
        } catch (err) {
            console.error('Failed to load stock risks:', err);
        } finally {
            setLoadingStocks(false);
        }
    };

    const getRiskLevelColor = (level?: string): string => {
        const color = getRiskColor(level);
        // Convert hex to tailwind class approximation
        if (color === RISK_COLORS.LOW) return 'text-emerald-600';
        if (color === RISK_COLORS.MODERATE) return 'text-amber-600';
        if (color === RISK_COLORS.HIGH) return 'text-orange-600';
        if (color === RISK_COLORS.EXTREME) return 'text-rose-600';
        return 'text-slate-600';
    };

    const getRiskLevelBgColor = (level?: string): string => {
        const color = getRiskColor(level);
        if (color === RISK_COLORS.LOW) return 'bg-emerald-50 border-emerald-200';
        if (color === RISK_COLORS.MODERATE) return 'bg-amber-50 border-amber-200';
        if (color === RISK_COLORS.HIGH) return 'bg-orange-50 border-orange-200';
        if (color === RISK_COLORS.EXTREME) return 'bg-rose-50 border-rose-200';
        return 'bg-slate-50 border-slate-200';
    };

    const SECTOR_COLORS = CHART_COLORS.SECTORS;

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (portfolio.holdings.length === 0) {
        return (
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center">
                <PieChartIcon size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700 mb-2">No Holdings</h3>
                <p className="text-sm text-slate-500">
                    Add holdings to your portfolio to analyze risk and diversification
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <TrendingDown size={28} />
                    <div>
                        <h2 className="text-2xl font-bold">Risk & Diversification Analysis</h2>
                        <p className="text-sm text-rose-100">Concentration, sector exposure, and ownership overlap</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Ownership Data Import */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Database size={18} className="text-blue-600" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm">
                            Ownership Data
                        </span>
                        <span className="text-xs text-slate-500">
                            {ownershipStatus?.loaded ? `${ownershipStatus.loaded} companies loaded` : 'No shareholder data loaded'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportShareholders}
                        disabled={isImporting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm"
                    >
                        {isImporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Importing...</span>
                            </>
                        ) : (
                            <>
                                <Database size={16} />
                                <span>{ownershipStatus?.loaded ? 'Re-import' : 'Import'} Shareholders</span>
                            </>
                        )}
                    </button>
                    {ownershipStatus?.loaded ? (
                        <button
                            onClick={async () => {
                                if (window.confirm('Clear all ownership data?')) {
                                    await ProfileImportService.clearProfileData();
                                    await loadOwnershipStatus();
                                }
                            }}
                            disabled={isImporting}
                            className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium border border-transparent hover:border-rose-100 flex items-center gap-2"
                        >
                            Clear Data
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Risk Warnings */}
            {warnings.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-1" />
                        <h3 className="text-lg font-bold text-rose-800">Risk Warnings</h3>
                    </div>
                    <ul className="space-y-2">
                        {warnings.map((warning, idx) => (
                            <li key={idx} className="text-rose-700 text-sm">
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Concentration Metrics */}
            {concentration && (
                <div className={`border rounded-xl p-6 ${getRiskLevelBgColor(concentration.riskLevel)}`}>
                    <h3 className="text-lg font-bold mb-4 text-slate-800">Concentration Metrics</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="mb-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-semibold text-slate-700">Risk Level</span>
                                    <span className={`font-bold uppercase text-sm ${getRiskLevelColor(concentration.riskLevel)}`}>
                                        {concentration.riskLevel}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600">
                                    HHI Index: {concentration.herfindahlIndex.toFixed(0)}
                                    {concentration.riskLevel === 'low' && ' (< 1500)'}
                                    {concentration.riskLevel === 'moderate' && ' (1500-2500)'}
                                    {concentration.riskLevel === 'high' && ' (2500-5000)'}
                                    {concentration.riskLevel === 'extreme' && ' (> 5000)'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm text-slate-700">Top Holding</span>
                                        <span className="font-bold text-slate-800">
                                            {concentration.topHoldingPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-rose-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(concentration.topHoldingPercent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm text-slate-700">Top 3</span>
                                        <span className="font-bold text-slate-800">
                                            {concentration.top3Percent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-orange-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(concentration.top3Percent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm text-slate-700">Top 5</span>
                                        <span className="font-bold text-slate-800">
                                            {concentration.top5Percent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-amber-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(concentration.top5Percent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="bg-white bg-opacity-50 rounded-lg p-4">
                                <p className="text-xs text-slate-600 mb-2">Diversification Score</p>
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-slate-800 mb-2">
                                        {concentration.effectiveDiversification.toFixed(1)}%
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${
                                                concentration.effectiveDiversification > 80
                                                    ? 'bg-emerald-500'
                                                    : concentration.effectiveDiversification > 60
                                                        ? 'bg-blue-500'
                                                        : concentration.effectiveDiversification > 40
                                                            ? 'bg-amber-500'
                                                            : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${concentration.effectiveDiversification}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2">
                                        Stocks: {concentration.stockCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock-Specific Risk (from tvscreener) */}
            {stockRisks.size > 0 && portfolio.holdings.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={20} className="text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-800">Stock-Specific Technical Risk</h3>
                        {loadingStocks && <span className="text-xs text-slate-400">(Loading...)</span>}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">Ticker</th>
                                    <th className="px-4 py-3 text-right">Weight</th>
                                    <th className="px-4 py-3 text-right">RSI (14)</th>
                                    <th className="px-4 py-3 text-right">P/E</th>
                                    <th className="px-4 py-3 text-right">Quality</th>
                                    <th className="px-4 py-3 text-center">Technical</th>
                                    <th className="px-4 py-3 text-right">1M Perf</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {portfolio.holdings.map(holding => {
                                    const stock = stockRisks.get(holding.ticker);
                                    if (!stock) return null;
                                    
                                    const rsi = stock.rsi_14;
                                    const getRSIColor = (rsi?: number) => {
                                        if (!rsi) return 'text-slate-400';
                                        if (rsi > 70) return 'text-rose-600'; // Overbought
                                        if (rsi < 30) return 'text-emerald-600'; // Oversold
                                        return 'text-slate-600';
                                    };
                                    
                                    const getTechTrend = (stock: MarketStock) => {
                                        const price = stock.price;
                                        const sma50 = stock.sma_50;
                                        const sma200 = stock.sma_200;
                                        
                                        if (!price || !sma50 || !sma200) return 'neutral';
                                        if (price > sma50 && sma50 > sma200) return 'bullish';
                                        if (price < sma50 && sma50 < sma200) return 'bearish';
                                        return 'neutral';
                                    };
                                    
                                    const trend = getTechTrend(stock);
                                    
                                    return (
                                        <tr key={holding.ticker} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-slate-800">{holding.ticker}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600">
                                                {holding.allocation.toFixed(1)}%
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${getRSIColor(rsi)}`}>
                                                {rsi ? rsi.toFixed(1) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600">
                                                {stock.pe_ratio ? stock.pe_ratio.toFixed(1) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                    stock.quality_grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                                    stock.quality_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                                    stock.quality_grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                                    stock.quality_grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {stock.quality_grade || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {trend === 'bullish' && <TrendingUp size={16} className="text-emerald-600 inline" />}
                                                {trend === 'bearish' && <TrendingDown size={16} className="text-rose-600 inline" />}
                                                {trend === 'neutral' && <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${
                                                (stock.perf_1m || 0) > 0 ? 'text-emerald-600' : 
                                                (stock.perf_1m || 0) < 0 ? 'text-rose-600' : 'text-slate-600'
                                            }`}>
                                                {stock.perf_1m ? `${stock.perf_1m > 0 ? '+' : ''}${stock.perf_1m.toFixed(1)}%` : 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sector Exposure */}
            {sectorExposure.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <PieChartIcon size={20} className="text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-800">Sector Exposure</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="flex justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={sectorExposure}
                                        dataKey="percentOfPortfolio"
                                        nameKey="sector"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ index, payload }: any) => {
                                            const data = sectorExposure[index];
                                            return data ? `${data.sector} ${data.percentOfPortfolio.toFixed(0)}%` : '';
                                        }}
                                    >
                                        {sectorExposure.map((_, idx) => (
                                            <Cell key={idx} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => value === undefined || value === null ? '' : `${Number(value).toFixed(1)}%`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-3">
                            {sectorExposure.map((sector, idx) => (
                                <div key={sector.sector} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                                            ></div>
                                            <span className="font-semibold text-slate-800">{sector.sector}</span>
                                        </div>
                                        <span className="font-bold text-slate-800">
                                            {sector.percentOfPortfolio.toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        {sector.holdingCount} companies � {sector.companies.join(', ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ownership Overlap */}
            {ownershipOverlap.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Users size={20} className="text-purple-600" />
                        <h3 className="text-lg font-bold text-slate-800">Ownership Overlap</h3>
                    </div>

                    <div className="space-y-3">
                        {ownershipOverlap.map((overlap, idx) => {
                            const overlapColors = {
                                low: 'border-blue-200 bg-blue-50',
                                medium: 'border-amber-200 bg-amber-50',
                                high: 'border-rose-200 bg-rose-50'
                            };

                            return (
                                <div
                                    key={idx}
                                    className={`border rounded-lg p-4 ${overlapColors[overlap.overlapLevel]}`}
                                >
                                    <div className="flex justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-slate-800">{overlap.majorShareholder}</p>
                                            <p className="text-xs text-slate-600">{overlap.percentage.toFixed(1)}% ownership</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${
                                            overlap.overlapLevel === 'high'
                                                ? 'bg-rose-100 text-rose-700'
                                                : overlap.overlapLevel === 'medium'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {overlap.overlapLevel} Risk
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 mb-1">
                                        Affects {overlap.affectedHoldings.length} holdings:
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {overlap.affectedHoldings.join(', ')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sectorExposure.length === 0 && ownershipOverlap.length === 0 && (
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center">
                    <p className="text-slate-500">
                        Unable to load risk analysis data. Please ensure all holdings have associated company profiles.
                    </p>
                </div>
            )}
        </div>
    );
};
