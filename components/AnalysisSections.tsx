import React from 'react';
import { ArrowRight, CheckCircle, AlertTriangle, Trophy } from 'lucide-react';

export const IPOAnalysis: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* VCN Card */}
                <div className="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">VCN (Vicenne)</h3>
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded mt-1">IPO ALLOCATION</span>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-slate-500">IPO Price</p>
                             <p className="font-bold text-emerald-600">236.00 MAD</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700">Performance Highlight:</p>
                        <p>First Flip: Sold 23 shares @ 387 MAD</p>
                        <p className="text-emerald-600 font-bold flex items-center">
                            <ArrowRight className="w-3 h-3 mr-1"/> 64% Gain (Realized)
                        </p>
                        <p className="mt-2 text-xs text-slate-400">Current levels: ~450+ MAD</p>
                    </div>
                </div>

                {/* TGC Card */}
                <div className="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">TGC (TGCC SA)</h3>
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded mt-1">CAPITAL INCREASE</span>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-slate-500">Offer Price</p>
                             <p className="font-bold text-emerald-600">725.00 MAD</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                         <p className="font-semibold text-slate-700">Performance Highlight:</p>
                         <p>Active trading post-event.</p>
                         <p>Exits range: 924.00 - 963.00 MAD</p>
                         <p className="text-emerald-600 font-bold flex items-center">
                            <ArrowRight className="w-3 h-3 mr-1"/> ~30% Initial Pop + Dividends
                        </p>
                    </div>
                </div>

                 {/* GTM Card */}
                 <div className="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Trophy className="w-24 h-24 text-emerald-600" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">GTM (SGTM)</h3>
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded mt-1">BEST TRADE</span>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-slate-500">IPO Price</p>
                             <p className="font-bold text-emerald-600">380.00 MAD</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg relative z-10">
                         <p className="font-semibold text-slate-700">Performance Highlight:</p>
                         <p>Sold all 42 shares within 3 weeks.</p>
                         <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                             <span>Avg Exit Price:</span>
                             <span className="text-emerald-600 font-bold">~910 MAD</span>
                         </div>
                         <p className="text-xs text-emerald-600 font-semibold text-right">140% Return</p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-full shadow-sm text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-emerald-900 mb-2">Strategy Verification: Primary Market Sniper</h4>
                        <p className="text-emerald-800 text-sm leading-relaxed">
                            Your approach to primary market events is excellent. You secured allocations in key events (VCN & GTM IPOs, TGC Capital Increase). 
                            Specifically, holding VCN for the long term while actively trading around the core position, 
                            and perfectly timing the GTM exit (2-2.5x in 3 weeks), demonstrates a sophisticated understanding 
                            of market sentiment during public offerings and capital raisings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PatternAnalysis: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></span>
                    Pattern 1: The "VCN Obsession" 🔄
                </h3>
                <div className="flex items-start gap-4 bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-semibold text-amber-800">16+ Separate Transactions on VCN</p>
                        <p className="text-sm text-amber-700 mt-1">
                            While highly profitable, the frequency of trading (16+ trades) creates significant fee drag. 
                            Consider pyramiding into positions (adding to winners) rather than frequent in-out trading.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-2 h-8 bg-rose-500 rounded-full mr-3"></span>
                    Pattern 2: FOMO Entries (High Risk) ⚡
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="font-bold text-slate-700">TGC (24/07)</p>
                        <p className="text-sm text-rose-500">Bought @ 999.50 (Top tick)</p>
                        <p className="text-xs text-slate-400 mt-1">Never recovered to this price.</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="font-bold text-slate-700">HPS (25/09)</p>
                        <p className="text-sm text-rose-500">Loss of 13% in 4 days</p>
                     </div>
                </div>
                <p className="mt-4 text-sm text-slate-500 italic">
                    Problem: Chasing parabolic moves (TGC at 1000, HPS at 588) often leads to immediate drawdown or forced stop-loss exits.
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-2 h-8 bg-teal-500 rounded-full mr-3"></span>
                    Pattern 3: The "SNA Whipsaw" 🌀
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm text-slate-600">
                    <p><strong>Jan 8:</strong> Bought 190 shares</p>
                    <p><strong>Jan 9:</strong> Sold 95 shares (Small gain)</p>
                    <p><strong>Jan 12-13:</strong> Bought back in multiple tranches (Aggressive)</p>
                    <p><strong>Jan 16:</strong> Sold 55 shares</p>
                    <div className="mt-3 pt-3 border-t border-slate-200 text-rose-600 font-semibold">
                        Result: High volume turnover with minimal price capture. Broker fees are the main winner here.
                    </div>
                </div>
            </div>
        </div>
    );
};