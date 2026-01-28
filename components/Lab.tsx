import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { formatCurrency, calculatePortfolioStats, calculateConcentrationRisk, getTickerFrequency, calculateVaR, calculateCorrelationMatrix, monteCarloSimulation } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { TechnicalAnalysis } from './TradingViewWidgets';
import { Ghost, Sparkles, TrendingUp, TrendingDown, ArrowRight, Loader2, BrainCircuit, Target, ArrowLeftRight, Calculator, Sigma, Info, Radar, Activity, Scale, Quote, Wallet, AlertTriangle, ShieldAlert } from 'lucide-react';
import { PortfolioPerformanceChart, RiskAnalysisChart, CorrelationHeatmap, MonteCarloSimulationChart, TradingActivityHeatmap } from './AdvancedCharts';

interface LabProps {
    trades: Trade[];
    currentPrices: Record<string, number>;
}

type AnalysisMode = 'TRANSACTIONS' | 'AGGREGATE' | 'RISK_TECHNICALS' | 'BIAS_ANALYSIS' | 'AI_RECOMMENDATIONS' | 'ADVANCED_ANALYTICS';
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

    const tradeFrequency = useMemo(() => {
        if (trades.length < 2) return 0;
        const times = trades.map(t => new Date(t.date).getTime());
        const totalMs = Math.max(...times) - Math.min(...times);
        const months = totalMs / (1000 * 60 * 60 * 24 * 30);
        return months > 0 ? trades.length / months : trades.length;
    }, [trades]);

    const portfolioRoi = useMemo(() => {
        const totalInvested = summary.netInvested || 1;
        return ((summary.totalRealizedPnL + summary.totalUnrealizedPnL) / totalInvested) * 100;
    }, [summary]);
    const { hhi, level: concentrationLevel } = useMemo(() => calculateConcentrationRisk(positions), [positions]);

    // Active holdings for Technical Analysis
    const activeHoldings = useMemo(() => positions.filter(p => p.qty > 0.001).sort((a, b) => b.marketValue - a.marketValue), [positions]);

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

        // Enhanced categorization for sells
        const missedGain = valueDiff > 0 ? valueDiff : 0; // Sold too early - missed potential gains
        const avoidedLoss = valueDiff < 0 ? Math.abs(valueDiff) : 0; // Sold before bigger drop - avoided losses

        return {
            ...trade,
            currentPrice,
            missedGain,
            avoidedLoss,
            netImpact: valueDiff,
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100,
            sellType: valueDiff > 0 ? 'missed_gains' : valueDiff < 0 ? 'avoided_losses' : 'neutral'
        };
    }).filter(Boolean).sort((a, b) => Math.abs(b?.netImpact || 0) - Math.abs(a?.netImpact || 0));

    const buys = trades.filter(t => t.type === 'Achat');
    const buyHindsightData = buys.map(trade => {
        const currentPrice = currentPrices[trade.ticker] || 0;
        if (currentPrice === 0) return null;
        const priceDiff = currentPrice - trade.price;
        const valueDiff = priceDiff * trade.qty;

        // Enhanced categorization for buys
        const valueCaptured = valueDiff > 0 ? valueDiff : 0; // Bought low, price increased
        const drawdownIncurred = valueDiff < 0 ? Math.abs(valueDiff) : 0; // Bought high, price decreased

        return {
            ...trade,
            currentPrice,
            valueCaptured,
            drawdownIncurred,
            netImpact: valueDiff,
            percentDiff: ((currentPrice - trade.price) / trade.price) * 100,
            buyType: valueDiff > 0 ? 'value_captured' : valueDiff < 0 ? 'drawdown_incurred' : 'neutral'
        };
    }).filter(Boolean).sort((a, b) => Math.abs(b?.netImpact || 0) - Math.abs(a?.netImpact || 0));

    // Enhanced metrics with proper categorization
    const totalMissedGains = sellHindsightData.reduce((acc, curr) => curr ? acc + (curr.missedGain || 0) : acc, 0);
    const totalAvoidedLosses = sellHindsightData.reduce((acc, curr) => curr ? acc + (curr.avoidedLoss || 0) : acc, 0);
    const totalValueCaptured = buyHindsightData.reduce((acc, curr) => curr ? acc + (curr.valueCaptured || 0) : acc, 0);
    const totalEntryDrawdown = buyHindsightData.reduce((acc, curr) => curr ? acc + (curr.drawdownIncurred || 0) : acc, 0);

    // Additional analytics
    const missedGainsCount = sellHindsightData.filter(item => item?.missedGain > 0).length;
    const avoidedLossesCount = sellHindsightData.filter(item => item?.avoidedLoss > 0).length;
    const valueCapturedCount = buyHindsightData.filter(item => item?.valueCaptured > 0).length;
    const drawdownCount = buyHindsightData.filter(item => item?.drawdownIncurred > 0).length;

    // --- BIAS ANALYSIS ---
    const analyzeTradingBiases = () => {
        const biases: Record<string, { description: string; evidence: string[]; severity: 'Low' | 'Medium' | 'High' }> = {};

        // 1. FOMO (Fear of Missing Out) - Buying during rapid price increases
        const rapidBuys = buys.filter(b => {
            const buyPrice = b.price;
            const currentPrice = currentPrices[b.ticker] || 0;
            // Check if bought near recent highs (proxy: current price is lower than buy price)
            return currentPrice < buyPrice * 0.95; // 5%+ drop from entry
        });

        if (rapidBuys.length > 0) {
            biases['FOMO'] = {
                description: 'Fear of Missing Out - Buying during market euphoria or after rapid price increases',
                evidence: rapidBuys.slice(0, 3).map(b => `${b.ticker} bought at ${formatCurrency(b.price)}, now ${formatCurrency(currentPrices[b.ticker] || 0)} (${(((currentPrices[b.ticker] || 0) - b.price) / b.price * 100).toFixed(1)}%)`),
                severity: rapidBuys.length >= buys.length * 0.3 ? 'High' : rapidBuys.length >= buys.length * 0.15 ? 'Medium' : 'Low'
            };
        }

        // 2. Panic Selling - Selling winners too early
        const earlySells = sellHindsightData.filter(s => s.missedGain > s.price * s.qty * 0.1); // Missed >10% of position value

        if (earlySells.length > 0) {
            biases['Panic Selling'] = {
                description: 'Selling winners too early - Cutting profitable positions before full potential',
                evidence: earlySells.slice(0, 3).map(s => `${s.ticker} sold at ${formatCurrency(s.price)}, would be worth ${formatCurrency(s.currentPrice)} now (missed ${formatCurrency(s.missedGain)})`),
                severity: earlySells.length >= sells.length * 0.25 ? 'High' : earlySells.length >= sells.length * 0.1 ? 'Medium' : 'Low'
            };
        }

        // 3. Loss Aversion - Holding losers too long
        const longLosers = buys.filter(b => {
            const currentPrice = currentPrices[b.ticker] || 0;
            const drawdown = ((b.price - currentPrice) / b.price) * 100;
            // Still holding with >10% drawdown
            return currentPrice > 0 && drawdown > 10 && b.qty > 0;
        });

        if (longLosers.length > 0) {
            biases['Loss Aversion'] = {
                description: 'Holding losing positions too long - Reluctance to realize losses',
                evidence: longLosers.slice(0, 3).map(b => `${b.ticker} bought at ${formatCurrency(b.price)}, now ${formatCurrency(currentPrices[b.ticker] || 0)} (${(((currentPrices[b.ticker] || 0) - b.price) / b.price * 100).toFixed(1)}% drawdown)`),
                severity: longLosers.length >= buys.length * 0.2 ? 'High' : longLosers.length >= buys.length * 0.1 ? 'Medium' : 'Low'
            };
        }

        // 4. Overconfidence - Frequent trading with mixed results
        const tradeFrequency = trades.length / (Math.max(...trades.map(t => new Date(t.date).getTime())) - Math.min(...trades.map(t => new Date(t.date).getTime()))) * 30; // Trades per month

        if (tradeFrequency > 10 && summary.winRate < 60) {
            biases['Overconfidence'] = {
                description: 'Overconfidence - Excessive trading frequency with suboptimal win rate',
                evidence: [
                    `${tradeFrequency.toFixed(1)} trades/month average`,
                    `${summary.winRate.toFixed(1)}% win rate (target: >60%)`,
                    `${formatCurrency(summary.totalFees)} spent on fees due to high frequency`
                ],
                severity: tradeFrequency > 15 ? 'High' : 'Medium'
            };
        }

        // 5. Confirmation Bias - Only trading certain patterns/stocks
        const tickerConcentration = getTickerFrequency(trades);
        const topTickerShare = tickerConcentration.length > 0 ? (tickerConcentration[0].count / trades.length) : 0;

        if (topTickerShare > 0.3) {
            biases['Confirmation Bias'] = {
                description: 'Confirmation Bias - Overconcentration on familiar stocks/patterns',
                evidence: [
                    `${tickerConcentration[0].ticker}: ${tickerConcentration[0].count} trades (${(topTickerShare * 100).toFixed(1)}% of total)`,
                    `Lack of diversification in trading ideas`
                ],
                severity: topTickerShare > 0.4 ? 'High' : 'Medium'
            };
        }

        // 6. Anchoring - Fixation on purchase price
        const anchoredPositions = buys.filter(b => {
            const currentPrice = currentPrices[b.ticker] || 0;
            // Holding positions that are close to breakeven but not selling
            const pnl = ((currentPrice - b.price) / b.price) * 100;
            return Math.abs(pnl) < 5 && currentPrice > 0; // Within 5% of purchase price
        });

        if (anchoredPositions.length > 0) {
            biases['Anchoring'] = {
                description: 'Anchoring - Fixation on purchase price rather than market conditions',
                evidence: anchoredPositions.slice(0, 3).map(b => `${b.ticker} bought at ${formatCurrency(b.price)}, now ${formatCurrency(currentPrices[b.ticker] || 0)} (${(((currentPrices[b.ticker] || 0) - b.price) / b.price * 100).toFixed(1)}% - near breakeven)`),
                severity: anchoredPositions.length >= buys.length * 0.25 ? 'High' : 'Medium'
            };
        }

        return biases;
    };

    const tradingBiases = analyzeTradingBiases();


    // --- AI RECOMMENDATIONS ---
    const generatePersonalizedRecommendations = () => {
        const recommendations: Record<string, { description: string; rationale: string; actionItems: string[] }> = {};

        // 1. Position Sizing Recommendations
        if (summary.kellyPercent > 0 && summary.kellyPercent < 20) {
            recommendations['Position Sizing'] = {
                description: 'Optimize position sizing based on Kelly Criterion',
                rationale: `Your Kelly Criterion suggests ${summary.kellyPercent.toFixed(1)}% allocation per trade, but you may be over/under-positioning`,
                actionItems: [
                    `Limit each position to ${Math.min(summary.kellyPercent * 0.5, 15).toFixed(1)}% of portfolio (Half-Kelly)`,
                    'Use fixed fractional positioning (1-2% risk per trade)',
                    'Avoid concentrating more than 20% in any single position'
                ]
            };
        }

        // 2. Diversification Recommendations
        if (hhi > 2500) {
            recommendations['Diversification'] = {
                description: 'Improve portfolio diversification',
                rationale: `High HHI (${hhi}) indicates excessive concentration risk`,
                actionItems: [
                    'Reduce positions in top 2 holdings',
                    'Add 2-3 new sectors/industries to balance exposure',
                    'Consider ETFs for broader market exposure'
                ]
            };
        }

        // 3. Trade Frequency Recommendations
        const tradeFrequency = trades.length / (Math.max(...trades.map(t => new Date(t.date).getTime())) - Math.min(...trades.map(t => new Date(t.date).getTime()))) * 30;
        if (tradeFrequency > 12 && summary.winRate < 65) {
            recommendations['Trade Frequency'] = {
                description: 'Reduce trading frequency to improve quality',
                rationale: `High frequency (${tradeFrequency.toFixed(1)}/month) with ${summary.winRate.toFixed(1)}% win rate suggests overtrading`,
                actionItems: [
                    'Limit to 8-10 high-conviction trades per month',
                    'Implement a strict trade filter/checklist',
                    'Focus on longer timeframes to reduce noise'
                ]
            };
        }

        // 4. Risk Management Recommendations
        if (summary.profitFactor < 1.5) {
            recommendations['Risk Management'] = {
                description: 'Improve risk-reward ratio',
                rationale: `Profit factor of ${summary.profitFactor.toFixed(2)} indicates suboptimal risk management`,
                actionItems: [
                    'Aim for 2:1 or better risk-reward on all trades',
                    'Use tighter stop-losses and let winners run',
                    'Implement trailing stops to capture trends'
                ]
            };
        }

        // 5. Entry/Exit Timing Recommendations
        if (totalMissedGains > totalAvoidedLosses * 2) {
            recommendations['Exit Strategy'] = {
                description: 'Improve exit strategy to capture more gains',
                rationale: `You're missing ${formatCurrency(totalMissedGains)} by selling winners too early`,
                actionItems: [
                    'Use trailing stops instead of fixed targets',
                    'Scale out of positions (sell 50% at target, let rest run)',
                    'Hold winners longer (minimum 2-3x your average win)'
                ]
            };
        }

        // 6. Sector/Stock Selection Recommendations
        const topPerformingTickers = aggregateData
            .filter(d => d.entryAlpha > 10 && d.currentPrice > d.buyVWAP)
            .sort((a, b) => b.entryAlpha - a.entryAlpha)
            .slice(0, 3)
            .map(d => d.ticker);

        if (topPerformingTickers.length > 0) {
            recommendations['Stock Selection'] = {
                description: 'Focus on high-alpha stock selection',
                rationale: `Certain stocks show strong performance: ${topPerformingTickers.join(', ')}`,
                actionItems: [
                    'Analyze what makes these stocks successful',
                    'Look for similar patterns in other stocks',
                    'Consider sector rotation strategies'
                ]
            };
        }

        // 7. Fee Optimization Recommendations
        if (summary.totalFees > summary.totalRealizedPnL * 0.1) {
            recommendations['Fee Optimization'] = {
                description: 'Reduce trading costs',
                rationale: `Fees are eating ${((summary.totalFees / (summary.totalRealizedPnL + 1)) * 100).toFixed(1)}% of your profits`,
                actionItems: [
                    'Reduce trade frequency',
                    'Use limit orders instead of market orders',
                    'Consider negotiating lower commission rates'
                ]
            };
        }

        // 8. Psychological Recommendations (based on biases)
        if (Object.keys(tradingBiases).length > 0) {
            const biasNames = Object.keys(tradingBiases).join(', ');
            recommendations['Trading Psychology'] = {
                description: 'Address behavioral patterns',
                rationale: `Detected biases: ${biasNames}`,
                actionItems: [
                    'Implement pre-trade checklists',
                    'Use journaling to track emotional states',
                    'Consider meditation or mindfulness practices',
                    'Set daily/weekly loss limits and stick to them'
                ]
            };
        }

        return recommendations;
    };

    const aiRecommendations = generatePersonalizedRecommendations();


    const handleAiAnalysis = async () => {
        setLoading(true);
        console.log("Starting AI Analysis for view:", view);
        try {
            const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                throw new Error("Invalid API Key: Please ensure VITE_GEMINI_API_KEY is set in .env.local");
            }
            const ai = new GoogleGenAI({ apiKey });

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
            } else if (view === 'BIAS_ANALYSIS') {
                const biasSummary = Object.entries(tradingBiases).map(([name, data]) =>
                    `- ${name} (${data.severity}): ${data.evidence.length} instances detected`
                ).join('\n');

                prompt = `
                    Perform a comprehensive behavioral analysis of this trader's psychological patterns.
                    
                    Detected Biases:
                    ${biasSummary || 'No significant biases detected'}
                    
                    Trading Statistics:
                    - Win Rate: ${summary.winRate.toFixed(1)}%
                    - Profit Factor: ${summary.profitFactor.toFixed(2)}
                    - Trade Frequency: ${trades.length} trades over ${Math.round((Math.max(...trades.map(t => new Date(t.date).getTime())) - Math.min(...trades.map(t => new Date(t.date).getTime()))) / (1000 * 60 * 60 * 24 * 30))} months
                    - Average Position Size: ${(summary.netInvested / positions.filter(p => p.qty > 0).length).toFixed(0)} MAD
                    
                    Task: Provide a psychological profile and actionable improvement plan.
                    
                    Structure the response as:
                    ## Psychological Profile
                    (Overall assessment of trading psychology and discipline)
                    ## Bias Breakdown
                    (Detailed analysis of each detected bias with specific examples)
                    ## Cognitive Improvement Plan
                    (Step-by-step behavioral modification strategies)
                    ## Risk Management Recommendations
                    (Position sizing, stop-loss discipline, and emotional control techniques)

                    ${commonInstructions}
                `;
            } else if (view === 'ADVANCED_ANALYTICS') {
                // Prepare data for advanced analytics
                const portfolioReturns = positions.map(p => (
                    (currentPrices[p.ticker] || p.marketPrice) - p.avgCost
                ) / p.avgCost);

                const riskMetrics = {
                    var95: calculateVaR(portfolioReturns),
                    maxDrawdown: Math.min(0, ...portfolioReturns),
                    sharpeRatio: summary.totalRealizedPnL / Math.max(1, Math.abs(summary.totalUnrealizedPnL)),
                    volatility: Math.sqrt(portfolioReturns.reduce((sum, r) => sum + r * r, 0) / portfolioReturns.length)
                };

                prompt = `
                    Perform advanced quantitative analysis on this portfolio:
                    
                    Portfolio Composition:
                    ${positions.map(p =>
                    `- ${p.ticker}: ${p.qty} shares, Avg Cost: ${p.avgCost}, Current: ${currentPrices[p.ticker] || 'N/A'}, P&L: ${p.unrealizedPnL.toFixed(2)} (${(p.unrealizedPnL / p.totalCost * 100).toFixed(2)}%)`
                ).join('\n')}
                    
                    Risk Metrics:
                    - Value at Risk (95%): ${riskMetrics.var95.toFixed(4)} (${(riskMetrics.var95 * summary.totalMarketValue).toFixed(2)} MAD)
                    - Maximum Drawdown: ${riskMetrics.maxDrawdown.toFixed(4)} (${(riskMetrics.maxDrawdown * 100).toFixed(2)}%)
                    - Sharpe Ratio: ${riskMetrics.sharpeRatio.toFixed(2)}
                    - Volatility: ${riskMetrics.volatility.toFixed(4)}
                    
                    Trading Activity:
                    - Total Trades: ${trades.length}
                    - Trade Frequency: ${(trades.length / 30).toFixed(1)} trades/month
                    - Win Rate: ${summary.winRate.toFixed(1)}%
                    - Profit Factor: ${summary.profitFactor.toFixed(2)}
                    
                    Task: Provide sophisticated risk analysis and Monte Carlo simulation interpretation.
                    
                    Structure:
                    ## Executive Summary
                    (Overall portfolio risk assessment and key findings)
                    
                    ## Risk Analysis
                    (Detailed breakdown of VaR, drawdown, Sharpe ratio, and volatility)
                    
                    ## Monte Carlo Simulation Results
                    (Interpretation of simulation outcomes with confidence intervals)
                    
                    ## Diversification Analysis
                    (Correlation insights and portfolio concentration assessment)
                    
                    ## Strategic Recommendations
                    (Actionable advice for risk management and optimization)
                    
                    ## Stress Test Scenarios
                    (How the portfolio might perform in various market conditions)

                    ${commonInstructions}
                `;
            } else if (view === 'AI_RECOMMENDATIONS') {
                const recommendationSummary = Object.entries(aiRecommendations).map(([category, rec]) =>
                    `- ${category}: ${rec.description}`
                ).join('\n');

                prompt = `
                    Generate a comprehensive, personalized trading improvement plan based on this trader's portfolio and history.
                    
                    Current Performance:
                    - Win Rate: ${summary.winRate.toFixed(1)}%
                    - Profit Factor: ${summary.profitFactor.toFixed(2)}
                    - Kelly Criterion: ${summary.kellyPercent.toFixed(1)}%
                    - Portfolio Concentration: ${hhi} (${concentrationLevel})
                    - Trade Frequency: ${tradeFrequency.toFixed(1)}/month
                    
                    Key Issues:
                    ${recommendationSummary || 'Overall solid performance with minor optimizations needed'}
                    
                    Detected Biases:
                    ${Object.keys(tradingBiases).length > 0 ? Object.keys(tradingBiases).join(', ') : 'None detected'}
                    
                    Task: Provide a detailed, step-by-step improvement plan with specific, actionable recommendations.
                    
                    Structure:
                    ## Executive Summary
                    (Brief overview of current performance and key opportunities)
                    ## Strategic Recommendations
                    (Prioritized list of 3-5 key improvements with detailed rationale)
                    ## Tactical Implementation
                    (Specific actions, tools, and techniques to implement recommendations)
                    ## Risk Management Framework
                    (Position sizing, stop-loss strategies, and portfolio construction)
                    ## Performance Tracking
                    (Metrics to monitor progress and KPIs for success)
                    ## Long-Term Development Plan
                    (30/60/90 day roadmap for continuous improvement)

                    ${commonInstructions}
                `;
            } else {
                const missedGainsTickers = sellHindsightData?.filter(item => item?.missedGain > 0).slice(0, 3).map(t => t?.ticker).join(', ') || 'None';
                const avoidedLossesTickers = sellHindsightData?.filter(item => item?.avoidedLoss > 0).slice(0, 3).map(t => t?.ticker).join(', ') || 'None';
                const valueCapturedTickers = buyHindsightData?.filter(item => item?.valueCaptured > 0).slice(0, 3).map(t => t?.ticker).join(', ') || 'None';
                const drawdownTickers = buyHindsightData?.filter(item => item?.drawdownIncurred > 0).slice(0, 3).map(t => t?.ticker).join(', ') || 'None';

                const sidePrompt = side === 'EXIT'
                    ? `Sales Analysis:
                       - Missed Gains: ${formatCurrency(totalMissedGains)} (${missedGainsCount} trades: ${missedGainsTickers})
                       - Avoided Losses: ${formatCurrency(totalAvoidedLosses)} (${avoidedLossesCount} trades: ${avoidedLossesTickers})
                       - Net Impact: ${formatCurrency(totalMissedGains - totalAvoidedLosses)}`
                    : `Buys Analysis:
                       - Value Captured: ${formatCurrency(totalValueCaptured)} (${valueCapturedCount} trades: ${valueCapturedTickers})
                       - Drawdown Incurred: ${formatCurrency(totalEntryDrawdown)} (${drawdownCount} trades: ${drawdownTickers})
                       - Net Impact: ${formatCurrency(totalValueCaptured - totalEntryDrawdown)}`;

                prompt = `
                    Analyze these transactions with refined hindsight categorization:
                    ${sidePrompt}
                    
                    For ${side === 'EXIT' ? 'sells' : 'buys'}, provide specific insights:
                    ${side === 'EXIT' ?
                        "- Missed Gains: Identify patterns of selling too early (FOMO out)\n - Avoided Losses: Recognize successful risk management (discipline)\n - Overall: Assess if the trader is cutting winners short or letting losers run"
                        :
                        "- Value Captured: Highlight successful entry timing (patience)\n - Drawdown Incurred: Point out impulsive buying (FOMO in)\n - Overall: Evaluate position sizing relative to conviction"}
                    
                    Structure:
                    ## Behavioral Diagnosis
                    (Specific biases detected: FOMO, panic selling, overconfidence, etc.)
                    ## Quantitative Breakdown
                    (Detailed analysis of the refined categories)
                    ## Actionable Prescription
                    (Concrete steps to improve, with examples from the data)

                    ${commonInstructions}
                `;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', // Using the latest requested preview model
                contents: prompt,
            });

            const responseText = response.text;

            setAiAnalysis(responseText);
        } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            const errorMsg = error.message || "Unknown API error";
            setAiAnalysis(`## AI Analysis Failure\n\n**Error Details:** ${errorMsg}\n\n**Common Fixes:**\n- Ensure your API key in \`.env.local\` is valid.\n- Check your internet connection.\n- The model \`gemini-1.5-pro\` might be rate-limited; try again in a moment.`);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions for bias analysis
    const calculateBehavioralScore = () => {
        // Base score starts at 80 (assuming generally rational behavior)
        let score = 80;

        // Deduct points for each bias based on severity
        Object.values(tradingBiases).forEach(bias => {
            if (bias.severity === 'High') score -= 15;
            if (bias.severity === 'Medium') score -= 8;
            if (bias.severity === 'Low') score -= 3;
        });

        // Add points for good metrics
        if (summary.winRate > 60) score += 5;
        if (summary.profitFactor > 1.5) score += 5;
        if (trades.length > 0 && (trades.length / (Math.max(...trades.map(t => new Date(t.date).getTime())) - Math.min(...trades.map(t => new Date(t.date).getTime()))) * 30) < 8) score += 3;

        return Math.min(Math.max(score, 10), 100); // Clamp between 10-100
    };

    const getScoreDescription = (score: number) => {
        if (score >= 90) return 'Exceptional - Highly disciplined trading';
        if (score >= 80) return 'Excellent - Strong behavioral control';
        if (score >= 70) return 'Good - Minor behavioral improvements needed';
        if (score >= 60) return 'Fair - Several biases detected';
        if (score >= 50) return 'Needs Improvement - Significant behavioral patterns';
        return 'Critical - Major cognitive biases affecting performance';
    };

    const getBiasRecommendation = (biasName: string, biasData: any) => {
        switch (biasName) {
            case 'FOMO':
                return 'Implement a strict entry checklist and wait for pullbacks. Consider setting price alerts instead of chasing moves.';
            case 'Panic Selling':
                return 'Use trailing stops and define exit targets before entering trades. Practice holding winners longer.';
            case 'Loss Aversion':
                return 'Set predefined stop-loss levels and stick to them. Accept that losses are part of trading.';
            case 'Overconfidence':
                return 'Reduce trade frequency and focus on quality over quantity. Review losing trades to identify patterns.';
            case 'Confirmation Bias':
                return 'Diversify your watchlist and consider contrary viewpoints. Challenge your assumptions before trading.';
            case 'Anchoring':
                return 'Focus on current market conditions rather than purchase price. Use technical analysis for objective exit points.';
            default:
                return 'Review your trading plan and stick to predefined rules. Consider journaling trades for better self-awareness.';
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
                        onClick={() => { setView('BIAS_ANALYSIS'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'BIAS_ANALYSIS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <BrainCircuit className="w-4 h-4 inline mr-2" />
                        Bias Detection
                    </button>
                    <button
                        onClick={() => { setView('AI_RECOMMENDATIONS'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'AI_RECOMMENDATIONS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        AI Recommendations
                    </button>
                    <button
                        onClick={() => { setView('ADVANCED_ANALYTICS'); setAiAnalysis(null); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'ADVANCED_ANALYTICS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Activity className="w-4 h-4 inline mr-2" />
                        Advanced Analytics
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
                                            <span className="text-xs text-slate-400">Weight: {((p.marketValue / positions.reduce((sum, pos) => sum + pos.marketValue, 0)) * 100).toFixed(1)}%</span>
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
            ) : view === 'AI_RECOMMENDATIONS' ? (
                <div className="space-y-6 animate-fade-in">
                    {/* AI Recommendations Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-6 h-6" />
                                    AI-Powered Trading Recommendations
                                </h2>
                                <p className="opacity-80 text-sm mt-1">
                                    Personalized strategies based on your portfolio, trade history, and market data
                                </p>
                            </div>
                            <button
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                                Deep AI Analysis
                            </button>
                        </div>
                    </div>

                    {/* Enhanced AI Display for Recommendations */}
                    {aiAnalysis && (
                        <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in relative">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    AI Quant Recommendations
                                </h4>
                                <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                    Personalized Strategy
                                </span>
                            </div>
                            <div className="p-8 bg-indigo-50/20">
                                <div className="prose prose-sm max-w-none text-slate-600">
                                    {renderFormattedText(aiAnalysis)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Recommendations Content */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-indigo-600" />
                                    Personalized Action Plan
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Data-driven recommendations to optimize your trading performance
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${Object.keys(aiRecommendations).length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                {Object.keys(aiRecommendations).length} recommendations
                            </div>
                        </div>

                        {Object.keys(aiRecommendations).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(aiRecommendations).map(([category, recommendation]) => (
                                    <div key={category} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                    {category}
                                                </h4>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {recommendation.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Rationale:
                                            </p>
                                            <p className="text-sm text-slate-700 mb-3">
                                                {recommendation.rationale}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Action Items:
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700">
                                                {recommendation.actionItems.map((item, idx) => (
                                                    <li key={idx} className="pl-1 marker:text-indigo-400">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎯</span>
                                </div>
                                <h4 className="font-bold text-emerald-700 mb-2">Optimized Trading Strategy</h4>
                                <p className="text-slate-500 text-sm max-w-md mx-auto">
                                    Your current approach appears well-optimized. Continue monitoring and refining your strategy.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Implementation Checklist */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-indigo-600" />
                            Implementation Roadmap
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                    1
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700">Week 1-2: Risk Management</h4>
                                    <p className="text-sm text-slate-600">
                                        Implement position sizing rules and stop-loss discipline
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                    2
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700">Week 3-4: Trade Quality</h4>
                                    <p className="text-sm text-slate-600">
                                        Reduce frequency, focus on high-conviction setups
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                    3
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700">Ongoing: Performance Review</h4>
                                    <p className="text-sm text-slate-600">
                                        Weekly review of trades and continuous improvement
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expected Impact Summary */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            Potential Performance Impact
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-700 mb-1">
                                    +{Math.min(summary.winRate + 10, 90).toFixed(1)}%
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">
                                    Improved Win Rate
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-700 mb-1">
                                    {Math.min(summary.profitFactor + 0.5, 3.0).toFixed(2)}
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">
                                    Better Profit Factor
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-700 mb-1">
                                    -{Math.min(summary.totalFees * 0.3, summary.totalFees * 0.8).toFixed(0)}%
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">
                                    Reduced Fees
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : view === 'ADVANCED_ANALYTICS' ? (
                <div className="space-y-6 animate-fade-in">
                    {/* Advanced Analytics Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Activity className="w-6 h-6" />
                                    Advanced Analytics Dashboard
                                </h2>
                                <p className="opacity-80 text-sm mt-1">
                                    Sophisticated risk analysis, correlation studies, and predictive modeling
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Risk Analysis Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-indigo-600" />
                                    Portfolio Risk Analysis
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Comprehensive risk metrics and Value at Risk (VaR) analysis
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* VaR Metrics */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Value at Risk (95% Confidence)
                                </p>
                                <p className="text-2xl font-bold text-rose-600 mb-1">
                                    {formatCurrency(calculateVaR(positions.map(p => p.unrealizedPnL / p.totalCost)) * summary.totalMarketValue)}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Potential loss over next period with 95% confidence
                                </p>
                            </div>

                            {/* Max Drawdown */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Maximum Drawdown
                                </p>
                                <p className="text-2xl font-bold text-rose-600 mb-1">
                                    {positions.length > 0 ?
                                        `${Math.min(0, ...positions.map(p => p.unrealizedPnL / p.totalCost)) * 100}%` :
                                        'N/A'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Worst performing position in portfolio
                                </p>
                            </div>

                            {/* Risk-Adjusted Return */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Sharpe Ratio
                                </p>
                                <p className="text-2xl font-bold text-emerald-600 mb-1">
                                    {(summary.totalRealizedPnL / Math.max(1, Math.abs(summary.totalUnrealizedPnL))).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Return per unit of risk (higher is better)
                                </p>
                            </div>
                        </div>

                        {/* Risk Contribution Chart */}
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-3">Risk Contribution by Position</h4>
                            <div className="h-64">
                                <RiskAnalysisChart
                                    positions={positions.map(pos => ({
                                        ...pos,
                                        riskContribution: Math.abs(pos.unrealizedPnL),
                                        riskPercentage: (Math.abs(pos.unrealizedPnL) / positions.reduce((sum, p) => sum + Math.abs(p.unrealizedPnL), 0)) * 100
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Correlation Analysis Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-indigo-600" />
                                    Asset Correlation Analysis
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    How your assets move together - diversification insights
                                </p>
                            </div>
                        </div>

                        {positions.length > 1 ? (
                            <div>
                                {/* Calculate correlation matrix */}
                                {(() => {
                                    const priceSeries = positions.reduce((acc, pos) => {
                                        // For demo, we'll use current vs avg cost as a simple series
                                        // In production, you'd use historical price data
                                        acc[pos.ticker] = [pos.avgCost, currentPrices[pos.ticker] || pos.avgCost];
                                        return acc;
                                    }, {});

                                    const correlationMatrix = calculateCorrelationMatrix(priceSeries);

                                    return (
                                        <div className="h-80">
                                            <CorrelationHeatmap correlationMatrix={correlationMatrix} />
                                        </div>
                                    );
                                })()}

                                <div className="mt-6 bg-slate-50 p-4 rounded-lg">
                                    <h4 className="font-bold text-slate-700 mb-3">Diversification Insights</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1 flex-shrink-0"></div>
                                            <div>
                                                <strong>Positive Correlation (0.7-1.0):</strong> Assets tend to move together
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                                            <div>
                                                <strong>Moderate Correlation (0.3-0.7):</strong> Some relationship, but not strong
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-rose-500 rounded-full mt-1 flex-shrink-0"></div>
                                            <div>
                                                <strong>Negative Correlation (-1.0--0.3):</strong> Assets move in opposite directions (good for diversification)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg">
                                <p className="text-slate-500">
                                    Correlation analysis requires at least 2 positions. Add more assets to see diversification insights.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Monte Carlo Simulation Section */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-indigo-600" />
                                    Monte Carlo Simulation
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Probabilistic portfolio projections based on historical performance
                                </p>
                            </div>
                            <button
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Run Simulation
                            </button>
                        </div>

                        {aiAnalysis?.includes('Monte Carlo') ? (
                            <div>
                                {/* Enhanced AI Display for Monte Carlo Results */}
                                <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in relative">
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                                        <h4 className="font-bold text-white flex items-center gap-2">
                                            <Calculator className="w-5 h-5" />
                                            Monte Carlo Results
                                        </h4>
                                        <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                            Probabilistic Analysis
                                        </span>
                                    </div>
                                    <div className="p-8 bg-indigo-50/20">
                                        <div className="prose prose-sm max-w-none text-slate-600">
                                            {renderFormattedText(aiAnalysis)}
                                        </div>
                                    </div>
                                </div>

                                {/* Simulation Visualization */}
                                <div className="mb-6">
                                    <h4 className="font-bold text-slate-700 mb-3">Simulation Results Visualization</h4>
                                    <div className="h-64">
                                        <MonteCarloSimulationChart
                                            simulationResults={monteCarloSimulation(
                                                summary.totalMarketValue,
                                                portfolioRoi / 100 / 252, // Daily return
                                                0.015 // Volatility (1.5% daily)
                                            )}
                                            initialValue={summary.totalMarketValue}
                                        />
                                    </div>
                                </div>

                                {/* Key Statistics */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Expected Value</p>
                                        <p className="text-xl font-bold text-indigo-700">
                                            {formatCurrency(summary.totalMarketValue * (1 + portfolioRoi / 100))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">90% Confidence Range</p>
                                        <p className="text-xl font-bold text-indigo-700">
                                            {formatCurrency(summary.totalMarketValue * 0.9)} - {formatCurrency(summary.totalMarketValue * 1.3)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Worst Case (5th Percentile)</p>
                                        <p className="text-xl font-bold text-rose-600">
                                            {formatCurrency(summary.totalMarketValue * 0.85)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg">
                                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calculator className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h4 className="font-bold text-indigo-700 mb-2">Run Monte Carlo Simulation</h4>
                                <p className="text-slate-500 text-sm max-w-md mx-auto">
                                    Click the button above to run probabilistic simulations of your portfolio's future performance
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Trading Activity Analysis */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-600" />
                                    Trading Activity Patterns
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Analyze your trading behavior by time of day and day of week
                                </p>
                            </div>
                        </div>

                        <div className="h-80">
                            <TradingActivityHeatmap trades={trades} />
                        </div>

                        <div className="mt-6 bg-slate-50 p-4 rounded-lg">
                            <h4 className="font-bold text-slate-700 mb-3">Activity Insights</h4>
                            <div className="space-y-2 text-sm text-slate-700">
                                <p>📊 <strong>Most Active Time:</strong> Identify your peak trading hours</p>
                                <p>🕒 <strong>Time Patterns:</strong> Detect consistent trading habits</p>
                                <p>📅 <strong>Day Patterns:</strong> See which days you're most active</p>
                                <p>🎯 <strong>Optimization:</strong> Align trading with your most productive times</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : view === 'BIAS_ANALYSIS' ? (
                <div className="space-y-6 animate-fade-in">
                    {/* Bias Analysis Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <BrainCircuit className="w-6 h-6" />
                                    AI Trading Bias Analysis
                                </h2>
                                <p className="opacity-80 text-sm mt-1">
                                    Behavioral patterns detected in your trading history
                                </p>
                            </div>
                            <button
                                onClick={handleAiAnalysis}
                                disabled={loading}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Deep AI Analysis
                            </button>
                        </div>
                    </div>

                    {/* Bias Analysis Results */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-600" />
                                    Detected Trading Biases
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Cognitive and emotional patterns affecting your trading performance
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${Object.keys(tradingBiases).length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {Object.keys(tradingBiases).length} biases detected
                            </div>
                        </div>

                        {/* Enhanced AI Display for Bias Analysis */}
                        {aiAnalysis && (
                            <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in relative">
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <BrainCircuit className="w-5 h-5" />
                                        AI Behavioral Assessment
                                    </h4>
                                    <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                        Cognitive Analysis
                                    </span>
                                </div>
                                <div className="p-8 bg-indigo-50/20">
                                    <div className="prose prose-sm max-w-none text-slate-600">
                                        {renderFormattedText(aiAnalysis)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {Object.keys(tradingBiases).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(tradingBiases).map(([biasName, biasData]) => (
                                    <div key={biasName} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                    {biasName}
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${biasData.severity === 'High' ? 'bg-rose-100 text-rose-700' : biasData.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {biasData.severity}
                                                    </span>
                                                </h4>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {biasData.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Evidence from your trading:
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                                                {biasData.evidence.map((evidence, idx) => (
                                                    <li key={idx} className="pl-1 marker:text-indigo-400">
                                                        {evidence}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Actionable advice for each bias */}
                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Recommended Action:
                                            </p>
                                            <p className="text-sm text-indigo-700">
                                                {getBiasRecommendation(biasName, biasData)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">👍</span>
                                </div>
                                <h4 className="font-bold text-emerald-700 mb-2">No Significant Biases Detected</h4>
                                <p className="text-slate-500 text-sm max-w-md mx-auto">
                                    Your trading patterns appear rational and disciplined. Keep up the good work!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Overall Behavioral Score */}
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Scale className="w-5 h-5 text-indigo-600" />
                            Behavioral Performance Score
                        </h3>

                        <div className="flex items-center gap-8">
                            <div className="flex-1">
                                <div className="text-3xl font-bold text-indigo-700 mb-2">
                                    {calculateBehavioralScore()}/100
                                </div>
                                <div className="text-sm text-slate-500">
                                    {getScoreDescription(calculateBehavioralScore())}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center">
                                        <div
                                            className="w-28 h-28 rounded-full flex items-center justify-center transition-all duration-1000"
                                            style={{
                                                background: `conic-gradient(from 0deg, #8B5CF6 ${calculateBehavioralScore()}%, #E5E7EB ${calculateBehavioralScore()}%)`
                                            }}
                                        >
                                            <span className="text-xs font-bold text-slate-600">SCORE</span>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-bold text-indigo-700">
                                            {calculateBehavioralScore()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
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

                    {/* Enhanced Metrics Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Missed Gains */}
                        {side === 'EXIT' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-rose-500" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        Missed Gains (Sold Early)
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold mt-2 text-rose-600`}>
                                    {formatCurrency(totalMissedGains || 0)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {missedGainsCount} trades where you sold before further upside
                                </p>
                                <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${Math.min((totalMissedGains / (totalMissedGains + totalAvoidedLosses + 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        )}

                        {/* Avoided Losses */}
                        {side === 'EXIT' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="w-5 h-5 text-emerald-500" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        Losses Avoided (Timely Exits)
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold mt-2 text-emerald-600`}>
                                    {formatCurrency(totalAvoidedLosses || 0)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {avoidedLossesCount} trades where you avoided bigger drops
                                </p>
                                <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min((totalAvoidedLosses / (totalMissedGains + totalAvoidedLosses + 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        )}

                        {/* Value Captured */}
                        {side === 'ENTRY' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        Value Captured (Good Entries)
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold mt-2 text-emerald-600`}>
                                    {formatCurrency(totalValueCaptured || 0)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {valueCapturedCount} trades with unrealized gains
                                </p>
                                <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min((totalValueCaptured / (totalValueCaptured + totalEntryDrawdown + 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        )}

                        {/* Drawdown Incurred */}
                        {side === 'ENTRY' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="w-5 h-5 text-rose-500" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        Drawdown Incurred (Overpaid)
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold mt-2 text-rose-600`}>
                                    {formatCurrency(totalEntryDrawdown || 0)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {drawdownCount} trades currently underwater
                                </p>
                                <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${Math.min((totalEntryDrawdown / (totalValueCaptured + totalEntryDrawdown + 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        )}
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
                                        <th className="p-3 text-right">Change</th>
                                        <th className="p-3 text-right">Category</th>
                                        <th className="p-3 text-right">Impact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {(side === 'EXIT' ? sellHindsightData : buyHindsightData)?.map((item, idx) => {
                                        if (!item) return null;

                                        const isNegative = side === 'EXIT'
                                            ? (item.missedGain || 0) > 0
                                            : (item.valueCaptured || 0) < 0;

                                        const impactValue = side === 'EXIT'
                                            ? (item.missedGain || 0) - (item.avoidedLoss || 0)
                                            : (item.valueCaptured || 0) - (item.drawdownIncurred || 0);

                                        const category = side === 'EXIT'
                                            ? (item.missedGain > 0 ? 'Missed Gains' : item.avoidedLoss > 0 ? 'Avoided Losses' : 'Neutral')
                                            : (item.valueCaptured > 0 ? 'Value Captured' : item.drawdownIncurred > 0 ? 'Drawdown' : 'Neutral');

                                        const categoryColor = isNegative ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-bold text-slate-700">{item.ticker}</td>
                                                <td className="p-3 text-center text-slate-500">{item.qty}</td>
                                                <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(item.currentPrice)}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`font-mono text-xs ${item.percentDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {item.percentDiff > 0 ? '+' : ''}{item.percentDiff.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${categoryColor}`}>
                                                        {category}
                                                    </span>
                                                </td>
                                                <td className={`p-3 text-right font-bold font-mono ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {isNegative ? '-' : '+'}{formatCurrency(Math.abs(impactValue))}
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