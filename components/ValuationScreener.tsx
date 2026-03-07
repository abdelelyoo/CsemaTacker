import React, { useEffect, useState } from 'react';
import { MarketDataService, MarketStock, MarketFilters } from '../services/marketDataService';
import { useMetrics } from '../context/MetricsContext';
import { TrendingUp, Filter, RefreshCw } from 'lucide-react';

export const ValuationScreener: React.FC = () => {
    const { selectedTicker, setSelectedTicker } = useMetrics();
    const [results, setResults] = useState<MarketStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<MarketFilters>({
        sortBy: 'quality_score',
        sortOrder: 'desc'
    });

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await MarketDataService.getAllStocks(filters);
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load market data');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = async () => {
        await loadResults();
    };

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

    const calculateSignal = (stock: MarketStock): 'undervalued' | 'fair' | 'overvalued' => {
        if (!stock.pe_ratio || !stock.quality_score) return 'fair';
        
        if (stock.pe_ratio < 10 && stock.quality_score >= 70) return 'undervalued';
        if (stock.pe_ratio > 25 || stock.quality_score < 40) return 'overvalued';
        return 'fair';
    };

    const formatNumber = (num: number | undefined, decimals: number = 2): string => {
        if (num === undefined || num === null) return 'N/A';
        return num.toFixed(decimals);
    };

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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <TrendingUp size={28} />
                    <div>
                        <h2 className="text-2xl font-bold">Valuation Screener</h2>
                        <p className="text-sm text-blue-100">Find undervalued and overvalued CSEMA stocks</p>
                    </div>
                </div>
                <p className="text-sm text-blue-100 mt-2">
                    Screening {results.length} companies from Casablanca Stock Exchange (CSEMA)
                </p>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filter Panel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* P/E Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">P/E Min</label>
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.peMin ?? ''}
                            onChange={e => setFilters({ ...filters, peMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">P/E Max</label>
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.peMax ?? ''}
                            onChange={e => setFilters({ ...filters, peMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Dividend Yield Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Min Yield %</label>
                        <input
                            type="number"
                            placeholder="Min"
                            step="0.1"
                            value={filters.divYieldMin ?? ''}
                            onChange={e => setFilters({ ...filters, divYieldMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Quality Grade Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Min Quality Grade</label>
                        <select
                            value={filters.qualityGradeMin ?? ''}
                            onChange={e => setFilters({ ...filters, qualityGradeMin: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Any</option>
                            <option value="A">A or Better</option>
                            <option value="B">B or Better</option>
                            <option value="C">C or Better</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                        <select
                            value={filters.sortBy ?? 'quality_score'}
                            onChange={e => setFilters({ ...filters, sortBy: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="quality_score">Quality Score</option>
                            <option value="pe_ratio">P/E Ratio</option>
                            <option value="dividend_yield">Dividend Yield</option>
                            <option value="perf_1m">1M Performance</option>
                            <option value="perf_3m">3M Performance</option>
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                        <select
                            value={filters.sortOrder ?? 'desc'}
                            onChange={e => setFilters({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleFilterChange}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                        <RefreshCw size={16} />
                        Apply Filters
                    </button>
                    <button
                        onClick={() => {
                            setFilters({ sortBy: 'quality_score', sortOrder: 'desc' });
                            setTimeout(loadResults, 100);
                        }}
                        className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left">Company</th>
                                <th className="px-6 py-3 text-right">Price</th>
                                <th className="px-6 py-3 text-right">P/E</th>
                                <th className="px-6 py-3 text-right">P/B</th>
                                <th className="px-6 py-3 text-right">Yield %</th>
                                <th className="px-6 py-3 text-right">Quality</th>
                                <th className="px-6 py-3 text-center">Signal</th>
                                <th className="px-6 py-3 text-right">1M %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                        <p className="font-medium">No companies match the selected filters.</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Try widening the P/E or yield range.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                results.map(result => {
                                    const signal = calculateSignal(result);
                                    return (
                                        <tr 
                                            key={result.ticker} 
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedTicker === result.ticker ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                                            onClick={() => setSelectedTicker(result.ticker)}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-800">{result.ticker}</p>
                                                    <p className="text-xs text-slate-500">{result.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-semibold text-slate-800">
                                                    {formatNumber(result.price)} MAD
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-slate-700">{formatNumber(result.pe_ratio)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-slate-700">{formatNumber(result.pb_ratio)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-emerald-600 font-semibold">
                                                    {formatNumber(result.dividend_yield, 2)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${getGradeColor(result.quality_grade)}`}>
                                                        {result.quality_grade ?? 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {formatNumber(result.quality_score)}/100
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                                        signal === 'undervalued' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                        signal === 'overvalued' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                        'bg-amber-50 border-amber-200 text-amber-700'
                                                    }`}
                                                >
                                                    {signal === 'undervalued' && '↓ Undervalued'}
                                                    {signal === 'overvalued' && '↑ Overvalued'}
                                                    {signal === 'fair' && '= Fair'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={result.perf_1m && result.perf_1m > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {result.perf_1m ? `${result.perf_1m > 0 ? '+' : ''}${formatNumber(result.perf_1m)}%` : 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-sm text-emerald-600 font-semibold">Undervalued</p>
                        <p className="text-2xl font-bold text-emerald-700">
                            {results.filter(r => calculateSignal(r) === 'undervalued').length}
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-600 font-semibold">Fair Value</p>
                        <p className="text-2xl font-bold text-amber-700">
                            {results.filter(r => calculateSignal(r) === 'fair').length}
                        </p>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <p className="text-sm text-rose-600 font-semibold">Overvalued</p>
                        <p className="text-2xl font-bold text-rose-700">
                            {results.filter(r => calculateSignal(r) === 'overvalued').length}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
