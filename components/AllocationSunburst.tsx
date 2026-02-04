
import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';

// Render active shape for interaction
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
    return (
        <g>
            <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#334155" className="text-xl font-bold">
                {payload.name}
            </text>
            <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#94a3b8" className="text-sm font-medium">
                {`${(percent * 100).toFixed(1)}%`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 10}
                outerRadius={outerRadius + 12}
                fill={fill}
            />
        </g>
    );
};

export const AllocationSunburst: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [activeIndex, setActiveIndex] = useState(0);

    // Prepare Data
    // Inner Ring: Sectors
    const sectorMap: Record<string, number> = {};
    const COLORS_SECTORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']; // Slates
    const COLORS_ASSETS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

    portfolio.holdings.forEach(h => {
        if (h.marketValue > 0) {
            sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.marketValue;
        }
    });

    const sectorData = Object.entries(sectorMap)
        .map(([name, value], index) => ({ name, value, fill: COLORS_SECTORS[index % COLORS_SECTORS.length] }))
        .sort((a, b) => b.value - a.value);

    // Outer Ring: Assets (Sorted by Sector then Value)
    // We strictly need to order them to match sector slices visually if we want "Sunburst" effect,
    // but Recharts Pie angles are automatic. To align them perfectly like a sunburst is hard without manual angle calc.
    // Compromise: Just two independent rings for visually nice comparison.
    // Inner: Sectors
    // Outer: Assets

    const assetData = portfolio.holdings
        .filter(h => h.marketValue > 0)
        .sort((a, b) => {
            if (a.sector === b.sector) return b.marketValue - a.marketValue;
            return sectorData.findIndex(s => s.name === a.sector) - sectorData.findIndex(s => s.name === b.sector);
        })
        .map((h, i) => ({
            name: h.ticker,
            value: h.marketValue,
            fill: COLORS_ASSETS[i % COLORS_ASSETS.length],
            sector: h.sector
        }));

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-2">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Allocation Radar</h3>
                <p className="text-xs text-slate-500">Sector (Inner) vs Asset (Outer) Breakdown</p>
            </div>

            <div className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900/90 backdrop-blur text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50">
                                            <div className="font-bold mb-1 text-base">{d.name}</div>
                                            {d.sector && <div className="text-slate-400 mb-2 uppercase tracking-wider text-[10px]">{d.sector}</div>}
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-300">Value:</span>
                                                <span className="font-mono font-bold">{d.value.toLocaleString('fr-MA', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-slate-700">
                                                <span className="text-emerald-400">Weight:</span>
                                                <span className="font-bold">{((d.value / portfolio.totalValue) * 100).toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Inner Ring: Sectors */}
                        <Pie
                            data={sectorData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            innerRadius={40}
                            fill="#8884d8"
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {sectorData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>

                        {/* Outer Ring: Assets */}
                        <Pie
                            data={assetData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            fill="#82ca9d"
                            paddingAngle={2}
                            onMouseEnter={onPieEnter}
                            stroke="#fff"
                            strokeWidth={2}
                            // @ts-ignore
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                        >
                            {assetData.map((entry, index) => (
                                <Cell key={`cell-out-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Overlay for Context (Optional, overlapping logic prevents this from being perfect, so keeping it clean) */}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {sectorData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }}></div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{s.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
