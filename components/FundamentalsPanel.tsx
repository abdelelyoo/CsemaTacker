import React, { useEffect, useState } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { useMetrics } from '../context/MetricsContext';
import { BarChart3, TrendingUp, Search } from 'lucide-react';
import { MarketDataService, MarketStock } from '../services/marketDataService';

export const FundamentalsPanel: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const { selectedTicker, setSelectedTicker } = useMetrics();
    const [allStocks, setAllStocks] = useState<MarketStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectors, setSectors] = useState<string[]>([]);
    const [selectedSector, setSelectedSector] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedTicker) {
            setSearchTerm(selectedTicker);
        }
    }, [selectedTicker]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stocks, sectorList] = await Promise.all([
                MarketDataService.getAllStocks({ limit: 100 }),
                MarketDataService.getSectors()
            ]);
            setAllStocks(stocks);
            setSectors(['All', ...sectorList]);
        } catch (err) {
            console.error('Failed to load fundamentals:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStocks = allStocks.filter(stock => {
        const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;
        const matchesSearch = !searchTerm || 
            stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSector && matchesSearch;
    });

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <BarChart3 size={24} />
                    <div>
                        <h2 className="text-lg font-bold">Fundamental Analysis</h2>
                        <p className="text-sm text-indigo-100">
                            {allStocks.length} CSEMA stocks • P/E, ROE, Profitability
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by ticker or name..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setSelectedTicker(null);
                                }}
                                className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {selectedTicker && (
                                <button
                                    onClick={() => {
                                        setSelectedTicker(null);
                                        setSearchTerm('');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sector Filter */}
                    <select
                        value={selectedSector}
                        onChange={e => setSelectedSector(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {sectors.map(sector => (
                            <option key={sector} value={sector}>{sector}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Market Leaders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-emerald-600" />
                        <h3 className="text-sm font-semibold text-slate-800">Top ROE</h3>
                    </div>
                    <ul className="space-y-2">
                        {[...allStocks]
                            .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0))
                            .slice(0, 5)
                            .map(stock => (
                                <li key={stock.ticker} className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-800">{stock.ticker}</span>
                                    <span className="text-emerald-600">{stock.roe?.toFixed(1) ?? 'N/A'}%</span>
                                </li>
                            ))}
                    </ul>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-800">Top Dividend Yield</h3>
                    </div>
                    <ul className="space-y-2">
                        {[...allStocks]
                            .filter(s => s.dividend_yield && s.dividend_yield > 0)
                            .sort((a, b) => (b.dividend_yield ?? 0) - (a.dividend_yield ?? 0))
                            .slice(0, 5)
                            .map(stock => (
                                <li key={stock.ticker} className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-800">{stock.ticker}</span>
                                    <span className="text-blue-600">{stock.dividend_yield?.toFixed(2) ?? 'N/A'}%</span>
                                </li>
                            ))}
                    </ul>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-indigo-600" />
                        <h3 className="text-sm font-semibold text-slate-800">Top Quality</h3>
                    </div>
                    <ul className="space-y-2">
                        {[...allStocks]
                            .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
                            .slice(0, 5)
                            .map(stock => (
                                <li key={stock.ticker} className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-800">{stock.ticker}</span>
                                    <span className="text-indigo-600">{stock.quality_grade ?? 'N/A'}</span>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left">Company</th>
                                <th className="px-4 py-3 text-right">Sector</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">P/E</th>
                                <th className="px-4 py-3 text-right">P/B</th>
                                <th className="px-4 py-3 text-right">ROE</th>
                                <th className="px-4 py-3 text-right">Margin</th>
                                <th className="px-4 py-3 text-right">Yield</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStocks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                                        No companies found
                                    </td>
                                </tr>
                            ) : (
                                filteredStocks.map(stock => (
                                    <tr 
                                        key={stock.ticker} 
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedTicker === stock.ticker ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                                        onClick={() => setSelectedTicker(stock.ticker)}
                                    >
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-bold text-slate-800">{stock.ticker}</p>
                                                <p className="text-xs text-slate-500">{stock.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-600">{stock.sector ?? 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-medium text-slate-800">
                                                {stock.price ? `${stock.price.toFixed(2)} MAD` : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-700">{stock.pe_ratio?.toFixed(2) ?? 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-700">{stock.pb_ratio?.toFixed(2) ?? 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={stock.roe && stock.roe > 15 ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                                                {stock.roe?.toFixed(1) ?? 'N/A'}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-700">{stock.net_margin?.toFixed(1) ?? 'N/A'}%</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-emerald-600 font-medium">
                                                {stock.dividend_yield ? `${stock.dividend_yield.toFixed(2)}%` : 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Info */}
            <div className="text-sm text-slate-500 text-center">
                Showing {filteredStocks.length} of {allStocks.length} companies
            </div>
        </div>
    );
};
