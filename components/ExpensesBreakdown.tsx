
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';

interface ExpensesBreakdownProps {
    onManage?: () => void;
}

export const ExpensesBreakdown: React.FC<ExpensesBreakdownProps> = ({ onManage }) => {
    const { portfolio } = usePortfolioContext();

    const data = [
        { name: 'Commissions', value: Math.abs(portfolio.totalTradingFees), color: '#fb7185' }, // Rose-400
        { name: 'Custody Fees', value: Math.abs(portfolio.totalCustodyFees), color: '#f43f5e' }, // Rose-500
        { name: 'Taxes', value: Math.abs(portfolio.netTaxImpact), color: '#e11d48' }, // Rose-600
    ].filter(d => d.value > 0);

    const totalExpenses = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="mb-2 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Fees & Taxes</h3>
                    <p className="text-[10px] text-slate-500">Cost Breakdown</p>
                </div>
                <button
                    onClick={onManage}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors border border-emerald-100"
                >
                    MANAGE
                </button>
            </div>

            <div className="flex-1 relative min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs font-bold border border-slate-700">
                                            <div className="text-slate-400 mb-1">{d.name}</div>
                                            <div className="font-mono text-rose-300">-{d.value.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD</div>
                                            <div className="text-[10px] text-slate-500 mt-1">{((d.value / totalExpenses) * 100).toFixed(1)}% of total</div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                    <span className="text-lg font-black text-rose-600">
                        {totalExpenses > 1000 ? `${(totalExpenses / 1000).toFixed(1)}k` : totalExpenses.toFixed(0)}
                    </span>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {data.map(item => (
                    <div key={item.name} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-slate-600 font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">-{item.value.toLocaleString('fr-MA', { maximumFractionDigits: 0 })}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
