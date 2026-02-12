
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList, Cell } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';

export const CapitalBridge: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const netInvested = portfolio.totalDeposits;
    const realized = portfolio.totalRealizedPL;
    const dividends = portfolio.totalDividends;
    const fees = -(portfolio.totalTradingFees + portfolio.totalCustodyFees + portfolio.totalSubscriptionFees + portfolio.netTaxImpact);
    const unrealized = portfolio.totalUnrealizedPL;
    const currentValue = portfolio.totalValue + portfolio.cashBalance;

    // Running Tally
    let currentTotal = netInvested;

    // Data Structure for Recharts Range Bars: [min, max]
    const data = [
        {
            name: 'Invested',
            value: [0, netInvested], // From 0 to Invested
            delta: netInvested,
            type: 'base',
            total: netInvested
        },
        {
            name: 'Realized',
            value: [currentTotal, currentTotal + realized],
            delta: realized,
            type: 'delta',
            total: currentTotal += realized
        },
        {
            name: 'Dividends',
            value: [currentTotal, currentTotal + dividends],
            delta: dividends,
            type: 'delta',
            total: currentTotal += dividends
        },
        {
            name: 'Fees',
            value: [currentTotal, currentTotal + fees], // fees is negative, so [High, Low] basically
            delta: fees,
            type: 'delta',
            total: currentTotal += fees
        },
        {
            name: 'Unrealized',
            value: [currentTotal, currentTotal + unrealized],
            delta: unrealized,
            type: 'delta',
            total: currentTotal += unrealized
        },
        {
            name: 'Equity',
            value: [0, currentValue], // From 0 to Final
            delta: currentValue,
            type: 'final',
            total: currentValue
        }
    ];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Capital Bridge</h3>
                    <p className="text-xs text-slate-500">P&L Attribution Waterfall</p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Net Movement</div>
                    <div className={`text-lg font-mono font-bold ${currentValue - netInvested >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {currentValue - netInvested >= 0 ? '+' : ''}{(currentValue - netInvested).toLocaleString('fr-MA', { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
                                            <div className="font-bold mb-1 text-slate-300">{d.name}</div>
                                            <div className="text-xl font-mono font-bold mb-2">
                                                {d.delta > 0 && d.type === 'delta' ? '+' : ''}
                                                {d.delta.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">MAD</span>
                                            </div>
                                            {d.type === 'delta' && (
                                                <div className="text-slate-400 pt-2 border-t border-slate-700 flex justify-between">
                                                    <span>Resulting Equity:</span>
                                                    <span className="text-white font-semibold">{d.total.toLocaleString('fr-MA', { maximumFractionDigits: 0 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                            {data.map((entry, index) => {
                                let color = '#94a3b8';
                                if (entry.type === 'base') color = '#3b82f6'; // Blue
                                else if (entry.type === 'final') color = '#10b981'; // Emerald
                                else {
                                    // Colors for deltas
                                    if (entry.name === 'Fees') color = '#ef4444'; // Red
                                    else if (entry.name === 'Dividends') color = '#8b5cf6'; // Purple
                                    else if (entry.delta >= 0) color = '#22c55e'; // Green
                                    else color = '#f43f5e'; // Red-Pink for losses
                                }
                                return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                            <LabelList
                                dataKey="delta"
                                position="top"
                                formatter={(val: number) => {
                                    if (Math.abs(val) > 1000) return `${(val / 1000).toFixed(0)}k`;
                                    return Math.round(val).toString();
                                }}
                                style={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
