import React, { useEffect, useState } from 'react';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { useMetrics } from '../context/MetricsContext';
import { Award, CheckCircle2, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const QualityDashboard: React.FC = () => {
    const { selectedTicker, setSelectedTicker } = useMetrics();
    const [scores, setScores] = useState<MarketStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSector, setSelectedSector] = useState<string>('All');
    const [sectors, setSectors] = useState<string[]>(['All']);

    useEffect(() => {
        loadScores();
    }, []);

    const loadScores = async () => {
        setLoading(true);
        setError(null);
        try {
            const [allStocks, sectorList] = await Promise.all([
                MarketDataService.getAllStocks({ limit: 100 }),
                MarketDataService.getSectors()
            ]);

            setScores(allStocks);
            setSectors(['All', ...sectorList]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load quality data');
        } finally {
            setLoading(false);
        }
    };

    const filteredScores = selectedSector === 'All'
        ? scores
        : scores.filter(s => s.sector === selectedSector);

    const getGradeColor = (grade?: string): string => {
        switch (grade) {
            case 'A':
                return 'bg-emerald-100 text-emerald-800';
            case 'B':
                return 'bg-blue-100 text-blue-800';
            case 'C':
                return 'bg-amber-100 text-amber-800';
            case 'D':
                return 'bg-orange-100 text-orange-800';
            case 'F':
                return 'bg-rose-100 text-rose-800';
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const getScoreColor = (score?: number): string => {
        if (!score) return 'bg-slate-200';
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 60) return 'bg-blue-500';
        return 'bg-rose-500';
    };

    const getScoreTextColor = (score?: number): string => {
        if (!score) return 'text-slate-600';
        if (score >= 80) return 'text-emerald-600';
        if (score >= 60) return 'text-blue-600';
        return 'text-rose-600';
    };

    const getTrendIcon = (perf?: number) => {
        if (perf === undefined || perf === null) return <Minus size={14} className="text-slate-400" />;
        if (perf > 0) return <TrendingUp size={14} className="text-emerald-500" />;
        return <TrendingDown size={14} className="text-rose-500" />;
    };

    const getPerformanceTrend = (stock: MarketStock): 'improving' | 'declining' | 'stable' => {
        const perf = stock.perf_1m;
        if (perf === undefined || perf === null) return 'stable';
        if (perf > 5) return 'improving';
        if (perf < -5) return 'declining';
        return 'stable';
    };

    const formatScore = (score?: number): string => {
        if (score === undefined || score === null) return 'N/A';
        return score.toFixed(0);
    };

    const topQuality = [...filteredScores]
        .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
        .slice(0, 3);

    const highROE = filteredScores.filter(s => (s.roe ?? 0) > 15);
    const highMargin = filteredScores.filter(s => (s.net_margin ?? 0) > 10);

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <Award size={28} />
                    <div>
                        <h2 className="text-2xl font-bold">Quality Dashboard</h2>
                        <p className="text-sm text-purple-100">
                            {scores.length} CSEMA stocks • ROE, Margins, Profitability
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Sector Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Filter by Sector</label>
                <div className="flex flex-wrap gap-2">
                    {sectors.map(sector => (
                        <button
                            key={sector}
                            onClick={() => setSelectedSector(sector)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedSector === sector
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {sector}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Quality Stocks */}
            {topQuality.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 border-b border-emerald-200 p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-emerald-600" />
                            <h3 className="text-lg font-bold text-emerald-800">Top Quality Stocks</h3>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {topQuality.map(stock => {
                            const trend = getPerformanceTrend(stock);
                            return (
                                <div key={stock.ticker} className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-lg text-slate-800">{stock.ticker}</p>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full font-bold text-sm ${getGradeColor(stock.quality_grade)}`}
                                                >
                                                    Grade {stock.quality_grade ?? 'N/A'}
                                                </span>
                                                <span className="text-lg">
                                                    {trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600">{stock.name}</p>
                                        </div>
                                        <p className="text-3xl font-bold text-emerald-600">
                                            {formatScore(stock.quality_score)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div className="bg-white rounded p-2">
                                            <p className="text-xs text-slate-600">ROE</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {stock.roe?.toFixed(1) ?? 'N/A'}%
                                            </p>
                                        </div>
                                        <div className="bg-white rounded p-2">
                                            <p className="text-xs text-slate-600">Net Margin</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {stock.net_margin?.toFixed(1) ?? 'N/A'}%
                                            </p>
                                        </div>
                                        <div className="bg-white rounded p-2">
                                            <p className="text-xs text-slate-600">Gross Margin</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {stock.gross_margin?.toFixed(1) ?? 'N/A'}%
                                            </p>
                                        </div>
                                    </div>

                                    {stock.dividend_yield && stock.dividend_yield > 0 && (
                                        <div className="text-sm text-emerald-700">
                                            <span className="font-semibold">Dividend Yield:</span> {stock.dividend_yield.toFixed(2)}%
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-emerald-600" />
                        <h3 className="text-sm font-semibold text-slate-800">High ROE (&gt;15%)</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{highROE.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-800">High Margin (&gt;10%)</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{highMargin.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={18} className="text-purple-600" />
                        <h3 className="text-sm font-semibold text-slate-800">Grade A</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {filteredScores.filter(s => s.quality_grade === 'A').length}
                    </p>
                </div>
            </div>

            {/* Quality Score Grid */}
            <div>
                <div className="mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-slate-600" />
                    <h3 className="text-lg font-bold text-slate-800">
                        All Stocks ({filteredScores.length})
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScores.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            No quality data available for this sector
                        </div>
                    ) : (
                        filteredScores
                            .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
                            .map(stock => {
                                const trend = getPerformanceTrend(stock);
                                return (
                                    <div
                                        key={stock.ticker}
                                        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${selectedTicker === stock.ticker ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                                        onClick={() => setSelectedTicker(stock.ticker)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-bold text-slate-800">{stock.ticker}</p>
                                                <p className="text-xs text-slate-500">{stock.name}</p>
                                            </div>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full font-bold text-sm ${getGradeColor(stock.quality_grade)}`}
                                            >
                                                {stock.quality_grade ?? 'N/A'}
                                            </span>
                                        </div>

                                        {/* Overall Score */}
                                        <div className="mb-3 p-3 bg-slate-50 rounded">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-600">Quality Score</span>
                                                <span className={`text-lg font-bold ${getScoreTextColor(stock.quality_score)}`}>
                                                    {formatScore(stock.quality_score)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${getScoreColor(stock.quality_score)}`}
                                                    style={{ width: `${Math.min(stock.quality_score ?? 0, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Key Metrics */}
                                        <div className="space-y-2 mb-3 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">ROE</span>
                                                <span className="font-bold text-slate-800">
                                                    {stock.roe?.toFixed(1) ?? 'N/A'}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Net Margin</span>
                                                <span className="font-bold text-slate-800">
                                                    {stock.net_margin?.toFixed(1) ?? 'N/A'}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Gross Margin</span>
                                                <span className="font-bold text-slate-800">
                                                    {stock.gross_margin?.toFixed(1) ?? 'N/A'}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Trend */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                            {getTrendIcon(stock.perf_1m)}
                                            <span className="text-xs text-slate-600 capitalize">
                                                1M: {stock.perf_1m ? `${stock.perf_1m > 0 ? '+' : ''}${stock.perf_1m.toFixed(1)}%` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
};
