import React, { useEffect, useState } from 'react';
import { FundamentalCard } from './FundamentalCard';
import { usePortfolioContext } from '../context/PortfolioContext';
import { BarChart3, TrendingUp } from 'lucide-react';
import { FundamentalService, FundamentalMetrics } from '../services/fundamentalService';

export const FundamentalsPanel: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [holdingTickers, setHoldingTickers] = useState<string[]>([]);
    const [topROE, setTopROE] = useState<FundamentalMetrics[]>([]);
    const [topYield, setTopYield] = useState<FundamentalMetrics[]>([]);

    useEffect(() => {
        // Extract unique tickers from holdings with quantity > 0
        const tickers = portfolio.holdings
            .filter(h => h.quantity > 0)
            .map(h => h.ticker)
            .sort();
        setHoldingTickers(tickers);
    }, [portfolio]);

    // Load top performers once for extra insight
    useEffect(() => {
        const loadTop = async () => {
            try {
                const [roeLeaders, yieldLeaders] = await Promise.all([
                    FundamentalService.getTopPerformers('roe', 3),
                    FundamentalService.getTopPerformers('dividend_yield', 3)
                ]);
                setTopROE(roeLeaders);
                setTopYield(yieldLeaders);
            } catch {
                // Best‑effort only; ignore errors so fundamentals tab still works
            }
        };
        loadTop();
    }, []);

    if (holdingTickers.length === 0) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <BarChart3 size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700 mb-2">No Holdings Found</h3>
                <p className="text-sm text-slate-500">
                    Import or add transactions to see fundamental analysis for your holdings.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <BarChart3 size={24} />
                    <div>
                        <h2 className="text-lg font-bold">Fundamental Analysis</h2>
                        <p className="text-sm text-blue-100">
                            {holdingTickers.length} holdings • P/E, ROE, Growth Rates
                        </p>
                    </div>
                </div>
            </div>

            {/* Top performers across the market */}
            {(topROE.length > 0 || topYield.length > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-emerald-600" />
                        <h3 className="text-sm font-semibold text-slate-800">Market Leaders Snapshot</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {topROE.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Top ROE</p>
                                <ul className="space-y-1">
                                    {topROE.map(m => (
                                        <li key={m.ticker} className="flex justify-between">
                                            <span className="font-medium text-slate-800">{m.ticker}</span>
                                            <span className="text-slate-600">
                                                {m.latestROE !== undefined ? `${m.latestROE.toFixed(1)}% ROE` : 'N/A'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {topYield.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Top Dividend Yield</p>
                                <ul className="space-y-1">
                                    {topYield.map(m => (
                                        <li key={m.ticker} className="flex justify-between">
                                            <span className="font-medium text-slate-800">{m.ticker}</span>
                                            <span className="text-slate-600">
                                                {m.latestDividendYield !== undefined
                                                    ? `${m.latestDividendYield.toFixed(1)}%`
                                                    : 'N/A'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {holdingTickers.map(ticker => (
                    <FundamentalCard key={ticker} ticker={ticker} />
                ))}
            </div>
        </div>
    );
};
