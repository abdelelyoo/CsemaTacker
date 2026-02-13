
import React, { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';

export const ReturnsHeatmap: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const { weeks, monthLabels, stats } = useMemo(() => {
        if (!portfolio.history || portfolio.history.length === 0) return { weeks: [], monthLabels: [], stats: null };

        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 11);
        startDate.setDate(1);

        const weeklyData: { weekStart: Date | null, weekEnd: Date | null, value: number, gain: number }[] = [];
        
        // Group by week (Monday to Sunday)
        let currentWeekStart: Date | null = null;
        let currentWeekValues: number[] = [];
        let currentWeekStartValue = 0;

        for (let i = 0; i < portfolio.history.length; i++) {
            const curr = portfolio.history[i];
            const currDate = new Date(curr.date);
            
            if (currDate < startDate) continue;
            
            const dayOfWeek = currDate.getDay();
            const mondayOffset = (dayOfWeek + 6) % 7;
            const weekStart = new Date(currDate);
            weekStart.setDate(currDate.getDate() - mondayOffset);
            const weekStartStr = weekStart.toISOString().split('T')[0];

            if (!currentWeekStart || currentWeekStart.toISOString().split('T')[0] !== weekStartStr) {
                // Save previous week
                if (currentWeekStart && currentWeekValues.length > 0) {
                    const weekStartVal = currentWeekValues[0];
                    const weekEndVal = currentWeekValues[currentWeekValues.length - 1];
                    const gain = weekEndVal - weekStartVal;
                    const valuePercent = weekStartVal > 0 ? (gain / weekStartVal) * 100 : 0;
                    
                    weeklyData.push({
                        weekStart: currentWeekStart,
                        weekEnd: new Date(currentWeekStart!),
                        value: valuePercent,
                        gain: gain
                    });
                }
                // Start new week
                currentWeekStart = weekStart;
                currentWeekValues = [curr.value];
                currentWeekStartValue = curr.value;
            } else {
                currentWeekValues.push(curr.value);
            }
        }

        // Add last week
        if (currentWeekStart && currentWeekValues.length > 0) {
            const weekStartVal = currentWeekValues[0];
            const weekEndVal = currentWeekValues[currentWeekValues.length - 1];
            const gain = weekEndVal - weekStartVal;
            const valuePercent = weekStartVal > 0 ? (gain / weekStartVal) * 100 : 0;
            
            weeklyData.push({
                weekStart: currentWeekStart,
                weekEnd: new Date(currentWeekStart),
                value: valuePercent,
                gain: gain
            });
        }

        // Build month labels
        const monthLabels: { name: string, weekIndex: number }[] = [];
        let lastMonth = -1;
        weeklyData.forEach((week, idx) => {
            if (week.weekStart && week.weekStart.getMonth() !== lastMonth) {
                monthLabels.push({
                    name: week.weekStart.toLocaleString('default', { month: 'short' }),
                    weekIndex: idx
                });
                lastMonth = week.weekStart.getMonth();
            }
        });

        // Calculate stats
        const gains = weeklyData.filter(w => w.gain > 0).length;
        const losses = weeklyData.filter(w => w.gain < 0).length;
        const totalWeeks = weeklyData.length;
        const avgReturn = weeklyData.reduce((acc, w) => acc + w.value, 0) / totalWeeks || 0;
        const bestWeek = Math.max(...weeklyData.map(w => w.value));
        const worstWeek = Math.min(...weeklyData.map(w => w.value));

        const statsData = {
            totalWeeks,
            gains,
            losses,
            avgReturn,
            bestWeek,
            worstWeek,
            winRate: totalWeeks > 0 ? (gains / totalWeeks) * 100 : 0
        };

        return { weeks: weeklyData, monthLabels, stats: statsData };
    }, [portfolio.history]);

    const getColor = (val: number) => {
        if (val === 0) return 'bg-slate-100';
        
        if (val > 8) return 'bg-emerald-800';
        if (val > 5) return 'bg-emerald-600';
        if (val > 2) return 'bg-emerald-400';
        if (val > 0) return 'bg-emerald-200';

        if (val < -8) return 'bg-rose-800';
        if (val < -5) return 'bg-rose-600';
        if (val < -2) return 'bg-rose-400';
        return 'bg-rose-200';
    };

    const getTextColor = (val: number) => {
        if (val > 5 || val < -5) return 'text-white';
        return 'text-slate-700';
    };

    if (!portfolio.history || portfolio.history.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Performance Heatmap</h3>
                    <p className="text-xs text-slate-500 mt-2">No data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Performance Heatmap</h3>
                    <p className="text-[10px] text-slate-500">Weekly Return Consistency</p>
                </div>
                {stats && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${stats.winRate >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {stats.winRate.toFixed(0)}% Win Rate
                    </div>
                )}
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Avg</div>
                        <div className={`text-sm font-black ${stats.avgReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Best</div>
                        <div className="text-sm font-black text-emerald-600">+{stats.bestWeek.toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Worst</div>
                        <div className="text-sm font-black text-rose-600">{stats.worstWeek.toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Weeks</div>
                        <div className="text-sm font-black text-slate-600">
                            <span className="text-emerald-600">{stats.gains}↑</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-rose-600">{stats.losses}↓</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Heatmap Grid */}
            <div className="flex-1 flex flex-col justify-center overflow-x-auto">
                <div className="min-w-max">
                    {/* Month Labels */}
                    <div className="flex mb-2 pl-12">
                        {monthLabels.map((m, i) => (
                            <div
                                key={i}
                                className="text-[9px] font-bold text-slate-400 uppercase tracking-wider"
                                style={{ width: '52px' }}
                            >
                                {m.name}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-1">
                        {/* Month Column Labels */}
                        <div className="flex flex-col gap-1 pr-1">
                            {['W1', 'W2', 'W3', 'W4'].map((w, i) => (
                                <div key={i} className="h-5 text-[8px] font-bold text-slate-300 leading-5">{w}</div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex gap-0.5">
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-0.5 group">
                                    <div
                                        className={`w-10 h-14 rounded-md ${getColor(week.value)} flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer relative`}
                                    >
                                        <span className={`text-[10px] font-bold ${getTextColor(week.value)}`}>
                                            {week.value > 0 ? '+' : ''}{week.value.toFixed(1)}%
                                        </span>
                                        
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 shadow-xl border border-slate-700">
                                            <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
                                                Week of {week.weekStart?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-400">Return:</span>
                                                    <span className={`font-mono font-bold ${week.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {week.value > 0 ? '+' : ''}{week.value.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-400">P/L:</span>
                                                    <span className={`font-mono font-bold ${week.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {week.gain >= 0 ? '+' : ''}{formatCurrency(week.gain)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-400 font-medium justify-end">
                <span>Loss</span>
                <div className="flex gap-0.5">
                    <div className="w-4 h-4 rounded bg-rose-800"></div>
                    <div className="w-4 h-4 rounded bg-rose-600"></div>
                    <div className="w-4 h-4 rounded bg-rose-400"></div>
                    <div className="w-4 h-4 rounded bg-rose-200"></div>
                    <div className="w-4 h-4 rounded bg-slate-100"></div>
                    <div className="w-4 h-4 rounded bg-emerald-200"></div>
                    <div className="w-4 h-4 rounded bg-emerald-400"></div>
                    <div className="w-4 h-4 rounded bg-emerald-600"></div>
                    <div className="w-4 h-4 rounded bg-emerald-800"></div>
                </div>
                <span>Gain</span>
            </div>
        </div>
    );
};
