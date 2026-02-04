
import React, { useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';

export const ReturnsHeatmap: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    // Generate Calendar Data
    // We want last 6 months, organized by Week -> Day
    // GitHub style: Rows = Days of Week (Mon-Sun), Cols = Weeks

    const { days, weeks, monthLabels } = useMemo(() => {
        if (!portfolio.history || portfolio.history.length === 0) return { days: [], weeks: [], monthLabels: [] };

        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 11); // Last 12 months (rolling year)
        startDate.setDate(1); // Start from 1st of that month

        // Map date string to daily P&L %
        const performanceMap = new Map<string, number>();

        for (let i = 1; i < portfolio.history.length; i++) {
            const curr = portfolio.history[i];
            const prev = portfolio.history[i - 1];
            if (prev.value > 0) {
                const dailyReturn = ((curr.value - prev.value) / prev.value) * 100;
                performanceMap.set(curr.date, dailyReturn);
            }
        }

        // Build Grid aligned to Mon-Sun (0-6)
        const allWeeks: { date: Date | null, value: number }[][] = [];
        let currentWeek: { date: Date | null, value: number }[] = [];

        // Month Labels logic
        const monthLabels: { name: string, weekIndex: number }[] = [];
        let lastMonth = -1;

        // Iterate day by day from startDate to today
        // First determine strict start Monday
        const runner = new Date(startDate);
        const dayOfWeek = runner.getDay(); // 0(Sun) - 6(Sat)
        // Adjust to Mon(0) - Sun(6) for logic, but JS uses Sun=0.
        // Let's standard: 1=Mon, ..., 0=Sun. 
        // We want grid: Row 0 = Mon, Row 1 = Tue ... Row 6 = Sun

        // Find Monday before start date if start date is not Monday
        const distToMon = (dayOfWeek + 6) % 7;
        runner.setDate(runner.getDate() - distToMon);

        // Limit iteration to ~52 weeks (1 year)
        let weekCount = 0;

        while (runner <= today || weekCount < 53) {

            // Check Month Label
            if (runner.getMonth() !== lastMonth && currentWeek.length === 0 && weekCount < 52) {
                monthLabels.push({
                    name: runner.toLocaleString('default', { month: 'short' }),
                    weekIndex: allWeeks.length
                });
                lastMonth = runner.getMonth();
            }

            const dateStr = runner.toISOString().split('T')[0];
            // Only show values if date >= startDate (hide pre-padding)
            const showValue = runner >= startDate && runner <= today;
            const val = showValue ? (performanceMap.get(dateStr) || 0) : 0;

            currentWeek.push({
                date: showValue ? new Date(runner) : null,
                value: val
            });

            // End of Week (Sunday)
            if (currentWeek.length === 7) {
                allWeeks.push(currentWeek);
                currentWeek = [];
                weekCount++;
            }

            // Safety break
            if (runner > today && currentWeek.length === 0) break;

            runner.setDate(runner.getDate() + 1);
        }

        return { weeks: allWeeks, monthLabels };
    }, [portfolio.history]);

    const getColor = (val: number, isNull: boolean) => {
        if (isNull) return 'bg-transparent';
        if (val === 0) return 'bg-slate-100';

        if (val > 3) return 'bg-emerald-700';
        if (val > 1.5) return 'bg-emerald-500';
        if (val > 0) return 'bg-emerald-300';

        if (val < -3) return 'bg-rose-700';
        if (val < -1.5) return 'bg-rose-500';
        return 'bg-rose-300';
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4 flex justify-between items-end">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Performance Heatmap</h3>
                    <p className="text-xs text-slate-500">Daily Return Consistency</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center overflow-x-auto">
                <div className="min-w-max">
                    {/* Month Labels */}
                    <div className="flex mb-2 pl-8">
                        {monthLabels.map((m, i) => (
                            <div
                                key={i}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center"
                                style={{
                                    width: `${4.3 * 16}px`, // Approx spacing
                                }}
                            >
                                {m.name}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {/* Day Labels */}
                        <div className="flex flex-col gap-1 pr-2 pt-1 text-[9px] font-bold text-slate-400">
                            <div className="h-3.5 leading-3">Mon</div>
                            <div className="h-3.5 leading-3"></div>
                            <div className="h-3.5 leading-3">Wed</div>
                            <div className="h-3.5 leading-3"></div>
                            <div className="h-3.5 leading-3">Fri</div>
                            <div className="h-3.5 leading-3"></div>
                            <div className="h-3.5 leading-3">Sun</div>
                        </div>

                        {/* Grid */}
                        <div className="flex gap-1">
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-1">
                                    {week.map((day, dIdx) => (
                                        <div
                                            key={dIdx}
                                            className={`w-3.5 h-3.5 rounded-[2px] ${getColor(day.value, day.date === null)} group relative transition-colors duration-200`}
                                        >
                                            {day.date && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 shadow-xl border border-slate-700">
                                                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
                                                        {day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-400">Daily Return:</span>
                                                        <span className={`font-mono font-bold ${day.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {day.value > 0 ? '+' : ''}{day.value.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 font-medium justify-end border-t border-slate-50 pt-3">
                <span>Loss</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-[2px] bg-rose-700"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-rose-300"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-slate-100"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-emerald-300"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-emerald-500"></div>
                    <div className="w-3 h-3 rounded-[2px] bg-emerald-700"></div>
                </div>
                <span>Gain</span>
            </div>
        </div>
    );
};
