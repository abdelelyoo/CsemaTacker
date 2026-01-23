import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { formatCurrency, calculatePortfolioStats, calculateConcentrationRisk } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { TechnicalAnalysis } from './TradingViewWidgets';
import { Ghost, Sparkles, TrendingUp, TrendingDown, ArrowRight, Loader2, BrainCircuit, Target, ArrowLeftRight, Calculator, Sigma, Info, Radar, Activity, Scale, Quote, Wallet, AlertTriangle } from 'lucide-react';

interface LabProps {
    trades: Trade[];
    currentPrices: Record<string, number>;
}

type AnalysisMode = 'TRANSACTIONS' | 'AGGREGATE' | 'RISK_TECHNICALS';
type TransactionSide = 'EXIT' | 'ENTRY';

// Helper for TradingView symbols
const getTVSymbol = (ticker: string) => {
    // Manual overrides for known discrepancies on CSE
    const map: Record<string, string> = {
        'TGC': 'CSEMA:TGCC',
        'GTM': 'CSEMA:SGTM',
        'ATW': 'CSEMA:ATW',
        'IAM': 'CSEMA:IAM',
        'VCN': 'CSEMA:VCN', 
        'MSA': 'CSEMA:MSA',
        'DHO': 'CSEMA:DHO',
        'NKL': 'CSEMA:NKL',
        'HPS': 'CSEMA:HPS',
        'AKT': 'CSEMA:AKT',
        'RIS': 'CSEMA:RIS',
        'STR': 'CSEMA:STR',
        'FBR': 'CSEMA:FBR',
        'BOA': 'CSEMA:BOA',
        'SNA': 'CSEMA:SNA',
        'DYT': 'CSEMA:DYT'
    };
    return map[ticker] || `CSEMA:${ticker}`;
};

export const Lab: React.FC<LabProps> = ({ trades, currentPrices }) => {
    const [view, setView] = useState<AnalysisMode>('AGGREGATE'); 
    const [side, setSide] = useState<TransactionSide>('EXIT');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Calculate Portfolio Stats for Risk Analysis
    const { positions, summary } = useMemo(() => calculatePortfolioStats(trades, currentPrices), [trades, currentPrices]);
    const { hhi, level: concentrationLevel } = useMemo(() => calculateConcentrationRisk(positions), [positions]);

    // Active holdings for Technical Analysis
    const activeHoldings = useMemo(() => positions.filter(p => p.qty > 0.001).sort((a,b) => b.marketValue - a.marketValue), [positions]);

    // --- AGGREGATE ANALYSIS (VWAP) ---
    const aggregateData = useMemo(() => {
        const stats: Record<string, {
            ticker: string;
            buyQty: number;
            buySum: number;
            sellQty: number;
            sellSum: number;
            currentPrice: number;
        }> = {};

        trades.forEach(t => {
            if (!stats[t.ticker]) {
                stats[t.ticker] = {
                    ticker: t.ticker,
                    buyQty: 0,
                    buySum: 0,
                    sellQty: 0,
                    sellSum: 0,
                    currentPrice: currentPrices[t.ticker] || 0
                };
            }
            if (t.type === 'Achat') {
                stats[t.ticker].buyQty += t.qty;
                stats[t.ticker].buySum += t.qty * t.price;
            } else {
                stats[t.ticker].sellQty += t.qty;
                stats[t.ticker].sellSum += t.qty * t.price;
            }
        });

        return Object.values(stats).map(s => {
            const buyVWAP = s.buyQty > 0 ? s.buySum / s.buyQty : 0;
            const sellVWAP = s.sellQty > 0 ? s.sellSum / s.sellQty : 0;
            
            const entryAlpha = s.currentPrice > 0 && buyVWAP > 0 
                ? ((s.currentPrice - buyVWAP) / buyVWAP) * 100 
                : 0;

            const exitAlpha = s.currentPrice > 0 && sellVWAP > 0 
                ? ((sellVWAP - s.currentPrice) / s.currentPrice) * 100 
                : 0;

            return {
                ...s,
                buyVWAP,
                sellVWAP,
                entryAlpha,
                exitAlpha,
                hasBuys: s.buyQty > 0,
                hasSells: s.sellQty > 0
            };
        }).filter(s => s.currentPrice > 0 && (s.hasBuys || s.hasSells));
    }, [trades, currentPrices]);


    // --- TRANSACTION ANALYSIS (HINDSIGHT) ---
    const sells = trades.filter(t => t.type === 'Vente');
    const sellHindsightData = sells.map(trade => {
        const currentPrice = currentPrices[trade.ticker] || 0;
        if (currentPrice === 0) return null;
        const priceDiff = currentPrice - trade.price;
        const valueDiff = priceDiff * trade.qty; 
        return {
            ...trade,
            currentPrice,
            missedGain: valueDiff, // + = Sold too early
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100
        };
    }).filter(Boolean).sort((a, b) => (b?.missedGain || 0) - (a?.missedGain || 0));

    const buys = trades.filter(t => t.type === 'Achat');
    const buyHindsightData = buys.map(trade => {
        const currentPrice = currentPrices[trade.ticker] || 0;
        if (currentPrice === 0) return null;
        const priceDiff = currentPrice - trade.price;
        const valueDiff = priceDiff * trade.qty;
        return {
            ...trade,
            currentPrice,
            valueCreated: valueDiff, // + = Good Entry
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100
        };
    }).filter(Boolean).sort((a, b) => (b?.valueCreated || 0) - (a?.valueCreated || 0));

    const totalMissedGains = sellHindsightData.reduce((acc, curr) => curr && curr.missedGain > 0 ? acc + curr.missedGain : acc, 0);
    const totalAvoidedLosses = sellHindsightData.reduce((acc, curr) => curr && curr.missedGain < 0 ? acc + Math.abs(curr.missedGain) : acc, 0);
    const totalValueCaptured = buyHindsightData.reduce((acc, curr) => curr && curr.valueCreated > 0 ? acc + curr.valueCreated : acc, 0);
    const totalEntryDrawdown = buyHindsightData.reduce((acc, curr) => curr && curr.valueCreated < 0 ? acc + Math.abs(curr.valueCreated) : acc, 0);


    const handleAiAnalysis = async () => {
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = "";
            const commonInstructions = `
                Format your response using clear Markdown:
                - Use '##' for section headers (e.g., ## Verdict).
                - Use '**' for bold text (e.g., **Key Stat**).
                - Use bullet points for lists.
                - Keep it concise, professional, yet witty.
            `;

            if (view === 'AGGREGATE') {
                 prompt = `
                    Perform a statistical deep dive on my trading execution (VWAP Analysis).
                    
                    My Buy Execution vs Current Prices (Entry Efficiency):
                    ${aggregateData.filter(d => d.hasBuys).map(d => `- ${d.ticker}: Avg Buy ${d.buyVWAP.toFixed(2)}, Now ${d.currentPrice}. Alpha: ${d.entryAlpha.toFixed(2)}%`).join('\n')}

                    My Sell Execution vs Current Prices (Exit Efficiency):
                    ${aggregateData.filter(d => d.hasSells).map(d => `- ${d.ticker}: Avg Sell ${d.sellVWAP.toFixed(2)}, Now ${d.currentPrice}. Alpha: ${d.exitAlpha.toFixed(2)}%`).join('\n')}

                    Task: Summarize my statistical edge. Do I add value via timing, or is my alpha random?
                    
                    Structure the response as:
                    ## Executive Summary
                    (One sentence verdict)
                    ## Statistical Edge
                    (Where I am winning)
                    ## Areas of Inefficiency
                    (Where I am losing value)
                    
                    ${commonInstructions}
                `;
            } else if (view === 'RISK_TECHNICALS') {
                prompt = `
                    Perform a mathematical risk audit of this portfolio.
                    
                    Money Management Stats:
                    - Win Rate: ${summary.winRate.toFixed(1)}%
                    - Profit Factor: ${summary.profitFactor.toFixed(2)}
                    - Kelly Criterion: ${summary.kellyPercent.toFixed(1)}% (Optimal Allocation)
                    
                    Concentration Risk (Herfindahl-Hirschman Index): ${hhi} (${concentrationLevel} Concentration).
                    
                    Active Holdings and Portfolio Weights:
                    ${activeHoldings.map(p => `- ${p.ticker}: ${formatCurrency(p.marketValue)}`).join('\n')}
                    
                    Task: Analyze the structural risk and my position sizing.
                    
                    Structure the response as:
                    ## Money Management Audit
                    (Critique of the Kelly Criterion vs actual position sizing)
                    ## Risk Profile
                    (Verdict on HHI and Concentration)
                    ## Mathematical Prescription
                    (Formula-based suggestion to optimize variance)

                    ${commonInstructions}
                `;
            } else {
                 const sidePrompt = side === 'EXIT' 
                    ? `Sales Analysis. Missed Gains: ${totalMissedGains}. Avoided Losses: ${totalAvoidedLosses}. Top Regrets: ${sellHindsightData?.slice(0,3).map(t => t?.ticker).join(', ')}.`
                    : `Buys Analysis. Value Captured: ${totalValueCaptured}. Drawdown: ${totalEntryDrawdown}. Top Snipes: ${buyHindsightData?.slice(0,3).map(t => t?.ticker).join(', ')}.`;
                
                prompt = `
                    Analyze these transactions (Hindsight).
                    ${sidePrompt}
                    
                    Structure:
                    ## Behavioral Diagnosis
                    (Am I emotional or rational?)
                    ## The Numbers
                    (Key stats interpretation)
                    ## Prescription
                    (How to fix behavior)

                    ${commonInstructions}
                `;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setAiAnalysis(response.text);
        } catch (error) {
            console.error(error);
            setAiAnalysis("## System Failure\nThe AI Quant is currently offline. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    // Custom Text Renderer for pretty AI output
    const renderFormattedText = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.trim().startsWith('##')) {
                return (
                    <h4 key={i} className="text-lg font-bold text-indigo-900 mt-5 mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                        {line.replace(/^##\s*/, '')}
                    </h4>
                );
            }
            if (line.trim().startsWith('-') || line.trim().startsWith('* ')) {
                const content = line.replace(/^[-*]\s*/, '');
                const boldParts = content.split(/(\*\*.*?\*\*)/g);
                return (
                    <li key={i} className="ml-4 list-disc text-slate-700 mb-1 pl-1 marker:text-indigo-400">
                        {boldParts.map((part, j) => 
                            part.startsWith('**') ? <strong key={j} className="text-indigo-800 font-semibold">{part.slice(2, -2)}</strong> : part
                        )}
                    </li>
                );
            }
            if (line.trim() === '') {
                return <div key={i} className="h-2"></div>;
            }
            
            const boldParts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={i} className="text-slate-700 leading-relaxed mb-2">
                    {boldParts.map((part, j) => 
                        part.startsWith('**') ? <strong key={j} className="text-indigo-800 font-semibold">{part.slice(2, -2)}</strong> : part
                    )}
                </p>
            );
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Mode Switcher */}
             <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 rounded-lg">
                        <BrainCircuit className="w-8 h-8 text-indigo-300" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">The Laboratory</h2>
                        <p className="text-slate-400 text-sm">Statistical & Behavioral Analysis</p>
                    </div>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                    <button 
                        onClick={() => { setView('AGGREGATE'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'AGGREGATE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Sigma className="w-4 h-4 inline mr-2" />
                        VWAP Alpha
                    </button>
                    <button 
                        onClick={() => { setView('RISK_TECHNICALS'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'RISK_TECHNICALS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Radar className="w-4 h-4 inline mr-2" />
                        Risk & Techs
                    </button>
                    <button 
                        onClick={() => { setView('TRANSACTIONS'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'TRANSACTIONS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Target className="w-4 h-4 inline mr-2" />
                        Hindsight Log
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {view === 'AGGREGATE' ? (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                             <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-indigo-600" />
                                    VWAP Execution Analysis
                                </h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                    Evaluating your <strong>Volume Weighted Average Price (VWAP)</strong> against current market levels. 
                                    This removes the noise of individual trades to show your true statistical edge per ticker.
                                </p>
                            </div>
                            <button 
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Quant Review
                            </button>
                        </div>
                        
                        {/* Enhanced AI Display */}
                        {aiAnalysis && (
                            <div className="mb-8 bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in relative">
                                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <BrainCircuit className="w-5 h-5" /> 
                                        Quant Intelligence Report
                                    </h4>
                                    <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                        Generated via Gemini
                                    </span>
                                </div>
                                <div className="p-8 bg-indigo-50/20">
                                    <div className="prose prose-sm max-w-none text-slate-600">
                                        {renderFormattedText(aiAnalysis)}
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200"></div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-100">
                                        <th className="p-4">Ticker</th>
                                        <th className="p-4 text-center">Current Price</th>
                                        <th className="p-4 text-center border-l border-slate-100">Avg Buy Price (VWAP)</th>
                                        <th className="p-4 text-right">Entry Alpha</th>
                                        <th className="p-4 text-center border-l border-slate-100">Avg Sell Price (VWAP)</th>
                                        <th className="p-4 text-right">Exit Alpha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {aggregateData.map((row) => (
                                        <tr key={row.ticker} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 font-bold text-slate-800">{row.ticker}</td>
                                            <td className="p-4 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                                                {formatCurrency(row.currentPrice)}
                                            </td>
                                            
                                            {/* BUY STATS */}
                                            <td className="p-4 text-center border-l border-slate-100">
                                                {row.hasBuys ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-mono text-slate-600">{formatCurrency(row.buyVWAP)}</span>
                                                        <span className="text-[10px] text-slate-400">Vol: {row.buyQty}</span>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                {row.hasBuys ? (
                                                    <div className={`font-bold ${row.entryAlpha > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {row.entryAlpha > 0 ? '+' : ''}{row.entryAlpha.toFixed(2)}%
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                                {row.hasBuys && <div className="text-[10px] text-slate-400">vs Current</div>}
                                            </td>

                                            {/* SELL STATS */}
                                            <td className="p-4 text-center border-l border-slate-100">
                                                {row.hasSells ? (
                                                     <div className="flex flex-col items-center">
                                                        <span className="font-mono text-slate-600">{formatCurrency(row.sellVWAP)}</span>
                                                        <span className="text-[10px] text-slate-400">Vol: {row.sellQty}</span>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                {row.hasSells ? (
                                                    <div className={`font-bold ${row.exitAlpha > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {row.exitAlpha > 0 ? '+' : ''}{row.exitAlpha.toFixed(2)}%
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                                {row.hasSells && <div className="text-[10px] text-slate-400">Saved Drop</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : view === 'RISK_TECHNICALS' ? (
                <div className="space-y-6">
                    {/* KELLY CRITERION SECTION */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg border border-indigo-700/50">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Wallet className="w-6 h-6 text-emerald-400" />
                                    Mathematical Money Management
                                </h3>
                                <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
                                    Using the <strong>Kelly Criterion</strong> to determine the mathematically optimal position size based on your edge.
                                </p>
                            </div>
                             <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                                 <span className="text-xs text-indigo-200 uppercase tracking-widest block">Expectancy (Avg Trade)</span>
                                 <span className={`text-xl font-mono font-bold ${summary.expectancy > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {summary.expectancy > 0 ? '+' : ''}{formatCurrency(summary.expectancy)}
                                 </span>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Win Rate */}
                             <div className="relative">
                                 <div className="flex items-center gap-2 mb-2">
                                     <Target className="w-4 h-4 text-indigo-300" />
                                     <span className="text-sm font-bold text-indigo-200">Probability (Win Rate)</span>
                                 </div>
                                 <div className="text-3xl font-bold">{summary.winRate.toFixed(1)}%</div>
                                 <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                     <div className="h-full bg-emerald-500" style={{ width: `${summary.winRate}%` }}></div>
                                 </div>
                             </div>

                             {/* Payoff Ratio */}
                             <div>
                                 <div className="flex items-center gap-2 mb-2">
                                     <Scale className="w-4 h-4 text-indigo-300" />
                                     <span className="text-sm font-bold text-indigo-200">Payoff Ratio (Win/Loss)</span>
                                 </div>
                                 <div className="text-3xl font-bold">{summary.profitFactor.toFixed(2)} <span className="text-sm text-indigo-400 font-normal">to 1</span></div>
                                 <p className="text-xs text-indigo-300 mt-1">
                                     Avg Win: {formatCurrency(summary.avgWin)} / Avg Loss: {formatCurrency(summary.avgLoss)}
                                 </p>
                             </div>

                             {/* Kelly Suggestion */}
                             <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                                 <div className="flex items-center gap-2 mb-1">
                                     <Calculator className="w-4 h-4 text-emerald-400" />
                                     <span className="text-xs font-bold text-emerald-300 uppercase">Optimal Kelly %</span>
                                 </div>
                                 <div className="text-3xl font-bold text-emerald-300">
                                     {summary.kellyPercent > 0 ? `${summary.kellyPercent.toFixed(1)}%` : '0%'}
                                 </div>
                                 <p className="text-xs text-emerald-200/70 mt-1">
                                     {summary.kellyPercent > 0 
                                         ? "Recommended capital allocation per trade to maximize growth." 
                                         : "Edge is negative. Reduce size or stop trading."}
                                 </p>
                             </div>
                        </div>
                    </div>

                    {/* HHI Analysis Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                         <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-indigo-600" />
                                    Portfolio Concentration (HHI)
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    The Herfindahl-Hirschman Index measures diversification mathematically. 
                                    Score: <strong>{hhi}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Analyze Risk
                            </button>
                        </div>
                        
                        <div className="relative pt-6 pb-2">
                             <div className="h-4 w-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 rounded-full"></div>
                             <div 
                                className="absolute top-2 w-0.5 h-12 bg-slate-800 border-x border-white"
                                style={{ left: `${Math.min((hhi / 5000) * 100, 100)}%` }}
                             >
                                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">
                                     {hhi}
                                 </div>
                             </div>
                             <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
                                 <span>0 (Perfect Diversification)</span>
                                 <span>1500 (Moderate)</span>
                                 <span>2500+ (Concentrated)</span>
                             </div>
                        </div>

                        {/* Enhanced AI Display for Risk */}
                        {aiAnalysis && (
                            <div className="mt-8 mb-2 bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in relative">
                                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Radar className="w-5 h-5" /> 
                                        Risk Audit Report
                                    </h4>
                                    <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                        Mathematical Analysis
                                    </span>
                                </div>
                                <div className="p-8 bg-indigo-50/20">
                                    <div className="prose prose-sm max-w-none text-slate-600">
                                        {renderFormattedText(aiAnalysis)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TradingView Technical Screener */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Technical Probability Audit
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Are your holdings mathematically trending up or down? These gauges summarize Oscillators (RSI, Stoch) and Moving Averages to determine the statistical probability of price direction.
                        </p>
                        
                        {activeHoldings.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400">
                                No active holdings to analyze.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeHoldings.map(p => (
                                    <div key={p.ticker} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                            <span className="font-bold text-slate-700">{p.ticker}</span>
                                            <span className="text-xs text-slate-400">Weight: {((p.marketValue / positions.reduce((sum,pos) => sum + pos.marketValue, 0)) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-[300px]">
                                            <TechnicalAnalysis 
                                                symbol={getTVSymbol(p.ticker)} 
                                                colorTheme="light" 
                                                height={300}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className={`rounded-xl p-6 text-white shadow-md transition-colors duration-500 ${side === 'EXIT' ? 'bg-violet-600' : 'bg-blue-600'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {side === 'EXIT' ? <Ghost className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                                    Hindsight Analysis
                                </h2>
                                <p className="opacity-80 text-sm mt-1">
                                    {side === 'EXIT' ? 'Analyzing Sells: Paper Hands vs Diamond Hands' : 'Analyzing Buys: Sniping vs FOMO'}
                                </p>
                            </div>
                            <button 
                                onClick={() => { setSide(prev => prev === 'EXIT' ? 'ENTRY' : 'EXIT'); setAiAnalysis(null); }}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                            >
                                <ArrowLeftRight className="w-3 h-3" />
                                Switch to {side === 'EXIT' ? 'Entries' : 'Exits'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                {side === 'EXIT' ? 'Opportunity Cost (Missed)' : 'Value Captured'}
                            </p>
                            <p className={`text-2xl font-bold mt-2 ${side === 'EXIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(side === 'EXIT' ? totalMissedGains || 0 : totalValueCaptured || 0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {side === 'EXIT' ? 'Gains missed by selling early' : 'Unrealized gains from good entries'}
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                {side === 'EXIT' ? 'Losses Avoided' : 'Drawdown (Overpaid)'}
                            </p>
                            <p className={`text-2xl font-bold mt-2 ${side === 'EXIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(side === 'EXIT' ? totalAvoidedLosses || 0 : totalEntryDrawdown || 0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {side === 'EXIT' ? 'Savings from timely exits' : 'Losses from buying too high'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-700">Transaction Log</h3>
                            <button 
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Commentary
                            </button>
                        </div>
                        
                        {/* Enhanced AI Display for Transactions */}
                        {aiAnalysis && (
                            <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden animate-fade-in relative">
                                <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center gap-2">
                                     <Quote className="w-4 h-4 text-indigo-500" />
                                     <h5 className="text-xs font-bold text-slate-500 uppercase">Trading Psychologist</h5>
                                </div>
                                <div className="p-5 text-sm text-slate-700 italic">
                                     {renderFormattedText(aiAnalysis)}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-100">
                                        <th className="p-3">Ticker</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-right">{side === 'EXIT' ? 'Sell Price' : 'Buy Price'}</th>
                                        <th className="p-3 text-right">Current</th>
                                        <th className="p-3 text-right">Verdict</th>
                                        <th className="p-3 text-right">Impact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {(side === 'EXIT' ? sellHindsightData : buyHindsightData)?.map((item, idx) => {
                                        if(!item) return null;
                                        const isBad = side === 'EXIT' ? (item.missedGain || 0) > 0 : (item.valueCreated || 0) < 0;
                                        const impactValue = side === 'EXIT' ? item.missedGain : item.valueCreated;
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-bold text-slate-700">{item.ticker}</td>
                                                <td className="p-3 text-center text-slate-500">{item.qty}</td>
                                                <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(item.currentPrice)}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isBad ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {side === 'EXIT' 
                                                            ? (isBad ? 'Sold Early' : 'Timed Well')
                                                            : (isBad ? 'Bought High' : 'Sniper Entry')
                                                        }
                                                    </span>
                                                </td>
                                                <td className={`p-3 text-right font-bold font-mono ${isBad ? 'text-amber-600' : 'text-emerald-600'}`}>
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
            )}
        </div>
    );
};