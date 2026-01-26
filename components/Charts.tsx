import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MonthlyMetric, TickerFrequency, Position } from '../types';
import { formatCurrency } from '../utils';

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 backdrop-blur-md p-3 border border-slate-200 rounded-xl shadow-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                        <span className="text-sm font-medium text-slate-700">{entry.name}:</span>
                        <span className="text-sm font-bold text-slate-900">{typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const VolumeChart: React.FC<{ data: MonthlyMetric[] }> = ({ data }) => {
    return (
        <div className="h-[400px] w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Monthly Trading Activity</h3>
                    <p className="text-xs text-slate-500">Volume breakdown by buy/sell execution</p>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(val) => `${val / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        content={({ payload }) => (
                            <div className="flex gap-4 justify-end mb-4">
                                {payload?.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                    <Bar dataKey="buys" name="Purchases" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="sells" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const AllocationPieChart: React.FC<{ data: Position[] }> = ({ data }) => {
    const chartData = data
        .filter(p => p.qty > 0)
        .map(p => ({ name: p.ticker, value: p.totalCost }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="h-[400px] w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Asset Allocation</h3>
            <p className="text-xs text-slate-500 mb-6">Distribution by total cost basis</p>
            <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        content={({ payload }) => (
                            <ul className="space-y-2">
                                {payload?.map((entry: any, index: number) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        <span className="text-xs font-bold text-slate-700">{entry.value}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {((chartData[index].value / chartData.reduce((s, c) => s + c.value, 0)) * 100).toFixed(1)}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const FrequencyPieChart: React.FC<{ data: TickerFrequency[] }> = ({ data }) => {
    return (
        <div className="h-[400px] w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Trade Velocity</h3>
            <p className="text-xs text-slate-500 mb-6">Transaction count per asset</p>
            <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={100}
                        dataKey="count"
                        nameKey="ticker"
                        stroke="#fff"
                        strokeWidth={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};