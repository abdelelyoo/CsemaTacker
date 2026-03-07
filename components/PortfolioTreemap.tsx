import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, Treemap as RechartsTreemap, Tooltip as RechartsTooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { useMetrics } from '../context/MetricsContext';
import { formatCurrency } from '../utils/helpers';

interface PortfolioTreemapProps {
  treemapData: any[];
  treemapMetric: string;
  onMetricChange: (metric: string) => void;
  marketData: Map<string, any>;
}

const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

const getMetricColor = (metric: string, value: number): string => {
  if (value === 0 || value === undefined || value === null) return '#cbd5e1';

  if (metric === 'roe') {
    if (value > 20) return '#86efac';
    if (value > 15) return '#4ade80';
    if (value > 10) return '#22c55e';
    if (value > 0) return '#16a34a';
    return '#fca5a5';
  }

  if (metric === 'pe_ratio') {
    if (value > 30) return '#fca5a5';
    if (value > 20) return '#fda4af';
    if (value > 0) return '#86efac';
    return '#cbd5e1';
  }

  if (metric === 'dividend_yield') {
    if (value > 4) return '#93c5fd';
    if (value > 2) return '#60a5fa';
    if (value > 0) return '#3b82f6';
    return '#cbd5e1';
  }

  if (metric === 'perf_1m') {
    if (value > 10) return '#86efac';
    if (value > 5) return '#4ade80';
    if (value > 0) return '#22c55e';
    if (value >= -5) return '#fca5a5';
    return '#f87171';
  }

  return '#cbd5e1';
};

const METRIC_CONFIG: Record<string, { label: string; short: string; good: string; bad: string }> = {
  roe: { label: 'Return on Equity', short: 'ROE', good: '>15%', bad: '<0%' },
  pe_ratio: { label: 'Price to Earnings', short: 'P/E', good: '<15', bad: '>25' },
  dividend_yield: { label: 'Dividend Yield', short: 'YIELD', good: '>3%', bad: '<0%' },
  perf_1m: { label: '1 Month Performance', short: '1M', good: '>5%', bad: '<-5%' }
};

const SimpleTreemapContent = ({ x, y, width, height, name, value, fill, metric, metricValue }: any) => {
  if (width < 35 || height < 35) return null;
  
  const textColor = '#000000';
  const fontSize = Math.max(9, Math.min(width / 5, 12));
  const metricFontSize = Math.max(8, Math.min(width / 6, 10));
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={3}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 2}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="700"
      >
        {name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill={textColor}
        fontSize={metricFontSize}
        fontWeight="700"
      >
        {typeof metricValue === 'number' ? `${metricValue > 0 ? '+' : ''}${metricValue.toFixed(1)}%` : 'N/A'}
      </text>
    </g>
  );
};

export const PortfolioTreemap: React.FC<PortfolioTreemapProps> = ({
  treemapData,
  treemapMetric,
  onMetricChange,
  marketData
}) => {
  const { portfolio } = usePortfolioContext();
  const { navigateToAnalysis } = useMetrics();
  const [viewMode, setViewMode] = useState<'treemap' | 'cards'>('cards');

  const config = METRIC_CONFIG[treemapMetric] || METRIC_CONFIG.roe;

  const sortedHoldings = useMemo(() => {
    return portfolio.holdings
      .filter(h => h.marketValue > 0)
      .map(h => {
        const stock = marketData.get(h.ticker);
        return {
          ticker: h.ticker,
          name: h.company,
          value: h.marketValue,
          allocation: portfolio.totalValue > 0 ? (h.marketValue / portfolio.totalValue) * 100 : 0,
          pl: h.unrealizedPL,
          plPercent: h.unrealizedPLPercent,
          metric: stock?.[treemapMetric as keyof any] ?? null,
          color: getMetricColor(treemapMetric, stock?.[treemapMetric as keyof any] ?? null)
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [portfolio.holdings, marketData, treemapMetric, portfolio.totalValue]);

  if (portfolio.holdings.length === 0 || sortedHoldings.length === 0) {
    return (
      <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex items-center justify-center">
        <div className="text-center">
          <PieIcon size={40} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No holdings to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-start mb-2 lg:mb-3">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight">Portfolio Analysis</h2>
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            Size = Weight • Color = {config.label}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2 lg:px-3 py-1 text-[9px] lg:text-[10px] font-bold rounded-lg transition-all ${viewMode === 'cards' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('treemap')}
            className={`px-2 lg:px-3 py-1 text-[9px] lg:text-[10px] font-bold rounded-lg transition-all ${viewMode === 'treemap' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Treemap
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-2 lg:mb-3 flex-wrap">
        {Object.entries(METRIC_CONFIG).map(([key, { short }]) => (
          <button
            key={key}
            onClick={() => onMetricChange(key)}
            className={`px-2 py-1 text-[8px] lg:text-[9px] font-bold rounded-md transition-all ${
              treemapMetric === key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {short}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[200px]">
        {viewMode === 'treemap' ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsTreemap
              data={treemapData}
              dataKey="value"
              aspectRatio={4 / 3}
              fill="#8884d8"
              content={({ x, y, width, height, name, value, index }: any) => {
                const holding = sortedHoldings.find(h => h.ticker === name);
                return (
                  <SimpleTreemapContent
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    name={name}
                    value={value}
                    fill={holding?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                    metric={treemapMetric}
                    metricValue={holding?.metric}
                  />
                );
              }}
            >
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const holding = sortedHoldings.find(h => h.ticker === d.name);
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs">
                        <div className="font-bold text-sm">{d.name}</div>
                        <div className="text-slate-400">{formatCurrency(d.value)}</div>
                        <div className="text-emerald-400 font-bold mt-1">
                          {holding?.allocation.toFixed(1)}% weight
                        </div>
                        <div className="text-slate-300 mt-1">
                          {config.label}: {holding?.metric?.toFixed(1) || 'N/A'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RechartsTreemap>
          </ResponsiveContainer>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 overflow-auto h-full">
            {sortedHoldings.map((holding, idx) => (
              <div
                key={holding.ticker}
                onClick={() => navigateToAnalysis(holding.ticker)}
                className="p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                style={{ 
                  borderColor: holding.color,
                  backgroundColor: `${holding.color}15`
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="min-w-0">
                    <span className="font-bold text-black text-sm">{holding.ticker}</span>
                    <div className="text-[8px] text-slate-500 truncate">{holding.name}</div>
                  </div>
                  <div className={`text-[9px] font-bold whitespace-nowrap ${holding.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {holding.pl >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="text-xs font-bold text-black">{formatCurrency(holding.value)}</div>
                <div className="text-[8px] text-slate-500">{holding.allocation.toFixed(1)}%</div>
                <div 
                  className="mt-1 py-0.5 rounded text-[8px] font-bold w-full overflow-hidden"
                  style={{ backgroundColor: holding.color, color: '#fff' }}
                >
                  {config.short}: {holding.metric !== null ? `${holding.metric > 0 ? '+' : ''}${holding.metric.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getMetricColor(treemapMetric, 20) }} />
              <span className="text-slate-500">{config.good}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getMetricColor(treemapMetric, -10) }} />
              <span className="text-slate-500">{config.bad}</span>
            </div>
          </div>
          <div className="text-slate-400 font-medium">
            Total: {formatCurrency(portfolio.totalValue)}
          </div>
        </div>
      </div>
    </div>
  );
};