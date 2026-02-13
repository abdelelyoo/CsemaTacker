
import React, { useState, useMemo } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip,
    Brush
} from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';
import { TrendingUp, TrendingDown, Activity, Target, Calendar } from 'lucide-react';

const TIME_RANGES = [
    { label: '1M', months: 1 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '1Y', months: 12 },
    { label: 'ALL', months: 999 }
];

export const PortfolioPerformance: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [timeRange, setTimeRange] = useState('6M');
    const [showInvested, setShowInvested] = useState(true);

    // Get values directly from portfolio - these are correct from portfolioCalc
    const stats = useMemo(() => {
        const totalDeposits = portfolio.totalDeposits;
        const totalWithdrawals = portfolio.totalWithdrawals;
        
        const cashBalance = portfolio.cashBalance;
        const holdingsValue = portfolio.totalValue;
        const currentValue = holdingsValue + cashBalance;
        
        const realized = portfolio.totalRealizedPL;
        const unrealized = portfolio.totalUnrealizedPL;
        const totalReturn = realized + unrealized;
        
        const invested = totalDeposits - totalWithdrawals;
        const returnPercent = invested !== 0 ? (totalReturn / invested) * 100 : 0;
        
        return {
            currentValue,
            holdingsValue,
            cashBalance,
            totalDeposits,
            totalWithdrawals,
            realized,
            unrealized,
            totalReturn,
            returnPercent,
            invested
        };
    }, [portfolio]);

    // Filter history by time range - just use the data as is
    const chartData = useMemo(() => {
        if (!portfolio.history || portfolio.history.length === 0) return [];

        const today = new Date();
        const rangeConfig = TIME_RANGES.find(r => r.label === timeRange) || TIME_RANGES[3];
        const cutoffDate = new Date();
        
        if (rangeConfig.months < 999) {
            cutoffDate.setMonth(today.getMonth() - rangeConfig.months);
        } else {
            cutoffDate.setFullYear(2000);
        }

        return portfolio.history
            .filter(h => new Date(h.date) >= cutoffDate)
            .map(point => ({
                date: point.date,
                value: point.value,
                invested: point.invested
            }));
    }, [portfolio.history, timeRange]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-MA', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    if (!portfolio.history || portfolio.history.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-center h-[400px]">
                <div className="text-center">
                    <Activity size={48} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">Portfolio Performance</h3>
                    <p className="text-sm text-slate-400">No data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500" />
                        Portfolio Performance
                    </h2>
                    <p className="text-xs text-slate-500">Net Evolution vs Invested Capital</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Time Range */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        {TIME_RANGES.map((r) => (
                            <button
                                key={r.label}
                                onClick={() => setTimeRange(r.label)}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${timeRange === r.label ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Toggle Invested Line */}
                    <button
                        onClick={() => setShowInvested(!showInvested)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${showInvested ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    >
                        Invested
                    </button>
                </div>
            </div>

            {/* Stats Row - Using same data as PortfolioSummary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-3 text-white">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1">
                        <Target size={12} />
                        Current Value
                    </div>
                    <div className="text-xl font-black">{formatCurrency(stats.currentValue)}</div>
                </div>
                
                <div className={`bg-gradient-to-br rounded-xl p-3 ${stats.totalReturn >= 0 ? 'from-emerald-50 to-emerald-100 border border-emerald-200' : 'from-rose-50 to-rose-100 border border-rose-200'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                        {stats.totalReturn >= 0 ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-rose-600" />}
                        <span className={stats.totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}>Total Return</span>
                    </div>
                    <div className={`text-xl font-black ${stats.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stats.totalReturn >= 0 ? '+' : ''}{formatCurrency(stats.totalReturn)}
                    </div>
                    <div className={`text-xs font-bold ${stats.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stats.returnPercent >= 0 ? '+' : ''}{stats.returnPercent.toFixed(2)}%
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        <TrendingUp size={12} />
                        Realized P/L
                    </div>
                    <div className={`text-xl font-black ${stats.realized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stats.realized >= 0 ? '+' : ''}{formatCurrency(stats.realized)}
                    </div>
                    <div className={`text-xs ${stats.unrealized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Unrealized: {stats.unrealized >= 0 ? '+' : ''}{formatCurrency(stats.unrealized)}
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        <Calendar size={12} />
                        Invested Capital
                    </div>
                    <div className="text-xl font-black text-blue-600">
                        {formatCurrency(stats.invested)}
                    </div>
                    <div className="text-xs text-slate-400">
                        In: {formatCurrency(stats.totalDeposits)}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            stroke="#cbd5e1"
                            minTickGap={30}
                            axisLine={false}
                            tickLine={false}
                        />
                        
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            stroke="#cbd5e1"
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />
                        
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-xs z-50">
                                            <div className="font-bold text-sm mb-2 border-b border-slate-700 pb-2">
                                                {formatFullDate(String(label))}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-6">
                                                    <span className="text-slate-400">Total Value:</span>
                                                    <span className="font-mono font-bold text-emerald-400">
                                                        {formatCurrency(data.value)}
                                                    </span>
                                                </div>
                                                {showInvested && data.invested !== undefined && (
                                                    <div className="flex justify-between gap-6">
                                                        <span className="text-slate-400">Invested:</span>
                                                        <span className="font-mono font-bold text-blue-400">
                                                            {formatCurrency(data.invested)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* Invested Capital Line */}
                        {showInvested && (
                            <Area
                                type="monotone"
                                dataKey="invested"
                                name="Invested"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                fill="url(#colorInvested)"
                                dot={false}
                                activeDot={false}
                            />
                        )}

                        {/* Portfolio Value Area */}
                        <Area
                            type="monotone"
                            dataKey="value"
                            name="Portfolio"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                        />

                        <Brush
                            dataKey="date"
                            height={25}
                            stroke="#cbd5e1"
                            tickFormatter={formatDate}
                            fill="#f8fafc"
                            travellerWidth={8}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-slate-600">Portfolio Value</span>
                </div>
                {showInvested && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-medium text-slate-600">Invested Capital</span>
                    </div>
                )}
            </div>
        </div>
    );
};
