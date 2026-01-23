import React, { useState } from 'react';
import { Trade } from '../types';
import { formatCurrency } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { Ghost, Sparkles, TrendingUp, TrendingDown, ArrowRight, Loader2, BrainCircuit, Target, ShoppingBag, ArrowLeftRight } from 'lucide-react';

interface LabProps {
    trades: Trade[];
    currentPrices: Record<string, number>;
}

type AnalysisMode = 'EXIT' | 'ENTRY';

export const Lab: React.FC<LabProps> = ({ trades, currentPrices }) => {
    const [mode, setMode] = useState<AnalysisMode>('EXIT');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // --- EXIT ANALYSIS (SELLS) ---
    const sells = trades.filter(t => t.type === 'Vente');
    const sellHindsightData = sells.map(trade => {
        const currentPrice = currentPrices[trade.ticker] || 0;
        if (currentPrice === 0) return null;

        const priceDiff = currentPrice - trade.price;
        const valueDiff = priceDiff * trade.qty; 

        return {
            ...trade,
            currentPrice,
            missedGain: valueDiff, // Positive = Sold too early, Negative = Sold well
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100
        };
    }).filter(Boolean).sort((a, b) => (b?.missedGain || 0) - (a?.missedGain || 0));

    const totalMissedGains = sellHindsightData.reduce((acc, curr) => curr && curr.missedGain > 0 ? acc + curr.missedGain : acc, 0);
    const totalAvoidedLosses = sellHindsightData.reduce((acc, curr) => curr && curr.missedGain < 0 ? acc + Math.abs(curr.missedGain) : acc, 0);

    // --- ENTRY ANALYSIS (BUYS) ---
    const buys = trades.filter(t => t.type === 'Achat');
    const buyHindsightData = buys.map(trade => {
        const currentPrice = currentPrices[trade.ticker] || 0;
        if (currentPrice === 0) return null;

        const priceDiff = currentPrice - trade.price;
        const valueDiff = priceDiff * trade.qty;

        return {
            ...trade,
            currentPrice,
            valueCreated: valueDiff, // Positive = Good Entry, Negative = Bad Entry
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100
        };
    }).filter(Boolean).sort((a, b) => (b?.valueCreated || 0) - (a?.valueCreated || 0));

    const totalValueCaptured = buyHindsightData.reduce((acc, curr) => curr && curr.valueCreated > 0 ? acc + curr.valueCreated : acc, 0);
    const totalEntryDrawdown = buyHindsightData.reduce((acc, curr) => curr && curr.valueCreated < 0 ? acc + Math.abs(curr.valueCreated) : acc, 0);


    const handleAiAnalysis = async () => {
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = "";

            if (mode === 'EXIT') {
                prompt = `
                    Analyze these stock sales and their outcomes based on current prices (Hindsight Analysis - Exits).
                    
                    Data Summary:
                    - Total Potential Gains Missed (Sold too early): ${formatCurrency(totalMissedGains || 0)}
                    - Total Losses Avoided (Sold at the right time): ${formatCurrency(totalAvoidedLosses || 0)}
                    
                    Top 3 "Regrets" (Sold too early):
                    ${sellHindsightData?.slice(0, 3).map(t => `- Sold ${t?.qty} ${t?.ticker} at ${t?.price}, now ${t?.currentPrice} (Missed ${formatCurrency(t?.missedGain || 0)})`).join('\n')}

                    Top 3 "Smart Moves" (Sold before drop):
                    ${sellHindsightData?.filter(t => (t?.missedGain || 0) < 0).sort((a, b) => (a?.missedGain || 0) - (b?.missedGain || 0)).slice(0, 3).map(t => `- Sold ${t?.qty} ${t?.ticker} at ${t?.price}, now ${t?.currentPrice} (Avoided Loss ${formatCurrency(Math.abs(t?.missedGain || 0))})`).join('\n')}

                    Role: You are a witty, slightly sarcastic trading psychologist.
                    Task: Give a 2-sentence summary on my selling capability. Am I a "Paper Hands" (panic seller) or a "Market Timer"? Be direct.
                `;
            } else {
                prompt = `
                    Analyze these stock purchases and their timing based on current prices (Hindsight Analysis - Entries).
                    
                    Data Summary:
                    - Total Value Captured (Good Entries): ${formatCurrency(totalValueCaptured || 0)}
                    - Total Overpayment/Drawdown (Bought too early/high): ${formatCurrency(totalEntryDrawdown || 0)}
                    
                    Top 3 "Sniper Entries" (Bought bottom/low):
                    ${buyHindsightData?.slice(0, 3).map(t => `- Bought ${t?.qty} ${t?.ticker} at ${t?.price}, now ${t?.currentPrice} (Gained ${formatCurrency(t?.valueCreated || 0)})`).join('\n')}

                    Top 3 "FOMO Entries" (Bought top/high):
                    ${buyHindsightData?.filter(t => (t?.valueCreated || 0) < 0).sort((a, b) => (a?.valueCreated || 0) - (b?.valueCreated || 0)).slice(0, 3).map(t => `- Bought ${t?.qty} ${t?.ticker} at ${t?.price}, now ${t?.currentPrice} (Drawdown ${formatCurrency(Math.abs(t?.valueCreated || 0))})`).join('\n')}

                    Role: You are a witty, slightly sarcastic trading psychologist.
                    Task: Give a 2-sentence summary on my BUYING capability. Do I have "FOMO" (buying tops) or am I a "Value Hunter"? Be direct.
                `;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setAiAnalysis(response.text);
        } catch (error) {
            console.error(error);
            setAiAnalysis("The AI is speechless at your trading performance (Error connecting).");
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(prev => prev === 'EXIT' ? 'ENTRY' : 'EXIT');
        setAiAnalysis(null); // Clear previous analysis
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-colors duration-500 ${mode === 'EXIT' ? 'bg-violet-900 shadow-violet-200' : 'bg-blue-900 shadow-blue-200'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    {mode === 'EXIT' ? <Ghost className="w-32 h-32" /> : <Target className="w-32 h-32" />}
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-yellow-300" />
                            The Hindsight Machine
                        </h2>
                        <button 
                            onClick={toggleMode}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold transition-all border border-white/20"
                        >
                            <ArrowLeftRight className="w-4 h-4" />
                            Switch to {mode === 'EXIT' ? 'Entries (Buys)' : 'Exits (Sells)'}
                        </button>
                    </div>
                    <p className={`mt-2 max-w-2xl text-lg ${mode === 'EXIT' ? 'text-violet-200' : 'text-blue-200'}`}>
                        {mode === 'EXIT' 
                            ? 'Analyzing your SELLS: Did you have "Diamond Hands" or did you panic sell?' 
                            : 'Analyzing your BUYS: Did you catch the bottom or did you FOMO the top?'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <TrendingUp className="w-24 h-24 text-rose-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        {mode === 'EXIT' ? 'Opportunity Cost (Missed Gains)' : 'Value Captured (Good Timing)'}
                    </p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                        {formatCurrency(mode === 'EXIT' ? totalMissedGains || 0 : totalValueCaptured || 0)}
                    </p>
                    <p className={`text-xs mt-2 font-medium ${mode === 'EXIT' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {mode === 'EXIT' ? 'Money left on the table by selling too early.' : 'Wealth created by timing your entries well.'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <TrendingDown className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        {mode === 'EXIT' ? 'Crisis Averted (Avoided Losses)' : 'Drawdown (Bought Too High)'}
                    </p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                        {formatCurrency(mode === 'EXIT' ? totalAvoidedLosses || 0 : totalEntryDrawdown || 0)}
                    </p>
                    <p className={`text-xs mt-2 font-medium ${mode === 'EXIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {mode === 'EXIT' ? 'Money saved by selling before a drop.' : 'Losses carried by buying too early.'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-indigo-600" />
                        {mode === 'EXIT' ? 'Exit Timing Analysis' : 'Entry Timing Analysis'}
                    </h3>
                    <button 
                        onClick={handleAiAnalysis}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {aiAnalysis ? 'Regenerate Analysis' : 'Ask AI Judge'}
                    </button>
                </div>

                {aiAnalysis && (
                    <div className="mb-8 bg-indigo-50 border border-indigo-100 p-6 rounded-xl text-indigo-900 leading-relaxed italic animate-fade-in relative">
                         <span className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">GEMINI SAYS</span>
                        "{aiAnalysis}"
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-100">
                                <th className="p-4">{mode === 'EXIT' ? 'Sold Ticker' : 'Bought Ticker'}</th>
                                <th className="p-4 text-center">Qty</th>
                                <th className="p-4 text-right">{mode === 'EXIT' ? 'Sell Price' : 'Buy Price'}</th>
                                <th className="p-4 text-center"><ArrowRight className="w-4 h-4 mx-auto text-slate-300"/></th>
                                <th className="p-4 text-right">Current Price</th>
                                <th className="p-4 text-right">Verdict</th>
                                <th className="p-4 text-right">Value Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {(mode === 'EXIT' ? sellHindsightData : buyHindsightData)?.map((item, idx) => {
                                if(!item) return null;
                                
                                // Logic for Bad/Good varies by mode
                                // EXIT: Bad if missedGain > 0 (Price went up after sell)
                                // ENTRY: Bad if valueCreated < 0 (Price went down after buy)
                                const isBad = mode === 'EXIT' ? (item.missedGain || 0) > 0 : (item.valueCreated || 0) < 0;
                                const impactValue = mode === 'EXIT' ? item.missedGain : item.valueCreated;
                                const percent = item.percentDiff;

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{item.ticker}</td>
                                        <td className="p-4 text-center text-slate-500">{item.qty}</td>
                                        <td className="p-4 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                                        <td className="p-4"></td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-800">{formatCurrency(item.currentPrice)}</td>
                                        <td className="p-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isBad ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {mode === 'EXIT' 
                                                    ? (isBad ? 'Sold Early' : 'Good Exit')
                                                    : (isBad ? 'Bought High' : 'Sniper Entry')
                                                }
                                            </span>
                                            <div className={`text-[10px] mt-1 ${isBad ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {mode === 'EXIT'
                                                    ? `${isBad ? '+' : ''}${percent.toFixed(2)}% since sale`
                                                    : `${isBad ? '' : '+'}${percent.toFixed(2)}% since buy`
                                                }
                                            </div>
                                        </td>
                                        <td className={`p-4 text-right font-bold font-mono ${isBad ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {isBad ? '-' : '+'}{formatCurrency(Math.abs(impactValue || 0))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};