
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';

const COLORS_SECTORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const COLORS_ASSETS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 14}
                outerRadius={outerRadius + 16}
                fill={fill}
            />
        </g>
    );
};

const Sector = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const path = describeArc(cx, cy, outerRadius, startAngle, endAngle);
    const pathInner = describeArc(cx, cy, innerRadius, startAngle, endAngle);
    return (
        <path
            d={`${path} L${pathInner} A${innerRadius},${innerRadius},0,0,0,${getPointOnCircle(innerRadius, startAngle).x},${getPointOnCircle(innerRadius, startAngle).y} Z`}
            fill={fill}
        />
    );
};

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = getPointOnCircle(radius, endAngle);
    const end = getPointOnCircle(radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
}

function getPointOnCircle(radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: radius * Math.cos(angleInRadians),
        y: radius * Math.sin(angleInRadians)
    };
}

export const AllocationSunburst: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [hoveredSector, setHoveredSector] = useState<string | null>(null);

    const sectorMap: Record<string, number> = useMemo(() => {
        const map: Record<string, number> = {};
        portfolio.holdings.forEach(h => {
            if (h.marketValue > 0) {
                map[h.sector] = (map[h.sector] || 0) + h.marketValue;
            }
        });
        return map;
    }, [portfolio.holdings]);

    const sectorData = useMemo(() => {
        return Object.entries(sectorMap)
            .map(([name, value], index) => ({ 
                name, 
                value, 
                fill: COLORS_SECTORS[index % COLORS_SECTORS.length] 
            }))
            .sort((a, b) => b.value - a.value);
    }, [sectorMap]);

    const totalValue = portfolio.totalValue;

    const assetData = useMemo(() => {
        return portfolio.holdings
            .filter(h => h.marketValue > 0)
            .sort((a, b) => b.marketValue - a.marketValue)
            .map((h, i) => ({
                name: h.ticker,
                value: h.marketValue,
                fill: sectorData.find(s => s.name === h.sector)?.fill || COLORS_ASSETS[i % COLORS_ASSETS.length],
                sector: h.sector,
                company: h.company,
                qty: h.quantity,
                costBasis: h.averageCost,
                gain: h.unrealizedPL,
                gainPercent: h.unrealizedPLPercent
            }));
    }, [portfolio.holdings, sectorData]);

    const topHoldings = assetData.slice(0, 5);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(null);
    };

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Allocation Radar</h3>
                <p className="text-[10px] text-slate-500">Sector & Asset Distribution</p>
            </div>

            <div className="flex-1 min-h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    const isAsset = 'company' in d;
                                    return (
                                        <div className="bg-slate-900/95 backdrop-blur text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50">
                                            <div className="font-bold mb-1 text-base">{d.name}</div>
                                            {d.sector && <div className="text-slate-400 mb-2 uppercase tracking-wider text-[10px]">{d.sector}</div>}
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-300">Value:</span>
                                                    <span className="font-mono font-bold">{formatCurrency(d.value)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-emerald-400">Weight:</span>
                                                    <span className="font-bold">{((d.value / totalValue) * 100).toFixed(1)}%</span>
                                                </div>
                                                {isAsset && (
                                                    <>
                                                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
                                                            <span className="text-slate-300">Qty:</span>
                                                            <span className="font-mono">{d.qty.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-slate-300">P/L:</span>
                                                            <span className={`font-mono font-bold ${d.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {d.gain >= 0 ? '+' : ''}{formatCurrency(d.gain)} ({d.gainPercent.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
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
                            outerRadius={55}
                            innerRadius={35}
                            fill="#8884d8"
                            stroke="#fff"
                            strokeWidth={2}
                            onMouseEnter={(_, idx) => setHoveredSector(sectorData[idx]?.name || null)}
                            onMouseLeave={() => setHoveredSector(null)}
                        >
                            {sectorData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.fill}
                                    style={{ 
                                        filter: hoveredSector && hoveredSector !== entry.name ? 'opacity(0.3)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                            ))}
                        </Pie>

                        {/* Outer Ring: Assets */}
                        <Pie
                            data={assetData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={62}
                            outerRadius={90}
                            fill="#82ca9d"
                            paddingAngle={1}
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            stroke="#fff"
                            strokeWidth={1}
                            activeShape={renderActiveShape}
                        >
                            {assetData.map((entry, index) => (
                                <Cell 
                                    key={`cell-out-${index}`} 
                                    fill={entry.fill}
                                    style={{ 
                                        filter: hoveredSector && entry.sector !== hoveredSector ? 'opacity(0.25)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Value</div>
                        <div className="text-lg font-black text-slate-800">{formatCurrency(totalValue)}</div>
                    </div>
                </div>
            </div>

            {/* Top Holdings */}
            <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Holdings</div>
                <div className="space-y-1.5">
                    {topHoldings.map((h, idx) => (
                        <div key={h.name} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: h.fill }}
                                ></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{h.name}</span>
                                    <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{h.company}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono font-bold text-slate-800">{formatCurrency(h.value)}</div>
                                <div className={`text-[9px] font-medium ${h.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {h.gain >= 0 ? '+' : ''}{h.gainPercent.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sector Legend */}
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                {sectorData.map(s => (
                    <div 
                        key={s.name} 
                        className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-md border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                        onMouseEnter={() => setHoveredSector(s.name)}
                        onMouseLeave={() => setHoveredSector(null)}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }}></div>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">{s.name.substring(0, 8)}</span>
                        <span className="text-[9px] text-slate-400">{(s.value / totalValue * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
