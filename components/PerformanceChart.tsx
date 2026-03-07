import React from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Line, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';

interface PerformanceChartProps {
  filteredChartData: any[];
  timeRange: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  chartScale: 'linear' | 'log';
  onTimeRangeChange: (range: '1M' | '3M' | '6M' | '1Y' | 'ALL') => void;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  filteredChartData,
  timeRange,
  chartScale,
  onTimeRangeChange
}) => {
  const { portfolio } = usePortfolioContext();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().substr(-2)}`;
  };

  const chartVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="flex-1"
      style={{ minHeight: '300px', height: '100%' }}
      variants={chartVariants}
      initial="hidden"
      animate="visible"
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#f1f5f9"
            className="opacity-50"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            hide={true}
            domain={['auto', 'auto']}
            scale={chartScale}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const returnVal = data.invested > 0 ? ((data.value - data.invested) / data.invested) * 100 : 0;
                
                return (
                  <div 
                    className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs backdrop-blur-sm"
                    role="tooltip"
                  >
                    <div className="font-bold mb-2 border-b border-slate-700 pb-1">
                      {new Date(data.date).toLocaleDateString()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">Net Worth:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {data.value.toLocaleString()} MAD
                        </span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-400">Invested:</span>
                        <span className="font-mono font-bold text-slate-300">
                          {data.invested.toLocaleString()} MAD
                        </span>
                      </div>
                      <div className="flex justify-between gap-6 pt-1 border-t border-slate-700">
                        <span className="text-slate-400">Total Return:</span>
                        <span className={`font-bold ${returnVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {returnVal >= 0 ? '+' : ''}{returnVal.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
            className="transition-all duration-500"
          />
          <Line
            type="monotone"
            dataKey="invested"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={1500}
            className="transition-all duration-500"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
};