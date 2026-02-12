
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, PieChart as PieIcon, Activity, Banknote, Info, Globe, TrendingUp, Radio, Check, Award, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, Area, XAxis, YAxis, CartesianGrid, ComposedChart, Line, Treemap, Brush } from 'recharts';
import { MarketData } from './MarketData';
import { usePortfolioContext } from '../context/PortfolioContext';
import { Sparkline } from './Sparkline';
import { FeesManager } from './FeesManager';
import { CapitalBridge } from './CapitalBridge';
import { ReturnsHeatmap } from './ReturnsHeatmap';
import { AllocationSunburst } from './AllocationSunburst';
import { CashFlowCard } from './CashFlowCard';
import { ExpensesBreakdown } from './ExpensesBreakdown';
import { FundamentalsPanel } from './FundamentalsPanel';
import { ValuationScreener } from './ValuationScreener';
import { QualityDashboard } from './QualityDashboard';
import { RiskDashboard } from './RiskDashboard';
import { motion, Variants } from 'framer-motion';


const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const StatCard = ({ title, value, subValue, isPositive, icon, sparklineData, color }: {
  title: string;
  value: string;
  subValue?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  sparklineData?: number[];
  color?: string;
}) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-200 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="flex flex-col">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</span>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      </div>
      <div className={`p-2.5 rounded-xl transition-colors ${color ? `bg-${color}-50` : 'bg-slate-50'}`}>
        {icon}
      </div>
    </div>

    <div className="flex items-end justify-between mt-2">
      <div className="flex flex-col">
        {subValue && (
          <div className={`flex items-center text-sm font-bold ${isPositive === undefined
            ? 'text-slate-500'
            : isPositive
              ? 'text-emerald-600'
              : 'text-rose-600'
            }`}>
            {isPositive !== undefined && (
              isPositive
                ? <ArrowUpRight size={16} className="mr-1" />
                : <ArrowDownRight size={16} className="mr-1" />
            )}
            <span>{subValue}</span>
          </div>
        )}
      </div>
      {sparklineData && (
        <div className="opacity-60 group-hover:opacity-100 transition-opacity">
          <Sparkline data={sparklineData} color={isPositive === false ? '#ef4444' : '#10b981'} />
        </div>
      )}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
const { portfolio, currentPrices, updateManualPrices: onUpdatePrices, isFeedConnected } = usePortfolioContext();
const [isMarketDataOpen, setIsMarketDataOpen] = useState(false);
const [isFeesManagerOpen, setIsFeesManagerOpen] = useState(false);
const [chartScale, setChartScale] = useState<'linear' | 'log'>('linear');
const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');

  const treemapData = useMemo(() => {
    const sectors: Record<string, { name: string; children: any[] }> = {};

    portfolio.holdings.forEach(h => {
      if (h.marketValue > 0) {
        if (!sectors[h.sector]) {
          sectors[h.sector] = { name: h.sector, children: [] };
        }
        sectors[h.sector].children.push({
          name: h.ticker,
          value: h.marketValue
        });
      }
    });

    return Object.values(sectors);
  }, [portfolio.holdings]);

  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};

    portfolio.holdings.forEach(h => {
      if (h.marketValue > 0) {
        sectors[h.sector] = (sectors[h.sector] || 0) + h.marketValue;
      }
    });

    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio.holdings]);

  // Generate Benchmark Data (Simulated MASI) merged with Portfolio History
  const filteredChartData = useMemo(() => {
    if (!portfolio.history.length || portfolio.history.length < 2) return [];

    let history = portfolio.history;

    if (timeRange === 'ALL') return history;

    const now = new Date();
    let cutoff = new Date();
    if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (timeRange === '3M') cutoff.setMonth(now.getMonth() - 3);
    else if (timeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
    else if (timeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);

    return history.filter(pt => new Date(pt.date) >= cutoff);
  }, [portfolio.history, timeRange]);

  const sparklineData = useMemo(() => {
    const history = portfolio.history.slice(-10);
    return history.map(h => h.value);
  }, [portfolio.history]);

  const netTaxDisplay = portfolio.netTaxImpact;
  const totalExpenses = -(portfolio.totalTradingFees + portfolio.totalCustodyFees + portfolio.netTaxImpact);
  const holdingTickers = useMemo(() => portfolio.holdings.map(h => h.ticker), [portfolio]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().substr(-2)}`;
  };

  const capitalSituation = portfolio.totalValue + portfolio.cashBalance;

  return (
    <motion.div
      className="space-y-6 pb-20 md:pb-0 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Market Data Modal */}
      {isMarketDataOpen && (
        <MarketData
          holdings={holdingTickers}
          currentPrices={currentPrices}
          onUpdatePrices={onUpdatePrices}
          onClose={() => setIsMarketDataOpen(false)}
        />
      )}
      {/* Fees Manager Modal */}
      {isFeesManagerOpen && (
        <FeesManager onClose={() => setIsFeesManagerOpen(false)} />
      )}

      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Portfolio Command
            <div className={`flex items-center space-x-2 text-[10px] font-black px-2 py-0.5 rounded-full border ${isFeedConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isFeedConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
              <span>{isFeedConnected ? 'LIVE FEED CONNECTED' : 'FEED OFFLINE'}</span>
            </div>
          </h1>
          <p className="text-sm text-slate-500 font-medium">Atlas Asset Management • Casablanca, MA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMarketDataOpen(true)}
            className="flex items-center space-x-2 text-xs font-bold bg-white text-slate-700 hover:text-white hover:bg-slate-900 px-5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-sm"
          >
            <Globe size={14} />
            <span>EXCHANGE PRICES</span>
          </button>
        </div>
      </motion.div>
          {/* Top Movers Bar */}
          <motion.div variants={itemVariants} className="bg-slate-900 rounded-2xl p-4 flex flex-wrap items-center gap-6 shadow-xl border border-slate-800 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50"></div>
            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Top Movers</span>
            </div>
            <div className="h-4 w-px bg-slate-700 hidden md:block relative z-10"></div>
            <div className="flex flex-wrap items-center gap-6 relative z-10 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {portfolio.holdings
                .sort((a, b) => Math.abs(b.unrealizedPLPercent) - Math.abs(a.unrealizedPLPercent))
                .slice(0, 6)
                .map(h => (
                  <div key={h.ticker} className="flex items-center gap-2 group/mover cursor-default">
                    <span className="text-xs font-bold text-slate-300 group-hover/mover:text-white transition-colors uppercase">{h.ticker}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${h.unrealizedPLPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {h.unrealizedPLPercent >= 0 ? '▲' : '▼'} {Math.abs(h.unrealizedPLPercent).toFixed(2)}%
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CashFlowCard />
        <ExpensesBreakdown onManage={() => setIsFeesManagerOpen(true)} />
        <AllocationSunburst />
      </motion.div>

      {/* Advanced Visualizations - Enterprise Level */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CapitalBridge />
        <ReturnsHeatmap />
      </motion.div>

      {/* Detailed Breakdown - REMOVED (Moved to Top) */}

      {/* Performance Chart */}
      {/* Performance Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Portfolio Performance
            </h2>
            <p className="text-xs text-slate-500 mt-1">Net Evolution vs Invested Capital</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-2">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${timeRange === r ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Scale Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setChartScale('linear')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${chartScale === 'linear' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Linear
              </button>
              <button
                onClick={() => setChartScale('log')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${chartScale === 'log' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Log
              </button>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {filteredChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  stroke="#cbd5e1"
                  minTickGap={30}
                />

                <YAxis
                  yAxisId="left"
                  scale={chartScale}
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  stroke="#cbd5e1"
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />

                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: number, name: string) => {
                    return [`${value.toLocaleString('fr-MA', { minimumFractionDigits: 0 })} MAD`, name === 'value' ? 'Total Equity' : 'Invested'];
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />

                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="invested"
                  name="Invested Capital"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="5 5"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="value"
                  name="Capital Situation"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />

                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#cbd5e1"
                  tickFormatter={formatDate}
                  fill="#f8fafc"
                />

              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Insufficient data history to display chart.
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
        {/* Holdings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex flex-col">
              <h2 className="font-bold text-slate-900 tracking-tight text-lg">Current Holdings</h2>
              <p className="text-xs text-slate-500 font-medium">{portfolio.holdings.length} Active Assets in Portfolio</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                Live Data
              </div>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-widest sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Asset</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-24">7D Trend</th>
                  <th className="px-6 py-4 text-right border-b border-slate-100">Pos.</th>
                  <th className="px-6 py-4 text-right border-b border-slate-100">
                    <div className="flex flex-col items-end">
                      <span>Avg Cost</span>
                      <span className="text-[9px] font-normal text-slate-400 normal-case">Break-Even</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right border-b border-slate-100">
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1">
                        Price
                        {isFeedConnected && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>}
                      </span>
                      <span className="text-[9px] font-normal text-slate-400 normal-case">Live Return</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right border-b border-slate-100">Exposure</th>
                  <th className="px-6 py-4 text-right border-b border-slate-100 whitespace-nowrap">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="hover:bg-slate-50/80 transition-all cursor-default group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{h.ticker}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{h.sector}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-20 opacity-70">
                        {/* Simulated Sparkline for row since we don't store per-ticker daily history efficiently yet */}
                        <Sparkline
                          data={[
                            Math.random(),
                            Math.random(),
                            Math.random(),
                            Math.random(),
                            Math.random(),
                            Math.random(),
                            h.unrealizedPLPercent > 0 ? 1 : 0
                          ]}
                          color={h.unrealizedPLPercent >= 0 ? '#10b981' : '#ef4444'}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">{h.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-slate-900">{h.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{h.breakEvenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-900">{h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-[10px] font-bold ${h.unrealizedPLPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.unrealizedPLPercent >= 0 ? '▲' : '▼'} {Math.abs(h.unrealizedPLPercent).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-900">{h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{((h.marketValue / portfolio.totalValue) * 100).toFixed(1)}% Weight</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${h.unrealizedPL >= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                        {h.unrealizedPL >= 0 ? '+' : ''}{h.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};