import React, { useState } from 'react';
import { Trade, Position, CashTransaction } from '../types';
import { formatCurrency } from '../utils';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, AlertCircle, Wallet, Trophy, FileText, Edit3, Trash2, HelpCircle, Search, RefreshCw, Loader2 } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export const PositionsTable: React.FC<{ positions: Position[] }> = ({ positions }) => {
    // Filter only currently held positions for the main table
    const activePositions = positions.filter(p => p.qty > 0.001);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <th className="p-4">Ticker</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4">
                                <div className="flex items-center gap-1 cursor-help" title="Prix de Revient Unitaire: Includes buy price + brokerage fees + settlement fees + VAT">
                                    Avg Cost <span className="text-[10px] opacity-60 normal-case">(+Fees)</span>
                                </div>
                            </th>
                            <th className="p-4">
                                <div className="flex items-center gap-1 cursor-help" title="Price needed to sell at 0 profit (covers buy fees AND sell fees)">
                                    Break-Even
                                </div>
                            </th>
                            <th className="p-4">Live Price</th>
                            <th className="p-4">Market Value</th>
                            <th className="p-4">Unrealized P&L</th>
                            <th className="p-4 text-center">Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {activePositions.map((p) => {
                            const isProfitable = p.unrealizedPnL >= 0;
                            // Calculate how far current price is from break even
                            const distToBreakEven = ((p.marketPrice - p.breakEven) / p.breakEven) * 100;
                            const isAboveBreakEven = p.marketPrice >= p.breakEven;

                            return (
                                <tr key={p.ticker} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">{p.ticker}</td>
                                    <td className="p-4 text-center font-mono bg-slate-50/50">{p.qty.toFixed(0)}</td>
                                    <td className="p-4 text-slate-600">
                                        {formatCurrency(p.avgCost)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{formatCurrency(p.breakEven)}</span>
                                            <span className="text-[10px] text-slate-400">Target</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">
                                        <div className="flex flex-col">
                                            <span>{p.marketPrice > 0 ? formatCurrency(p.marketPrice) : '-'}</span>
                                            {p.marketPrice > 0 && (
                                                <span className={`text-[10px] font-bold ${isAboveBreakEven ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                    {distToBreakEven > 0 ? '+' : ''}{distToBreakEven.toFixed(2)}%
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-indigo-900">
                                        {p.marketPrice > 0 ? formatCurrency(p.marketValue) : '-'}
                                    </td>
                                    <td className="p-4 font-bold">
                                        {p.marketPrice > 0 ? (
                                            <div className="flex flex-col">
                                                <span className={isProfitable ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {isProfitable ? '+' : ''}{formatCurrency(p.unrealizedPnL)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2 text-xs">
                                            <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full" title="Number of Buy Orders">
                                                <ArrowUpRight className="w-3 h-3 mr-1" /> {p.buyCount}
                                            </span>
                                            {p.sellCount > 0 && (
                                                <span className="flex items-center text-rose-600 bg-rose-50 px-2 py-1 rounded-full" title="Number of Sell Orders">
                                                    <ArrowDownRight className="w-3 h-3 mr-1" /> {p.sellCount}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {activePositions.length === 0 && (
                             <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400">
                                    No active positions currently held.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const TradeHistoryTable: React.FC<{ 
    trades: Trade[], 
    totalCashInjected: number,
    onEdit?: (trade: Trade) => void,
    onDelete?: (tradeId: string) => void
}> = ({ trades, totalCashInjected, onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

    // Reverse to show newest first for display
    const sortedTrades = [...trades].reverse();

    const filteredTrades = sortedTrades.filter(t => 
        t.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRealizedPnL = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

    const toggleTaxDetails = (id: string) => {
        setExpandedTradeId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Cash Injected</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold text-slate-800">{formatCurrency(totalCashInjected)}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Based on deposit logs</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-500 rounded-lg">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Realized P&L</p>
                        <p className={`text-xl font-bold ${totalRealizedPnL > 0 ? 'text-emerald-600' : totalRealizedPnL < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                            {totalRealizedPnL > 0 ? '+' : ''}{formatCurrency(totalRealizedPnL)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Cumulative profit/loss from closed positions</p>
                    </div>
                     <div className={`p-3 rounded-lg ${totalRealizedPnL >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        <Trophy className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h4 className="font-semibold text-slate-700 flex items-center">
                         <FileText className="w-4 h-4 mr-2" /> Trading History
                    </h4>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by ticker..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 transition-all focus:w-full sm:focus:w-72"
                        />
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <th className="p-4">Date</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Ticker</th>
                                <th className="p-4 text-right">Qty</th>
                                <th className="p-4 text-right">Price</th>
                                <th className="p-4 text-right">Cash Amount</th>
                                <th className="p-4 text-right text-red-400">Fees</th>
                                <th className="p-4 text-right text-red-400">Tax</th>
                                <th className="p-4 text-right font-bold">Net Amount</th>
                                <th className="p-4 text-right">Realized P&L</th>
                                {(onEdit || onDelete) && <th className="p-4 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredTrades.length > 0 ? (
                                filteredTrades.map((t, idx) => {
                                    const isBuy = t.type === 'Achat';
                                    const pnl = t.realizedPnL || 0;
                                    const hasPnl = t.type === 'Vente';
                                    const netAmt = t.netAmount || (t.qty * t.price);
                                    const tax = t.calculatedTax || 0;
                                    const finalAmount = isBuy ? netAmt : (netAmt - tax);
                                    
                                    return (
                                        <React.Fragment key={t.id || idx}>
                                            <tr className={`hover:bg-opacity-50 transition-colors ${isBuy ? 'bg-emerald-50/30' : 'bg-rose-50/30'} ${expandedTradeId === t.id ? 'bg-slate-100' : ''}`}>
                                                <td className="p-4 text-slate-500 whitespace-nowrap">{t.date}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {isBuy ? <TrendingUp className="w-3 h-3 mr-1"/> : <TrendingDown className="w-3 h-3 mr-1"/>}
                                                        {t.type === 'Achat' ? 'BUY' : 'SELL'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-700">{t.ticker}</td>
                                                <td className="p-4 text-right">{t.qty}</td>
                                                <td className="p-4 text-right">{formatCurrency(t.price)}</td>
                                                <td className="p-4 text-right font-mono font-medium text-slate-700">
                                                    {formatCurrency(netAmt)}
                                                </td>
                                                <td className="p-4 text-right text-xs text-red-400">
                                                    -{formatCurrency(t.calculatedFees || 0)}
                                                </td>
                                                <td className="p-4 text-right text-xs text-red-400">
                                                     {t.calculatedTax && t.calculatedTax > 0 ? (
                                                        <button 
                                                            onClick={() => t.id && toggleTaxDetails(t.id)}
                                                            className="flex items-center justify-end gap-1 hover:text-red-600 focus:outline-none w-full group transition-colors"
                                                            title="View TPCVM Calculation"
                                                        >
                                                            <span>-{formatCurrency(t.calculatedTax)}</span>
                                                            <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-red-500" />
                                                        </button>
                                                     ) : (
                                                        t.calculatedTax && t.calculatedTax > 0 ? `-${formatCurrency(t.calculatedTax)}` : '-'
                                                     )}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                                                    {formatCurrency(finalAmount)}
                                                </td>
                                                <td className="p-4 text-right font-bold">
                                                    {hasPnl ? (
                                                        <span className={pnl > 0 ? 'text-emerald-600' : pnl < 0 ? 'text-rose-600' : 'text-slate-400'}>
                                                            {pnl > 0 ? '+' : ''}{formatCurrency(pnl)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                {(onEdit || onDelete) && (
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            {onEdit && (
                                                                <button 
                                                                    onClick={() => onEdit(t)} 
                                                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {onDelete && (
                                                                <button 
                                                                    onClick={() => t.id && onDelete(t.id)} 
                                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                            {expandedTradeId === t.id && (
                                                <tr className="bg-slate-50/80 border-b border-slate-100 animate-fade-in">
                                                    <td colSpan={11} className="p-4">
                                                        <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-lg ml-auto shadow-sm">
                                                            <h5 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                                                TPCVM Tax Calculation Details
                                                            </h5>
                                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                                <div className="text-slate-500">Net Proceeds (After Fees):</div>
                                                                <div className="text-right font-mono">{formatCurrency(t.netAmount || 0)}</div>
                                                                
                                                                <div className="text-slate-500">
                                                                    Acquisition Cost (PMP):
                                                                    <div className="text-[10px] text-slate-400">(Avg Cost × Sold Qty)</div>
                                                                </div>
                                                                <div className="text-right font-mono">-{formatCurrency((t.netAmount || 0) - (t.taxableGain || 0))}</div>
                                                                
                                                                <div className="col-span-2 border-t border-slate-100 my-1"></div>
                                                                
                                                                <div className="font-medium text-slate-700">Taxable Capital Gain:</div>
                                                                <div className="text-right font-mono font-medium text-emerald-600">{formatCurrency(t.taxableGain || 0)}</div>
                                                                
                                                                <div className="text-slate-500">Tax Rate (TPCVM):</div>
                                                                <div className="text-right font-mono">15%</div>
                                                                
                                                                <div className="col-span-2 border-t border-slate-100 my-1"></div>
                                                                
                                                                <div className="font-bold text-slate-800">Tax Payable:</div>
                                                                <div className="text-right font-mono font-bold text-rose-500">-{formatCurrency(t.calculatedTax || 0)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-400">
                                        No transactions found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const CashLedgerTable: React.FC<{ 
    transactions: CashTransaction[],
    onEdit?: (transaction: CashTransaction) => void,
    onDelete?: (transactionId: string) => void
}> = ({ transactions, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h4 className="font-semibold text-slate-700 flex items-center">
                        <Wallet className="w-4 h-4 mr-2" /> Cash Ledger (Deposits, Dividends & Fees)
                </h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <th className="p-4">Date</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Description</th>
                            <th className="p-4 text-right">Amount</th>
                            {(onEdit || onDelete) && <th className="p-4 text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {[...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500 whitespace-nowrap">{c.date}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                        ${c.type === 'DEPOSIT' ? 'bg-indigo-100 text-indigo-800' : 
                                            c.type === 'DIVIDEND' ? 'bg-emerald-100 text-emerald-800' : 
                                            (c.type === 'CUSTODY_FEE' || c.type === 'SUBSCRIPTION' || c.type === 'WITHDRAWAL' || c.type === 'TAX_ADJUSTMENT') ? 'bg-rose-100 text-rose-800' :
                                            'bg-slate-100 text-slate-800'}`}>
                                        {c.type}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-700">{c.description}</td>
                                <td className={`p-4 text-right font-mono font-medium ${(c.type === 'CUSTODY_FEE' || c.type === 'SUBSCRIPTION' || c.type === 'WITHDRAWAL' || c.type === 'TAX_ADJUSTMENT') ? 'text-rose-600' : ''}`}>
                                    {((c.type === 'CUSTODY_FEE' || c.type === 'SUBSCRIPTION' || c.type === 'WITHDRAWAL' || c.type === 'TAX_ADJUSTMENT') ? '-' : '') + formatCurrency(c.amount)}
                                </td>
                                {(onEdit || onDelete) && (
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {onEdit && (
                                                <button 
                                                    onClick={() => onEdit(c)} 
                                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button 
                                                    onClick={() => c.id && onDelete(c.id)} 
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const MarketDataTable: React.FC<{ 
    tickers: string[], 
    prices: Record<string, number>, 
    onUpdate: (ticker: string, price: number) => void,
    onRefresh?: () => void,
    isRefreshing?: boolean,
    lastUpdated?: Date | null
}> = ({ tickers, prices, onUpdate, onRefresh, isRefreshing, lastUpdated }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h4 className="font-semibold text-slate-700 flex items-center">
                         <Edit3 className="w-4 h-4 mr-2" /> Market Data
                    </h4>
                    {onRefresh && (
                        <button 
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                            {isRefreshing ? (
                                <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Updating...</>
                            ) : (
                                <><RefreshCw className="w-3 h-3 mr-2" /> Refresh with AI</>
                            )}
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400">Prices in MAD</span>
                    {lastUpdated && (
                        <span className="text-[10px] text-emerald-600 font-medium animate-fade-in">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <th className="p-4">Ticker</th>
                            <th className="p-4">Current Price (MAD)</th>
                            <th className="p-4">Manual Override</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {tickers.map(ticker => (
                            <tr key={ticker} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-700">{ticker}</td>
                                <td className="p-4 font-mono text-slate-800 font-bold bg-slate-50/50">
                                    {formatCurrency(prices[ticker] || 0)}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-32 p-2 border border-slate-200 rounded-lg text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={prices[ticker] || ''}
                                            onChange={(e) => onUpdate(ticker, parseFloat(e.target.value) || 0)}
                                            step="0.01"
                                        />
                                        <span className="text-slate-400 text-xs">MAD</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};