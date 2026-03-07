import React, { useMemo, useState } from 'react';
import { PieChart as PieIcon, Minus, Plus } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { useMetrics } from '../context/MetricsContext';
import { MarketStock } from '../services/marketDataService';

interface HoldingsTableProps {
  marketData: Map<string, MarketStock>;
}

interface HoldingRowProps {
  holding: any;
  stock: MarketStock | undefined;
  weight: number;
  onClick: () => void;
  compact: boolean;
}

const HoldingRow: React.FC<HoldingRowProps> = React.memo(({ holding, stock, weight, onClick, compact }) => {
  const pe = stock?.pe_ratio;
  const div = stock?.dividend_yield;
  const dayChange = stock?.change_percent;
  const weekChange = stock?.perf_1m;
  const totalCost = holding.quantity * holding.averageCost;
  const weekChangeVal = weekChange !== undefined && weekChange !== null ? weekChange : null;

  return (
    <tr 
      className="hover:bg-slate-50 transition-all cursor-pointer group" 
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${holding.ticker}`}
    >
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'}`}>
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors"
            aria-hidden="true"
          >
            {holding.ticker.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{holding.ticker}</span>
            <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[120px]">{stock?.sector || holding.sector}</span>
          </div>
        </div>
      </td>
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {pe && <span className="text-[10px] font-bold text-slate-500">P/E: {pe.toFixed(1)}</span>}
            {div && <span className="text-[10px] font-bold text-emerald-600">YLD: {div.toFixed(1)}%</span>}
          </div>
          {stock?.roe && <div className="text-[9px] text-slate-400 font-medium">ROE: {stock.roe.toFixed(1)}%</div>}
        </div>
      </td>
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
        <div className="flex flex-col items-end">
          <span className="font-bold text-slate-800">{holding.quantity.toLocaleString()} <span className="text-[10px] text-slate-400">shares</span></span>
          <span className="text-[10px] text-slate-500 font-medium">Avg: {holding.averageCost.toFixed(2)}</span>
          <span className="text-[10px] text-blue-500 font-medium">Break: {holding.breakEvenPrice?.toFixed(2) ?? 'N/A'}</span>
        </div>
      </td>
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
        <div className="flex flex-col items-end">
          <span className="font-black text-slate-900">{holding.currentPrice.toFixed(2)}</span>
          {dayChange !== undefined && (
            <span className={`text-[10px] font-bold ${dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {dayChange >= 0 ? '▲' : '▼'} {Math.abs(dayChange).toFixed(2)}%
            </span>
          )}
        </div>
      </td>
      {weekChangeVal !== null && (
        <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-bold ${weekChangeVal >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {weekChangeVal >= 0 ? '+' : ''}{weekChangeVal.toFixed(2)}%
            </span>
            <span className="text-[9px] text-slate-400">1W</span>
          </div>
        </td>
      )}
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
        <div className="flex flex-col items-end">
          <span className="font-black text-slate-900">{holding.marketValue.toLocaleString()} <span className="text-[10px] text-slate-400">MAD</span></span>
          <span className="text-[10px] text-slate-500 font-medium">{totalCost.toLocaleString()} invested</span>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-800" style={{ width: `${Math.min(weight, 100)}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">{weight.toFixed(1)}%</span>
          </div>
        </div>
      </td>
      <td className={`${compact ? 'px-2 py-2' : 'px-4 py-4'} text-right`}>
        <div className={`inline-flex flex-col items-end p-2 rounded-xl border transition-colors ${
          holding.unrealizedPL >= 0
            ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100'
            : 'bg-rose-50/50 text-rose-700 border-rose-100'
        }`}>
          <span className="text-xs font-black">{holding.unrealizedPL >= 0 ? '+' : ''}{holding.unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</span>
          <span className="text-[10px] font-bold opacity-70">Total P&L</span>
        </div>
      </td>
    </tr>
  );
});

HoldingRow.displayName = 'HoldingRow';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ marketData }) => {
  const { portfolio } = usePortfolioContext();
  const { navigateToAnalysis } = useMetrics();
  const [compact, setCompact] = useState(false);

  const holdingsWithWeight = useMemo(() => {
    return portfolio.holdings.map(holding => ({
      ...holding,
      weight: portfolio.totalValue > 0 ? (holding.marketValue / portfolio.totalValue) * 100 : 0
    }));
  }, [portfolio.holdings, portfolio.totalValue]);

  const hasWeekChange = holdingsWithWeight.some(h => {
    const val = marketData.get(h.ticker)?.perf_1m;
    return val !== undefined && val !== null;
  });
  const totalHoldings = portfolio.holdings.length;

  if (totalHoldings === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-900 tracking-tight text-lg">Current Positions</h2>
            <p className="text-xs text-slate-500 font-medium">Detailed breakdown of 0 assets</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <PieIcon size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Holdings Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            Import your portfolio CSV to see your positions, performance analytics, and more.
          </p>
          <button
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            aria-label="Import portfolio"
          >
            Import Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-3 lg:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 relative">
        <div className="flex flex-col">
          <h2 className="font-bold text-slate-900 tracking-tight text-base lg:text-lg">Current Positions</h2>
          <p className="text-xs text-slate-500 font-medium">{totalHoldings} assets</p>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={() => setCompact(!compact)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${compact ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            aria-label={compact ? 'Expand view' : 'Compact view'}
          >
            {compact ? <Plus size={16} /> : <Minus size={16} />}
          </button>
          <div className="px-2 lg:px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
            Live
          </div>
        </div>
      </div>
      <div className="overflow-x-auto flex-1" role="region" aria-label="Holdings table">
        <table className="w-full text-sm text-left border-collapse" role="table">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest sticky top-0 z-10 backdrop-blur-sm">
            <tr role="row">
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} border-b border-slate-100`} scope="col">Asset</th>
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">Fundamental</th>
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">Holdings</th>
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">Price</th>
              {hasWeekChange && <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">1W</th>}
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">Total Value</th>
              <th className={`${compact ? 'px-2 py-3' : 'px-4 py-4'} text-right border-b border-slate-100`} scope="col">Position P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {holdingsWithWeight.map((holding) => (
              <HoldingRow
                key={holding.ticker}
                holding={holding}
                stock={marketData.get(holding.ticker)}
                weight={holding.weight}
                onClick={() => navigateToAnalysis(holding.ticker)}
                compact={compact}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};