import React, { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export const MiniHeatmap: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const weeks = useMemo(() => {
        if (!portfolio.history || portfolio.history.length === 0) return [];

        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 6); // Last 6 months

        // Group history by ISO week
        const weeksMap: Record<string, number[]> = {};

        portfolio.history
            .filter(h => new Date(h.date) >= startDate)
            .forEach(h => {
                const d = new Date(h.date);
                const weekNumber = getWeekNumber(d);
                const year = d.getFullYear();
                const key = `${year}-W${weekNumber}`;
                if (!weeksMap[key]) weeksMap[key] = [];
                weeksMap[key].push(h.value);
            });

        const sortedKeys = Object.keys(weeksMap).sort();
        const last24Keys = sortedKeys.slice(-24);

        // Calculate weekly change: first value vs last value of each week
        return last24Keys.map(key => {
            const vals = weeksMap[key];
            const start = vals[0];
            const end = vals[vals.length - 1];
            const gain = start > 0 ? ((end - start) / start) * 100 : 0;
            return { value: gain };
        });
    }, [portfolio.history]);

    function getWeekNumber(d: Date) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }

    const getColor = (val: number) => {
        if (Math.abs(val) < 0.1) return 'bg-slate-100';
        if (val > 5) return 'bg-emerald-600';
        if (val > 2) return 'bg-emerald-400';
        if (val > 0) return 'bg-emerald-200';
        if (val < -5) return 'bg-rose-600';
        if (val < -2) return 'bg-rose-400';
        return 'bg-rose-200';
    };

    const hasData = weeks.length > 0;

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Weekly Pulse</h3>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">Last 24 Weeks Performance</p>
            </div>

            {!hasData ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <TrendingUp size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">No history data available</p>
                        <p className="text-xs text-slate-400 mt-1">Add transactions to see weekly performance</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="grid grid-cols-8 gap-1.5">
                        {weeks.map((week, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className={`w-full aspect-square rounded-md ${getColor(week.value)} group relative cursor-help transition-transform hover:scale-125 hover:z-10`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30">
                                    {week.value > 0 ? '+' : ''}{week.value.toFixed(1)}%
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {hasData && (
                <div className="mt-4 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">
                    <span>Older</span>
                    <div className="flex gap-1 items-center px-4">
                        <div className="w-2 h-2 rounded-sm bg-rose-500"></div>
                        <div className="w-2 h-2 rounded-sm bg-slate-200"></div>
                        <div className="w-2 h-2 rounded-sm bg-emerald-500"></div>
                    </div>
                    <span>Recent</span>
                </div>
            )}
        </div>
    );
};
