import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { MarketDataService, MarketStock } from '../services/marketDataService';
import { formatCurrency } from '../utils/helpers';
import { CHART_COLORS } from '../constants/colors';

const COLORS = CHART_COLORS.SECTORS;

export const AllocationSunburst: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [viewMode, setViewMode] = useState<'sectors' | 'holdings'>('sectors');
    const [marketData, setMarketData] = useState<Map<string, MarketStock>>(new Map());

    useEffect(() => {
        const loadMarketData = async () => {
            const tickers = portfolio.holdings.map(h => h.ticker);
            if (tickers.length === 0) return;
            try {
                const stocks = await MarketDataService.getAllStocks({ limit: 200 });
                const dataMap = new Map<string, MarketStock>();
                stocks.forEach(stock => dataMap.set(stock.ticker, stock));
                setMarketData(dataMap);
            } catch (err) { }
        };
        loadMarketData();
    }, [portfolio.holdings]);

    const sectorData = useMemo(() => {
        const sectors: Record<string, { name: string; value: number; count: number }> = {};
        portfolio.holdings.forEach(h => {
            if (h.marketValue > 0) {
                const stock = marketData.get(h.ticker);
                const sector = stock?.sector || h.sector || 'Other';
                if (!sectors[sector]) {
                    sectors[sector] = { name: sector, value: 0, count: 0 };
                }
                sectors[sector].value += h.marketValue;
                sectors[sector].count += 1;
            }
        });
        return Object.values(sectors)
            .map((s, i) => ({ ...s, fill: COLORS[i % COLORS.length] }))
            .sort((a, b) => b.value - a.value);
    }, [portfolio.holdings, marketData]);

    const holdingsData = useMemo(() => {
        return portfolio.holdings
            .filter(h => h.marketValue > 0)
            .map((h, i) => ({
                name: h.ticker,
                value: h.marketValue,
                allocation: portfolio.totalValue > 0 ? (h.marketValue / portfolio.totalValue) * 100 : 0,
                pl: h.unrealizedPL,
                plPercent: h.unrealizedPLPercent,
                fill: sectorData.find(s => s.name === (marketData.get(h.ticker)?.sector || h.sector || 'Other'))?.fill || COLORS[i % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [portfolio.holdings, sectorData, marketData]);

    const totalValue = portfolio.totalValue;
    const topSector = sectorData[0];
    const topHoldings = holdingsData.slice(0, 5);

    if (portfolio.holdings.length === 0) {
        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Allocation Radar</h3>
                    <p className="text-[10px] text-slate-500">Sector & Asset Distribution</p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <PieIcon size={40} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No holdings to display</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Allocation Radar</h3>
                    <p className="text-[10px] text-slate-500">Sector & Asset Distribution</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <button
                        onClick={() => setViewMode('sectors')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'sectors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        Sectors
                    </button>
                    <button
                        onClick={() => setViewMode('holdings')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'holdings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        Holdings
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-[200px]">
                {viewMode === 'sectors' ? (
                    <>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={sectorData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={2}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    >
                                        {sectorData.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs">
                                                        <div className="font-bold">{d.name}</div>
                                                        <div className="text-slate-300">{formatCurrency(d.value)}</div>
                                                        <div className="text-emerald-400">{((d.value / totalValue) * 100).toFixed(1)}%</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Top Sector</div>
                                    <div className="text-sm font-black text-slate-800">{topSector?.name?.substring(0, 6) || 'N/A'}</div>
                                    <div className="text-xs text-emerald-600 font-bold">{topSector ? ((topSector.value / totalValue) * 100).toFixed(0) : 0}%</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 overflow-auto">
                            {sectorData.map((sector, idx) => (
                                <div key={sector.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sector.fill }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-700 truncate">{sector.name}</span>
                                            <span className="text-xs font-bold text-slate-800">{((sector.value / totalValue) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                                            <div className="h-full rounded-full" style={{ width: `${(sector.value / totalValue) * 100}%`, backgroundColor: sector.fill }} />
                                        </div>
                                        <div className="text-[9px] text-slate-400">{sector.count} holding{sector.count > 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={holdingsData.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 10, fontWeight: 600 }} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs">
                                                        <div className="font-bold">{d.name}</div>
                                                        <div className="text-slate-300">{formatCurrency(d.value)}</div>
                                                        <div className="text-emerald-400">{d.allocation.toFixed(1)}%</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {holdingsData.slice(0, 8).map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex-1 space-y-2 overflow-auto">
                            {holdingsData.slice(0, 8).map((holding, idx) => (
                                <div key={holding.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: holding.fill }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-700">{holding.name}</span>
                                            <span className={`text-xs font-bold ${holding.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {holding.pl >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-400">{formatCurrency(holding.value)} • {holding.allocation.toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Total Value</div>
                        <div className="text-lg font-black text-slate-800">{formatCurrency(totalValue)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Holdings</div>
                        <div className="text-lg font-black text-slate-800">{portfolio.holdings.length}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Sectors</div>
                        <div className="text-lg font-black text-slate-800">{sectorData.length}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};