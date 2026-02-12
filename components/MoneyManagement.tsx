import React, { useState, useEffect, useMemo } from 'react';
import { PortfolioSummary, Transaction } from '../types';
import { Calculator, TrendingUp, AlertTriangle, ShieldCheck, Target, Percent, Sparkles, RefreshCcw, PieChart, Info, BarChart3, Crosshair, GitGraph, Activity, TrendingDown, Brain, Timer, Scale } from 'lucide-react';
import { getKellyStrategyAdvice, analyzePortfolio } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

import { usePortfolioContext } from '../context/PortfolioContext';

interface MonteCarloStep {
  trade: number;
  median: number;
  best: number;
  worst: number;
}

interface MoneyManagementProps { }

export const MoneyManagement: React.FC = () => {
  const { portfolio, enrichedTransactions: transactions } = usePortfolioContext();
  // Stats State
  const [winRate, setWinRate] = useState<number>(50);
  const [avgWin, setAvgWin] = useState<number>(0);
  const [avgLoss, setAvgLoss] = useState<number>(0);
  const [capital, setCapital] = useState<number>(portfolio.totalValue + portfolio.cashBalance);

  // Custom Override State
  const [useCustom, setUseCustom] = useState(false);
  const [customWinRate, setCustomWinRate] = useState<string>("50");
  const [customRatio, setCustomRatio] = useState<string>("2.0");

  // AI Advice State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Monte Carlo State
  const [monteCarloData, setMonteCarloData] = useState<MonteCarloStep[]>([]);
  const [mcStats, setMcStats] = useState({ riskOfRuin: 0, medianOutcome: 0, worstCase: 0, bestCase: 0 });

  // Calculate Historical Stats from Transactions
  const historicalStats = useMemo(() => {
    const closedTrades = transactions.filter(t => t.RealizedPL !== undefined && t.RealizedPL !== null && t.RealizedPL !== 0);
    const wins = closedTrades.filter(t => (t.RealizedPL || 0) > 0);
    const losses = closedTrades.filter(t => (t.RealizedPL || 0) < 0);

    const totalTrades = closedTrades.length;
    const calcWinRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const totalWinAmt = wins.reduce((acc, curr) => acc + (curr.RealizedPL || 0), 0);
    const totalLossAmt = losses.reduce((acc, curr) => acc + Math.abs(curr.RealizedPL || 0), 0);

    const calcAvgWin = wins.length > 0 ? totalWinAmt / wins.length : 0;
    const calcAvgLoss = losses.length > 0 ? totalLossAmt / losses.length : 0;

    return {
      winRate: calcWinRate,
      avgWin: calcAvgWin,
      avgLoss: calcAvgLoss,
      totalTrades
    };
  }, [transactions]);

  // Calculate Risk Metrics (VaR, Sharpe, Volatility)
  const riskMetrics = useMemo(() => {
    if (!portfolio.history || portfolio.history.length < 2) return null;

    const returns = [];
    let peak = -Infinity;
    let maxDrawdown = 0;

    for (let i = 1; i < portfolio.history.length; i++) {
      const current = portfolio.history[i].value;
      const prev = portfolio.history[i - 1].value;

      // Simple return
      if (prev > 0) {
        returns.push((current - prev) / prev);
      }

      // Drawdown
      if (current > peak) peak = current;
      if (peak > 0) {
        const dd = (peak - current) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }
    }

    if (returns.length === 0) return null;

    // Avg Daily Return
    const sumRet = returns.reduce((a, b) => a + b, 0);
    const avgDailyRet = sumRet / returns.length;

    // Std Dev (Daily)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgDailyRet, 2), 0) / returns.length;
    const dailyVol = Math.sqrt(variance);

    // Annualized
    const annualVol = dailyVol * Math.sqrt(252);
    const annualRet = avgDailyRet * 252; // Simple approximation

    // VaR 95% (Daily) = 1.645 * dailyVol * PortfolioValue
    const var95Percent = 1.645 * dailyVol;
    const var95Value = portfolio.totalValue * var95Percent;

    // Sharpe (assuming 3% Risk Free Rate)
    const rf = 0.03;
    const sharpe = annualVol > 0 ? (annualRet - rf) / annualVol : 0;

    return {
      volatility: annualVol * 100, // %
      var95: var95Value,
      var95Percent: var95Percent * 100,
      maxDrawdown: maxDrawdown * 100,
      sharpe: sharpe
    };
  }, [portfolio.history, portfolio.totalValue]);

  // Calculate Trading Behavior (Hold Time, Day of Week, FIFO Reconstruction)
  const behaviorStats = useMemo(() => {
    // 1. Reconstruct Trades (FIFO) to get Hold Times
    const openPositions: { ticker: string; qty: number; date: Date; price: number }[] = [];
    const closedTrades: { ticker: string; openDate: Date; closeDate: Date; duration: number; pl: number; type: 'Win' | 'Loss' }[] = [];

    const sortedTxs = [...transactions].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    sortedTxs.forEach(tx => {
      const op = tx.Operation.toLowerCase();
      if (op === 'achat') {
        openPositions.push({ ticker: tx.Ticker, qty: Math.abs(tx.Qty), date: tx.parsedDate, price: tx.Price });
      } else if (op === 'vente') {
        let qtyToClose = Math.abs(tx.Qty);
        // Find matching open positions for this ticker
        // Simple FIFO: take from first available
        for (let i = 0; i < openPositions.length; i++) {
          if (openPositions[i].ticker === tx.Ticker && openPositions[i].qty > 0) {
            const matchedQty = Math.min(openPositions[i].qty, qtyToClose);

            // Calculate specific PL for this chunk to determine if it's part of a Win or Loss
            // Note: This is an approximation of PL using pure price diff, neglecting fees for simplicity of "Win/Loss" classification logic here
            // Real PL is stored in the transaction, but we need duration.

            const durationMs = tx.parsedDate.getTime() - openPositions[i].date.getTime();
            const durationDays = durationMs / (1000 * 60 * 60 * 24);

            // We use the Transaction's total realized PL to determine Win/Loss, 
            // but if a single sell closes multiple buys, we distribute duration weighted?
            // Simpler: Just classify based on price diff of this specific lot.
            const lotPL = (tx.Price - openPositions[i].price) * matchedQty;

            closedTrades.push({
              ticker: tx.Ticker,
              openDate: openPositions[i].date,
              closeDate: tx.parsedDate,
              duration: durationDays,
              pl: lotPL,
              type: lotPL >= 0 ? 'Win' : 'Loss'
            });

            openPositions[i].qty -= matchedQty;
            qtyToClose -= matchedQty;

            if (qtyToClose <= 0.0001) break;
          }
        }
      }
    });

    // 2. Aggregate Metrics
    const winners = closedTrades.filter(c => c.type === 'Win');
    const losers = closedTrades.filter(c => c.type === 'Loss');

    const avgHoldWin = winners.length > 0 ? winners.reduce((sum, c) => sum + c.duration, 0) / winners.length : 0;
    const avgHoldLoss = losers.length > 0 ? losers.reduce((sum, c) => sum + c.duration, 0) / losers.length : 0;

    // Profit Factor
    const grossWin = winners.reduce((sum, c) => sum + c.pl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, c) => sum + c.pl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 999 : 0);

    // Day of Week Analysis (0 = Sun, 1 = Mon...)
    const dayStats = [0, 0, 0, 0, 0, 0, 0].map(() => ({ pl: 0, count: 0 }));

    // Use the actual realized PL transactions for Day of Week accuracy
    transactions.filter(t => t.Operation === 'Vente' && t.RealizedPL).forEach(t => {
      const day = t.parsedDate.getDay();
      dayStats[day].pl += t.RealizedPL || 0;
      dayStats[day].count += 1;
    });

    const largestWin = Math.max(...winners.map(w => w.pl), 0);
    const largestLoss = Math.min(...losers.map(l => l.pl), 0);

    return {
      avgHoldWin,
      avgHoldLoss,
      profitFactor,
      largestWin,
      largestLoss,
      dayStats: dayStats.map((d, i) => ({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], pl: d.pl })),
      totalClosed: closedTrades.length
    };

  }, [transactions]);

  // Calculate HHI Stats
  const hhiStats = useMemo(() => {
    const totalVal = portfolio.totalValue;
    if (totalVal === 0) return { score: 0, status: 'N/A', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', description: 'No active holdings.' };

    let sumSquaredWeights = 0;
    portfolio.holdings.forEach(h => {
      // Weight as a percentage (e.g., 50 for 50%)
      const weight = (h.marketValue / totalVal) * 100;
      sumSquaredWeights += (weight * weight);
    });

    let status = 'Well Diversified';
    let color = 'text-emerald-600';
    let bg = 'bg-emerald-50';
    let progressColor = 'bg-emerald-500';
    let border = 'border-emerald-200';
    let description = 'Your portfolio is well diversified (HHI < 1500). Unsystematic risk is effectively minimized.';

    if (sumSquaredWeights > 2500) {
      status = 'Highly Concentrated';
      color = 'text-rose-600';
      bg = 'bg-rose-50';
      progressColor = 'bg-rose-500';
      border = 'border-rose-200';
      description = 'Your portfolio is highly concentrated (HHI > 2500). A single adverse event could significantly impact your equity.';
    } else if (sumSquaredWeights > 1500) {
      status = 'Moderate Concentration';
      color = 'text-amber-600';
      bg = 'bg-amber-50';
      progressColor = 'bg-amber-500';
      border = 'border-amber-200';
      description = 'Your portfolio shows moderate concentration (1500 < HHI < 2500). You have dominant positions driving performance.';
    }

    return { score: sumSquaredWeights, status, color, bg, border, description, progressColor };
  }, [portfolio]);

  // Calculate VWAP Stats
  const vwapStats = useMemo(() => {
    const data = portfolio.holdings
      .filter(h => h.allocation > 0)
      .map(h => {
        const edgePercent = h.averagePrice > 0 ? ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100 : 0;
        return {
          ticker: h.ticker,
          vwap: h.averagePrice,
          current: h.currentPrice,
          edge: edgePercent,
          weight: h.allocation
        };
      })
      .sort((a, b) => b.weight - a.weight);

    const totalWeight = data.reduce((sum, item) => sum + item.weight, 0);
    const executionScore = totalWeight > 0
      ? data.reduce((sum, item) => sum + (item.edge * item.weight), 0) / totalWeight
      : 0;

    return { data, executionScore };
  }, [portfolio]);

  // Sync state with history initially
  useEffect(() => {
    if (historicalStats.totalTrades > 0 && !useCustom) {
      setWinRate(historicalStats.winRate);
      setAvgWin(historicalStats.avgWin);
      setAvgLoss(historicalStats.avgLoss);
    }
  }, [historicalStats, useCustom]);

  // Reset advice when inputs change
  useEffect(() => {
    setAiAdvice(null);
  }, [useCustom, customWinRate, customRatio, capital]);

  // Run Monte Carlo Simulation
  useEffect(() => {
    const W = useCustom ? parseFloat(customWinRate) : winRate;
    const ratio = useCustom ? parseFloat(customRatio) : (avgLoss > 0 ? avgWin / avgLoss : 0);

    // Effective Win/Loss amounts for simulation
    let effectiveAvgLoss = avgLoss > 0 ? avgLoss : capital * 0.01; // Default 1% risk if no history
    let effectiveAvgWin = ratio * effectiveAvgLoss;

    if (capital <= 0 || effectiveAvgLoss <= 0) return;

    const SIMULATIONS = 1000;
    const TRADES = 50;

    const finalEquities: number[] = [];
    const ruins: number = 0;

    const paths: number[][] = Array(SIMULATIONS).fill(0).map(() => [capital]);

    let ruinCount = 0;

    for (let sim = 0; sim < SIMULATIONS; sim++) {
      let currentEquity = capital;
      for (let t = 1; t <= TRADES; t++) {
        const isWin = Math.random() < (W / 100);
        if (isWin) {
          currentEquity += effectiveAvgWin;
        } else {
          currentEquity -= effectiveAvgLoss;
        }
        paths[sim][t] = currentEquity;
      }
      if (currentEquity <= 0) ruinCount++;
      finalEquities.push(currentEquity);
    }

    finalEquities.sort((a, b) => a - b);
    const median = finalEquities[Math.floor(SIMULATIONS * 0.5)];
    const worst = finalEquities[Math.floor(SIMULATIONS * 0.1)];
    const best = finalEquities[Math.floor(SIMULATIONS * 0.9)];
    const riskOfRuin = (ruinCount / SIMULATIONS) * 100;

    setMcStats({
      riskOfRuin,
      medianOutcome: median,
      worstCase: worst,
      bestCase: best
    });

    const chartData: MonteCarloStep[] = [];
    for (let t = 0; t <= TRADES; t++) {
      const stepValues = paths.map(p => p[t]).sort((a, b) => a - b);
      chartData.push({
        trade: t,
        median: stepValues[Math.floor(SIMULATIONS * 0.5)],
        worst: stepValues[Math.floor(SIMULATIONS * 0.1)],
        best: stepValues[Math.floor(SIMULATIONS * 0.9)]
      });
    }
    setMonteCarloData(chartData);

  }, [winRate, avgWin, avgLoss, capital, useCustom, customWinRate, customRatio]);


  const calculateKelly = () => {
    const W = (useCustom ? parseFloat(customWinRate) : winRate) / 100;
    let R = 0;
    if (useCustom) {
      R = parseFloat(customRatio);
    } else {
      R = avgLoss > 0 ? avgWin / avgLoss : 0;
    }
    if (R === 0) return 0;
    return W - ((1 - W) / R);
  };

  const kellyDecimal = calculateKelly();
  const kellyPercent = kellyDecimal * 100;
  const isPositiveEdge = kellyDecimal > 0;
  const formatMoney = (val: number) => val.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' });

  const handleRunAnalysis = async () => {
    setLoadingAdvice(true);
    const w = useCustom ? parseFloat(customWinRate) : winRate;
    const r = useCustom ? parseFloat(customRatio) : (avgLoss > 0 ? avgWin / avgLoss : 0);

    const result = await getKellyStrategyAdvice(
      w, r, kellyPercent, capital,
      hhiStats.score, hhiStats.status, vwapStats.executionScore,
      mcStats, riskMetrics, behaviorStats
    );
    setAiAdvice(result.markdown);
    setLoadingAdvice(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" />
            Risk & Money Management
          </h2>
          <p className="text-slate-500">Advanced mathematical tools to optimize position sizing and portfolio risk.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setUseCustom(false)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!useCustom ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Historical Data
          </button>
          <button
            onClick={() => {
              setUseCustom(true);
              if (historicalStats.avgLoss > 0) {
                setCustomRatio((historicalStats.avgWin / historicalStats.avgLoss).toFixed(2));
                setCustomWinRate(historicalStats.winRate.toFixed(1));
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${useCustom ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Scenario Simulator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* INPUTS PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              Performance Metrics
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Total Equity (Capital)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">MAD</div>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Win Rate (%)</label>
                {useCustom ? (
                  <input
                    type="number"
                    value={customWinRate}
                    onChange={(e) => setCustomWinRate(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <div className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex justify-between">
                    <span>{winRate.toFixed(1)}%</span>
                    <span className="text-xs text-slate-400 bg-slate-200 px-2 rounded-full flex items-center">{historicalStats.totalTrades} Trades</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500">
                    {useCustom ? "Win/Loss Ratio (R)" : "Avg Win vs Avg Loss"}
                  </label>
                  {!useCustom && avgLoss > 0 && (
                    <span className="text-xs font-bold text-emerald-600">Ratio: {(avgWin / avgLoss).toFixed(2)}</span>
                  )}
                </div>

                {useCustom ? (
                  <input
                    type="number"
                    value={customRatio}
                    onChange={(e) => setCustomRatio(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                      <div className="text-[10px] text-emerald-600 font-semibold uppercase">Avg Win</div>
                      <div className="text-sm font-bold text-emerald-800">{formatMoney(avgWin)}</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg">
                      <div className="text-[10px] text-rose-600 font-semibold uppercase">Avg Loss</div>
                      <div className="text-sm font-bold text-rose-800">{formatMoney(avgLoss)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-blue-900 font-semibold text-sm mb-2 flex items-center gap-2">
              <Calculator size={16} />
              The Kelly Criterion
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Kelly calculates the exact portion of funds to allocate to maximize compound growth.
              <br /><br />
              <b>Formula:</b> <span className="font-mono bg-blue-100 px-1 rounded">f* = p - q/b</span>
              <br />
              Where <i>p</i> is win probability, <i>q</i> is loss probability, and <i>b</i> is the payoff ratio.
            </p>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kelly Result Card */}
          <div className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all ${isPositiveEdge ? 'bg-slate-900' : 'bg-rose-900'}`}>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <div className="text-slate-300 text-sm font-medium mb-1 uppercase tracking-wider">Optimal Full Kelly</div>
                <div className="text-5xl font-bold tracking-tight mb-2">
                  {isPositiveEdge ? `${kellyPercent.toFixed(2)}%` : '0.00%'}
                </div>
                <div className="text-emerald-400 font-medium text-lg">
                  {isPositiveEdge ? formatMoney(capital * kellyDecimal) : 'No Edge Detected'}
                </div>
              </div>

              <div className="h-32 w-px bg-white/20 hidden md:block"></div>

              <div className="flex-1 w-full md:w-auto">
                {!isPositiveEdge ? (
                  <div className="bg-white/10 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-rose-400 shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold text-rose-200">Negative Expectancy</h4>
                      <p className="text-sm text-rose-100 mt-1">
                        Based on these metrics, you do not have a statistical edge.
                        The Kelly Criterion suggests staying in cash (0% allocation) to avoid ruin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="text-sm text-slate-300">Half Kelly (Conservative)</div>
                      <div className="text-right">
                        <div className="font-bold text-xl">{((kellyPercent / 2)).toFixed(2)}%</div>
                        <div className="text-xs text-slate-400">{formatMoney(capital * (kellyDecimal / 2))}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="text-sm text-slate-300">Quarter Kelly (Safe)</div>
                      <div className="text-right">
                        <div className="font-bold text-xl">{((kellyPercent / 4)).toFixed(2)}%</div>
                        <div className="text-xs text-slate-400">{formatMoney(capital * (kellyDecimal / 4))}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Risk & Behavior Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Analysis Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="text-amber-600" size={20} />
                  <div>
                    <h3 className="font-semibold text-slate-800">Portfolio Risk</h3>
                    <p className="text-xs text-slate-500">Volatility & VaR</p>
                  </div>
                </div>
              </div>

              {riskMetrics ? (
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Volatility (Ann.)</div>
                    <div className="font-bold text-slate-800">{riskMetrics.volatility.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Sharpe Ratio</div>
                    <div className={`font-bold ${riskMetrics.sharpe > 1 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {riskMetrics.sharpe.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      VaR (95% Daily)
                      <Info size={10} className="text-slate-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="font-bold text-rose-600">{formatMoney(riskMetrics.var95)}</div>
                      <div className="text-xs text-rose-500">-{riskMetrics.var95Percent.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4">
                  Need 2+ days history for Risk Metrics.
                </div>
              )}
            </div>

            {/* Trading Behavior Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="text-purple-600" size={20} />
                  <div>
                    <h3 className="font-semibold text-slate-800">Trading Psychology</h3>
                    <p className="text-xs text-slate-500">Behavioral Patterns</p>
                  </div>
                </div>
              </div>

              {behaviorStats.totalClosed > 0 ? (
                <div className="space-y-3 flex-1">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Scale size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-600">Profit Factor</span>
                    </div>
                    <span className={`font-bold text-sm ${behaviorStats.profitFactor > 1.5 ? 'text-emerald-600' : behaviorStats.profitFactor < 1 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {behaviorStats.profitFactor.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                      <div className="text-[10px] text-emerald-600 mb-1">Avg Hold (Winners)</div>
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <Timer size={12} />
                        {behaviorStats.avgHoldWin.toFixed(1)}d
                      </div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-100">
                      <div className="text-[10px] text-rose-600 mb-1">Avg Hold (Losers)</div>
                      <div className="font-bold text-rose-800 flex items-center gap-1">
                        <Timer size={12} />
                        {behaviorStats.avgHoldLoss.toFixed(1)}d
                      </div>
                    </div>
                  </div>
                  {behaviorStats.avgHoldLoss > behaviorStats.avgHoldWin * 1.5 && (
                    <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Warning: Disposition Effect Detected
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4">
                  No closed trades to analyze behavior.
                </div>
              )}
            </div>
          </div>

          {/* P/L by Day Chart */}
          {behaviorStats.totalClosed > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm">P/L by Day of Week</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={behaviorStats.dayStats.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.day))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(val: number) => formatMoney(val)}
                    />
                    <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                      {behaviorStats.dayStats.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.day)).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monte Carlo Simulation Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitGraph className="text-purple-600" size={20} />
                <div>
                  <h3 className="font-semibold text-slate-800">Monte Carlo Simulation</h3>
                  <p className="text-xs text-slate-500">Probabilistic projection for next 50 trades (1000 runs)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500">Median Outcome</div>
                <div className="text-sm font-bold text-slate-800">{formatMoney(mcStats.medianOutcome)}</div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monteCarloData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="trade"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    stroke="#e2e8f0"
                    label={{ value: 'Trades', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    stroke="#e2e8f0"
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatMoney(value)}
                  />
                  <ReferenceLine y={capital} stroke="#94a3b8" strokeDasharray="3 3" />

                  <Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} dot={false} name="Best Case (90th)" />
                  <Line type="monotone" dataKey="median" stroke="#3b82f6" strokeWidth={2} dot={false} name="Median" />
                  <Line type="monotone" dataKey="worst" stroke="#ef4444" strokeWidth={2} dot={false} name="Worst Case (10th)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Risk of Ruin</div>
                <div className={`font-bold ${mcStats.riskOfRuin > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {mcStats.riskOfRuin.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Worst Case (10th %ile)</div>
                <div className="font-bold text-rose-600">{formatMoney(mcStats.worstCase)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Best Case (90th %ile)</div>
                <div className="font-bold text-emerald-600">{formatMoney(mcStats.bestCase)}</div>
              </div>
            </div>
          </div>

          {/* HHI Concentration Card */}
          <div className={`bg-white p-6 rounded-xl border shadow-sm ${hhiStats.border}`}>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart size={20} className={hhiStats.color} />
                  <h3 className="font-semibold text-slate-800">Portfolio Concentration (HHI)</h3>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-slate-800">{hhiStats.score.toFixed(0)}</span>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${hhiStats.bg} ${hhiStats.color}`}>
                    {hhiStats.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {hhiStats.description}
                </p>

                {/* Gauge Visualization */}
                <div className="relative pt-4 pb-6 select-none">
                  {/* Track Background */}
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex relative">
                    {/* Safe Zone (0 - 1500) -> 30% of 5000 */}
                    <div className="h-full bg-emerald-400 opacity-30 border-r border-white" style={{ width: '30%' }}></div>
                    {/* Moderate Zone (1500 - 2500) -> 20% of 5000 */}
                    <div className="h-full bg-amber-400 opacity-30 border-r border-white" style={{ width: '20%' }}></div>
                    {/* Danger Zone (2500 - 5000+) -> 50% of 5000 */}
                    <div className="h-full bg-rose-400 opacity-30" style={{ width: '50%' }}></div>
                  </div>

                  {/* Threshold Lines & Labels */}
                  <div className="absolute top-0 bottom-0 left-[30%] w-px bg-slate-300 h-5 mt-2"></div>
                  <div className="absolute top-6 left-[30%] -translate-x-1/2 text-[9px] text-slate-400 font-medium">1500</div>

                  <div className="absolute top-0 bottom-0 left-[50%] w-px bg-slate-300 h-5 mt-2"></div>
                  <div className="absolute top-6 left-[50%] -translate-x-1/2 text-[9px] text-slate-400 font-medium">2500</div>

                  {/* Current Score Marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-800 rounded-full shadow-md z-10 transition-all duration-1000 flex items-center justify-center"
                    style={{
                      left: `${Math.min((hhiStats.score / 5000) * 100, 100)}%`,
                      transform: 'translate(-50%, -50%)' // Center the dot
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
                  </div>

                  {/* Current Value Tooltip style label above marker */}
                  <div
                    className="absolute -top-3 transition-all duration-1000"
                    style={{
                      left: `${Math.min((hhiStats.score / 5000) * 100, 100)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${hhiStats.score < 1500 ? 'bg-emerald-500' : hhiStats.score < 2500 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                      {hhiStats.score.toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span className="text-emerald-600">Diversified</span>
                  <span className="text-amber-600">Moderate</span>
                  <span className="text-rose-600">Concentrated</span>
                </div>

              </div>

              <div className="w-full md:w-56 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-center">
                <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
                  <Info size={14} className="text-blue-500" />
                  HHI Interpretation
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Diversified</span>
                      <span className="text-emerald-600 font-bold">&lt; 1,500</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Moderate</span>
                      <span className="text-amber-600 font-bold">1,500 - 2,500</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 w-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Concentrated</span>
                      <span className="text-rose-600 font-bold">&gt; 2,500</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 w-full"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed italic">
                  "Herfindahl-Hirschman Index sums the squared allocation % of each holding."
                </div>
              </div>
            </div>
          </div>

          {/* VWAP Execution Analysis Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={20} />
                <div>
                  <h3 className="font-semibold text-slate-800">VWAP Execution Analysis</h3>
                  <p className="text-xs text-slate-500">Evaluating execution edge (Volume Weighted Average Price) against market levels.</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${vwapStats.executionScore >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                <Activity size={12} />
                Global Alpha: {vwapStats.executionScore > 0 ? '+' : ''}{vwapStats.executionScore.toFixed(2)}%
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-3 py-2 rounded-l-lg">Ticker</th>
                    <th className="px-3 py-2 text-right">Mkt Price</th>
                    <th className="px-3 py-2 text-right">Entry VWAP</th>
                    <th className="px-3 py-2 text-right">Entry Alpha</th>
                    <th className="px-3 py-2 text-right">Exit VWAP</th>
                    <th className="px-3 py-2 text-right rounded-r-lg">Exit Alpha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {portfolio.holdings.map((h) => {
                    const entryAlpha = h.buyVWAP > 0 ? ((h.currentPrice / h.buyVWAP) - 1) * 100 : 0;
                    const exitAlpha = h.sellVWAP > 0 ? ((h.sellVWAP / h.currentPrice) - 1) * 100 : 0;

                    return (
                      <tr key={h.ticker} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-4 font-bold text-slate-900">{h.ticker}</td>
                        <td className="px-3 py-4 text-right font-medium text-slate-600">
                          {h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div className="font-semibold text-slate-700">{h.buyVWAP > 0 ? h.buyVWAP.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</div>
                          {h.buyVolume > 0 && <div className="text-[10px] text-slate-400">Vol: {h.buyVolume.toLocaleString()}</div>}
                        </td>
                        <td className={`px-3 py-4 text-right font-bold ${entryAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.buyVWAP > 0 ? (
                            <>
                              <div>{entryAlpha > 0 ? '+' : ''}{entryAlpha.toFixed(2)}%</div>
                              <div className="text-[9px] font-normal text-slate-400">vs Current</div>
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div className="font-semibold text-slate-700">{h.sellVWAP > 0 ? h.sellVWAP.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</div>
                          {h.sellVolume > 0 && <div className="text-[10px] text-slate-400">Vol: {h.sellVolume.toLocaleString()}</div>}
                        </td>
                        <td className={`px-3 py-4 text-right font-bold ${exitAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.sellVWAP > 0 ? (
                            <>
                              <div>{exitAlpha > 0 ? '+' : ''}{exitAlpha.toFixed(2)}%</div>
                              <div className="text-[9px] font-normal text-slate-400">Saved Drop</div>
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>



          {/* AI Commentary Section */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-400" size={20} />
                <h3 className="font-semibold text-lg">AI Risk & Psychology Analyst</h3>
              </div>
              <button
                onClick={handleRunAnalysis}
                disabled={loadingAdvice}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCcw size={12} className={loadingAdvice ? "animate-spin" : ""} />
                {aiAdvice ? "Refresh Analysis" : "Generate Analysis"}
              </button>
            </div>

            {loadingAdvice ? (
              <div className="py-8 text-center text-slate-400 text-sm animate-pulse flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                Running Monte Carlo Simulations & Analyzing Behavioral Patterns...
              </div>
            ) : aiAdvice ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{aiAdvice}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic">
                Ask the AI to analyze your trading psychology, cognitive biases, and provide a strategic roadmap.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};