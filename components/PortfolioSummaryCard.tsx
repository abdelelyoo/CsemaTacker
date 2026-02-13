
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet, Banknote, TrendingUp, PiggyBank, Receipt, MinusCircle, PlusCircle } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';

export const PortfolioSummaryCard: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const totalDeposits = portfolio.totalDeposits;
    const totalWithdrawals = portfolio.totalWithdrawals;
    const totalDividends = portfolio.totalDividends;
    const netDeposits = totalDeposits - totalWithdrawals;
    
    const realized = portfolio.totalRealizedPL;
    const unrealized = portfolio.totalUnrealizedPL;
    const totalReturn = realized + unrealized;
    
    const tradingFees = portfolio.totalTradingFees;
    const custodyFees = portfolio.totalCustodyFees;
    const subscriptionFees = portfolio.totalSubscriptionFees;
    const taxImpact = portfolio.netTaxImpact;
    const totalFees = tradingFees + custodyFees + subscriptionFees + taxImpact;
    
    const cashBalance = portfolio.cashBalance;
    const holdingsValue = portfolio.totalValue;
    const currentValue = holdingsValue + cashBalance;

    const netInflow = totalDeposits - totalWithdrawals + totalDividends - totalFees;
    const returnPercent = netInflow !== 0 ? (totalReturn / netInflow) * 100 : 0;

    const sectionItems = [
        { 
            label: 'Deposits', 
            value: totalDeposits, 
            icon: PlusCircle, 
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            type: 'inflow'
        },
        { 
            label: 'Withdrawals', 
            value: -totalWithdrawals, 
            icon: MinusCircle, 
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
            type: 'outflow'
        },
        { 
            label: 'Dividends', 
            value: totalDividends, 
            icon: PiggyBank, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            type: 'inflow'
        },
        { 
            label: 'Trading Fees', 
            value: -tradingFees, 
            icon: Receipt, 
            color: 'text-rose-500',
            bgColor: 'bg-rose-50',
            type: 'outflow'
        },
        { 
            label: 'Custody', 
            value: -custodyFees, 
            icon: Receipt, 
            color: 'text-orange-500',
            bgColor: 'bg-orange-50',
            type: 'outflow'
        },
        { 
            label: 'Subscription', 
            value: -subscriptionFees, 
            icon: Receipt, 
            color: 'text-purple-500',
            bgColor: 'bg-purple-50',
            type: 'outflow'
        },
        { 
            label: 'Tax Impact', 
            value: -taxImpact, 
            icon: Receipt, 
            color: 'text-red-500',
            bgColor: 'bg-red-50',
            type: 'outflow'
        },
    ].filter(item => item.value !== 0);

    const totalInflows = sectionItems.filter(i => i.type === 'inflow').reduce((acc, i) => acc + Math.abs(i.value), 0);
    const totalOutflows = sectionItems.filter(i => i.type === 'outflow').reduce((acc, i) => acc + Math.abs(i.value), 0);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Portfolio Summary</h3>
                    <p className="text-[10px] text-slate-500">Capital Flow & Costs</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${totalReturn >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {totalReturn >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(returnPercent).toFixed(1)}%
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {/* Current Value */}
                <div className="mb-4 p-3 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-white" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Current Value</span>
                        </div>
                        <div className="text-xl font-black text-white">
                            {formatCurrency(currentValue)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-white/10 rounded-lg p-2">
                            <span className="text-[9px] text-slate-400 uppercase">Holdings</span>
                            <div className="font-mono font-bold text-white text-sm">{formatCurrency(holdingsValue)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                            <span className="text-[9px] text-slate-400 uppercase">Cash</span>
                            <div className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(cashBalance)}</div>
                        </div>
                    </div>
                </div>

                {/* Capital Flow Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Banknote size={12} />
                            <span>Net Capital</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(netInflow)}
                        </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${Math.min((totalInflows / (totalInflows + totalOutflows || 1)) * 100, 100)}%` }}
                        ></div>
                        <div 
                            className="h-full bg-rose-400"
                            style={{ width: `${Math.min((totalOutflows / (totalInflows + totalOutflows || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            In: {formatCurrency(totalInflows)}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                            Out: {formatCurrency(totalOutflows)}
                        </span>
                    </div>
                </div>

                {/* Returns */}
                <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-slate-600" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Returns</span>
                        </div>
                        <div className={`font-mono font-bold ${totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg p-2 border border-slate-100">
                            <span className="text-[9px] text-slate-400 uppercase">Realized</span>
                            <div className={`font-mono font-bold text-xs ${realized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {realized >= 0 ? '+' : ''}{formatCurrency(realized)}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-slate-100">
                            <span className="text-[9px] text-slate-400 uppercase">Unrealized</span>
                            <div className={`font-mono font-bold text-xs ${unrealized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {unrealized >= 0 ? '+' : ''}{formatCurrency(unrealized)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown Items */}
                <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Breakdown</div>
                    {sectionItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                                    <item.icon size={12} className={item.color} />
                                </div>
                                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                            </div>
                            <span className={`font-mono font-bold text-xs ${item.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 p-3 rounded-b-2xl">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <Wallet size={12} />
                    Cash Available
                </div>
                <div className="font-mono font-bold text-sm text-slate-800">
                    {formatCurrency(cashBalance)}
                </div>
            </div>
        </div>
    );
};
