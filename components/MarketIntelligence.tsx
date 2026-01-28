import React from 'react';
import {
    TrendingDown,
    TrendingUp,
    Zap,
    Globe,
    AlertCircle,
    TrendingUpDown,
    CheckCircle2,
    Newspaper
} from 'lucide-react';
import { MarketIntelligence } from '../types';
import { formatCurrency, formatNumber } from '../utils';

interface MarketIntelligenceProps {
    data: MarketIntelligence;
}

export const MarketIntelligenceComponent: React.FC<MarketIntelligenceProps> = ({ data }) => {
    const isBearish = data.sentiment === 'Bearish';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Sentiment Card */}
            <div className={`p-6 rounded-2xl shadow-sm border ${isBearish ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isBearish ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {isBearish ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${isBearish ? 'text-rose-900' : 'text-emerald-900'}`}>
                                Session: {data.date} ({data.sentiment})
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-sm font-bold ${isBearish ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    MASI: {data.masiVariation}%
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm text-slate-500 font-medium">
                                    Volume: {formatCurrency(data.totalVolume)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Highlights Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Newspaper className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800">BKGR Research Highlights</h4>
                    </div>
                    {data.highlights.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${item.category === 'Macro' ? 'bg-blue-50 text-blue-600' :
                                        item.category === 'Corporate' ? 'bg-violet-50 text-violet-600' :
                                            'bg-amber-50 text-amber-600'
                                    }`}>
                                    {item.category}
                                </span>
                                {item.tickers && (
                                    <div className="flex gap-1">
                                        {item.tickers.map(t => (
                                            <span key={t} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                ${t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <h5 className="font-bold text-slate-900 mb-1">{item.title}</h5>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.content}</p>
                        </div>
                    ))}
                </div>

                {/* Performance Sidebar */}
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h4 className="font-bold text-slate-800">Top Gains</h4>
                        </div>
                        <div className="space-y-3">
                            {data.topPerformers.map(p => (
                                <div key={p.ticker} className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700">{p.ticker}</span>
                                    <span className="font-bold text-emerald-600">+{p.change}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Performers */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingDown className="w-5 h-5 text-rose-500" />
                            <h4 className="font-bold text-slate-800">Top Losses</h4>
                        </div>
                        <div className="space-y-3">
                            {data.bottomPerformers.map(p => (
                                <div key={p.ticker} className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700">{p.ticker}</span>
                                    <span className="font-bold text-rose-600">{p.change}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-sm font-bold text-indigo-900">Research Alpha</h4>
                        </div>
                        <p className="text-xs text-indigo-700 leading-relaxed italic">
                            "The pharmaceutical sector shows relative strength despite the MASI downturn. Monitor MSA for a breakout if volume remains consistent."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
