import React, { useEffect, useState } from 'react';
import { FundamentalService, FundamentalMetrics } from '../services/fundamentalService';
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign } from 'lucide-react';

interface FundamentalCardProps {
    ticker: string;
}

export const FundamentalCard: React.FC<FundamentalCardProps> = ({ ticker }) => {
    const [metrics, setMetrics] = useState<FundamentalMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, [ticker]);

    const loadMetrics = async () => {
        setLoading(true);
        const data = await FundamentalService.getMetrics(ticker);
        setMetrics(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-500">No fundamental data available for {ticker}</p>
            </div>
        );
    }

    const formatNumber = (num: number | undefined, decimals: number = 2): string => {
        if (num === undefined || num === null) return 'N/A';
        return num.toFixed(decimals);
    };

    const formatPercent = (num: number | undefined, decimals: number = 2): string => {
        if (num === undefined || num === null) return 'N/A';
        return `${num.toFixed(decimals)}%`;
    };

    const formatLargeNumber = (num: number | undefined): string => {
        if (num === undefined || num === null) return 'N/A';
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(0);
    };

    const getTrendIcon = (isPositive: boolean | undefined) => {
        if (isPositive === undefined) return <Minus size={14} className="text-slate-400" />;
        return isPositive
            ? <TrendingUp size={14} className="text-emerald-500" />
            : <TrendingDown size={14} className="text-rose-500" />;
    };

    const getTrendColor = (current: number | undefined, avg: number | undefined) => {
        if (!current || !avg) return 'text-slate-600';
        if (current > avg * 1.1) return 'text-emerald-600';
        if (current < avg * 0.9) return 'text-rose-600';
        return 'text-slate-600';
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">{metrics.ticker}</h3>
                    <p className="text-sm text-slate-500">{metrics.companyName}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                        {metrics.sector}
                    </span>
                </div>
                <Activity size={20} className="text-blue-600" />
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* P/E Ratio */}
                <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-medium">P/E Ratio</span>
                        {getTrendIcon(metrics.latestPE && metrics.avgPE && metrics.latestPE < metrics.avgPE)}
                    </div>
                    <p className={`text-lg font-bold ${getTrendColor(metrics.latestPE, metrics.avgPE)}`}>
                        {formatNumber(metrics.latestPE)}
                    </p>
                    <p className="text-xs text-slate-400">Avg: {formatNumber(metrics.avgPE)}</p>
                </div>

                {/* ROE */}
                <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-medium">ROE</span>
                        {getTrendIcon(metrics.roeImproving)}
                    </div>
                    <p className={`text-lg font-bold ${getTrendColor(metrics.latestROE, metrics.avgROE)}`}>
                        {formatPercent(metrics.latestROE)}
                    </p>
                    <p className="text-xs text-slate-400">Avg: {formatPercent(metrics.avgROE)}</p>
                </div>

                {/* P/B Ratio */}
                <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-medium">P/B Ratio</span>
                    </div>
                    <p className="text-lg font-bold text-slate-600">
                        {formatNumber(metrics.latestPB)}
                    </p>
                </div>

                {/* Dividend Yield */}
                <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-medium">Div Yield</span>
                        <DollarSign size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-lg font-bold text-emerald-600">
                        {formatPercent(metrics.latestDividendYield)}
                    </p>
                    <p className="text-xs text-slate-400">Avg: {formatPercent(metrics.avgDividendYield)}</p>
                </div>
            </div>

            {/* Growth Metrics */}
            <div className="border-t border-slate-200 pt-3">
                <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Growth Rates (3Y CAGR)</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded">
                        <span className="text-xs text-slate-600">Revenue</span>
                        <div className="flex items-center gap-1">
                            {getTrendIcon(metrics.revenueGrowing)}
                            <span className={`text-sm font-bold ${metrics.revenueCAGR && metrics.revenueCAGR > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatPercent(metrics.revenueCAGR, 1)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded">
                        <span className="text-xs text-slate-600">Earnings</span>
                        <div className="flex items-center gap-1">
                            {getTrendIcon(metrics.earningsCAGR && metrics.earningsCAGR > 0)}
                            <span className={`text-sm font-bold ${metrics.earningsCAGR && metrics.earningsCAGR > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatPercent(metrics.earningsCAGR, 1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROE Trend Sparkline */}
            {metrics.historicalROE.length > 1 && (
                <div className="border-t border-slate-200 pt-3 mt-3">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2">ROE Trend</h4>
                    <div className="flex items-end justify-between h-12 gap-1">
                        {metrics.historicalROE.map((point, idx) => {
                            const maxROE = Math.max(...metrics.historicalROE.map(p => p.value));
                            const height = (point.value / maxROE) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className={`w-full rounded-t transition-all ${metrics.roeImproving ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                        style={{ height: `${height}%` }}
                                        title={`${point.year}: ${point.value.toFixed(2)}%`}
                                    ></div>
                                    <span className="text-[10px] text-slate-400">{point.year}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
