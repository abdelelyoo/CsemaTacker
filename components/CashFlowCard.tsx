
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet, Banknote, TrendingUp, PiggyBank } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';

export const CashFlowCard: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const totalDeposits = portfolio.totalDeposits;
    const totalWithdrawals = portfolio.totalWithdrawals;
    const totalDividends = portfolio.totalDividends;
    const totalFees = portfolio.totalCustodyFees + portfolio.totalSubscriptionFees + portfolio.totalBankFees;
    const netDeposits = totalDeposits - totalWithdrawals;
    
    const realized = portfolio.totalRealizedPL;
    const unrealized = portfolio.totalUnrealizedPL;
    const totalReturn = realized + unrealized;
    const cashBalance = portfolio.cashBalance;
    const holdingsValue = portfolio.totalValue;
    const currentValue = holdingsValue + cashBalance;

    const netInflow = netDeposits + totalDividends - totalFees;
    const profitFromMarket = totalReturn;
    
    const returnPercent = netInflow !== 0 ? (totalReturn / netInflow) * 100 : 0;
    const inflowVsCurrent = netInflow !== 0 ? ((currentValue - netInflow) / Math.abs(netInflow)) * 100 : 0;

    const getBarWidth = (value: number, total: number) => {
        if (total <= 0) return '0%';
        const width = (Math.abs(value) / total) * 100;
        return `${Math.min(Math.max(width, 2), 100)}%`;
    };

    const totalInflow = Math.abs(netInflow) + Math.abs(totalReturn);
    
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Capital Flow</h3>
                    <p className="text-[10px] text-slate-500">Inflow vs Current Value</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${totalReturn >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {totalReturn >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(returnPercent).toFixed(1)}%
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
                {/* Net Inflow Bar */}
                <div>
                    <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Banknote size={12} />
                            <span>Net Inflow</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(netInflow)}
                        </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${netInflow >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: '100%' }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span>Deposits: {formatCurrency(totalDeposits)}</span>
                        <span>Withdrawals: {formatCurrency(totalWithdrawals)}</span>
                    </div>
                </div>

                {/* Current Value Bar */}
                <div>
                    <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                            <Wallet size={12} />
                            <span>Current Value</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-600 text-base">
                            {formatCurrency(currentValue)}
                        </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-blue-500" 
                            style={{ width: getBarWidth(netInflow, currentValue) }}
                            title={`Net Inflow: ${formatCurrency(netInflow)}`}
                        ></div>
                        <div 
                            className={`h-full ${totalReturn >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: getBarWidth(totalReturn, currentValue) }}
                            title={`Returns: ${formatCurrency(totalReturn)}`}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Net Inflow
                        </span>
                        <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${totalReturn >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {totalReturn >= 0 ? 'Gains' : 'Losses'}
                        </span>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase">
                            <TrendingUp size={10} />
                            Total Return
                        </div>
                        <div className={`font-mono font-bold text-sm ${totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase">
                            <PiggyBank size={10} />
                            Dividends
                        </div>
                        <div className="font-mono font-bold text-sm text-blue-600">
                            +{formatCurrency(totalDividends)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 p-3 rounded-b-2xl">
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
