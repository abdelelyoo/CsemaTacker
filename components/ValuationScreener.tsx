import React, { useEffect, useState } from 'react';
import { ValuationService, ValuationMetrics, ScreenFilters } from '../services/valuationService';
import { TrendingUp, TrendingDown, Minus, Filter, Download, RefreshCw } from 'lucide-react';

export const ValuationScreener: React.FC = () => {
    const [results, setResults] = useState<ValuationMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<ScreenFilters>({
        sortBy: 'garpScore',
        sortOrder: 'desc'
    });

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ValuationService.screenByMetrics(filters);
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load valuations');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = async () => {
        await loadResults();
    };

    const getSignalColor = (signal?: string): string => {
        switch (signal) {
            case 'undervalued':
                return 'text-emerald-600';
            case 'overvalued':
                return 'text-rose-600';
            default:
                return 'text-amber-600';
        }
    };

    const getSignalBgColor = (signal?: string): string => {
        switch (signal) {
            case 'undervalued':
                return 'bg-emerald-50 border-emerald-200';
            case 'overvalued':
                return 'bg-rose-50 border-rose-200';
            default:
                return 'bg-amber-50 border-amber-200';
        }
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
                        <p className="text-sm text-blue-100">Find overvalued and undervalued stocks</p>
                    </div>
                </div>
                <p className="text-sm text-blue-100 mt-2">
                    Screening {results.length} companies � GARP Score based on P/E, growth rate, and ROE trends
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
                            value={filters.peMin || ''}
                            onChange={e => setFilters({ ...filters, peMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">P/E Max</label>
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.peMax || ''}
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
                            value={filters.divYieldMin || ''}
                            onChange={e => setFilters({ ...filters, divYieldMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* GARP Grade Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Min GARP Grade</label>
                        <select
                            value={filters.garpGradeMin || ''}
                            onChange={e => setFilters({ ...filters, garpGradeMin: e.target.value || undefined })}
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
                            value={filters.sortBy || 'garpScore'}
                            onChange={e => setFilters({ ...filters, sortBy: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="garpScore">GARP Score</option>
                            <option value="pe">P/E Ratio</option>
                            <option value="divYield">Dividend Yield</option>
                            <option value="pe_percentile">P/E Percentile</option>
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                        <select
                            value={filters.sortOrder || 'desc'}
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
                            setFilters({ sortBy: 'garpScore', sortOrder: 'desc' });
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
                                <th className="px-6 py-3 text-right">P/E</th>
                                <th className="px-6 py-3 text-right">P/B</th>
                                <th className="px-6 py-3 text-right">Yield %</th>
                                <th className="px-6 py-3 text-right">GARP</th>
                                <th className="px-6 py-3 text-center">Signal</th>
                                <th className="px-6 py-3 text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        <p className="font-medium">No companies match the selected filters.</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Try widening the P/E or yield range, or confirm that profile data has been imported.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                results.map(result => (
                                    <tr key={result.ticker} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800">{result.ticker}</p>
                                                <p className="text-xs text-slate-500">{result.companyName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {formatNumber(result.currentPE)}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Avg: {formatNumber(result.peAverage)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-slate-700">{formatNumber(result.currentPB)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-emerald-600 font-semibold">
                                                {formatNumber(result.currentDivYield, 2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${getGradeColor(result.garpGrade)}`}>
                                                    {result.garpGrade}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {formatNumber(result.garpScore)}/100
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getSignalBgColor(result.signal)}`}
                                            >
                                                <span className={`${getSignalColor(result.signal)} mr-1`}>
                                                    {result.signal === 'undervalued' && '?'}
                                                    {result.signal === 'overvalued' && '?'}
                                                    {result.signal === 'fair' && '='}
                                                </span>
                                                {result.signal?.charAt(0).toUpperCase() + result.signal?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs">
                                                {result.valuationTrend === 'expanding' && (
                                                    <span className="text-rose-600">?? Exp</span>
                                                )}
                                                {result.valuationTrend === 'contracting' && (
                                                    <span className="text-emerald-600">?? Con</span>
                                                )}
                                                {result.valuationTrend === 'stable' && (
                                                    <span className="text-slate-600">?? Stb</span>
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))
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
                            {results.filter(r => r.signal === 'undervalued').length}
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-600 font-semibold">Fair Value</p>
                        <p className="text-2xl font-bold text-amber-700">
                            {results.filter(r => r.signal === 'fair').length}
                        </p>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <p className="text-sm text-rose-600 font-semibold">Overvalued</p>
                        <p className="text-2xl font-bold text-rose-700">
                            {results.filter(r => r.signal === 'overvalued').length}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
