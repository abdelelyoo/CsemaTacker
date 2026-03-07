
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet, Banknote, TrendingUp, PiggyBank, Receipt, MinusCircle, PlusCircle, Activity, Info } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/helpers';
import { motion } from 'framer-motion';

export const PortfolioSummaryCard: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const totalDeposits = portfolio.totalDeposits;
    const totalWithdrawals = portfolio.totalWithdrawals;
    const totalDividends = portfolio.totalDividends;
    const totalTaxRefunds = portfolio.totalTaxRefunds || 0;

    // Net Capital = deposits + dividends + tax refunds - withdrawals
    const investedCapital = totalDeposits + totalDividends + totalTaxRefunds - totalWithdrawals;

    const realized = portfolio.totalRealizedPL;
    const unrealized = portfolio.totalUnrealizedPL;
    const totalReturn = realized + unrealized;

    // Total return based on Net Invested (standard ROI)
    const totalReturnPercent = investedCapital > 0 ? (totalReturn / investedCapital) * 100 : 0;

    const tradingFees = portfolio.totalTradingFees;
    const custodyFees = portfolio.totalCustodyFees;
    const subscriptionFees = portfolio.totalSubscriptionFees;
    const bankFees = portfolio.totalBankFees;
    const totalFees = tradingFees + custodyFees + subscriptionFees + bankFees;

    const cashBalance = portfolio.cashBalance;
    const holdingsValue = portfolio.totalValue;
    const currentValue = holdingsValue + cashBalance;

    const totalBreakEven = portfolio.holdings.reduce((sum, h) => sum + (h.averageCost * h.quantity), 0);

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
            label: 'Tax Refunds',
            value: totalTaxRefunds,
            icon: PiggyBank,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50',
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
            label: 'Bank Fees',
            value: -bankFees,
            icon: Receipt,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50',
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
    ];

    const hasAnyData = sectionItems.some(item => item.value !== 0);

    const depositRatio = (totalDeposits + totalWithdrawals) > 0 ? totalDeposits / (totalDeposits + totalWithdrawals) : 0;
    const feeRatio = totalDividends > 0 ? totalFees / totalDividends : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col"
        >
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Financial Health</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Flow & Efficiency Analysis</p>
                </div>
                <div className={`flex flex-col items-end`}>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${totalReturn >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {totalReturn >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(totalReturnPercent).toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                {/* Current Value Visual */}
                <div className="p-4 bg-slate-900 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={48} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Worth</span>
                        <div className="text-2xl font-black text-white mt-1 leading-none tracking-tight">
                            {formatCurrency(currentValue)}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                            <div className="flex-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Holdings</span>
                                <div className="text-xs font-bold text-white">{formatCurrency(holdingsValue)}</div>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex-1 text-right">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Liquid Cash</span>
                                <div className="text-xs font-bold text-emerald-400">{formatCurrency(cashBalance)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Capital Efficiency Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1.5"><Banknote size={12} /> Inflow Balance</span>
                        <span className="text-slate-900">{((depositRatio) * 100).toFixed(0)}% Utilized</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${depositRatio * 100}%` }}
                            className="h-full bg-slate-800"
                        />
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(1 - depositRatio) * 100}%` }}
                            className="h-full bg-rose-400"
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-600">Net Invested: {formatCurrency(investedCapital)}</span>
                        <span className="text-rose-500">Expenses: {formatCurrency(totalFees)}</span>
                    </div>
                </div>

                {/* Performance Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp size={12} className="text-emerald-600" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase">Return</span>
                        </div>
                        <div className="text-sm font-black text-emerald-900">{formatCurrency(totalReturn)}</div>
                        <div className="text-[9px] font-bold text-emerald-600/70 mt-0.5">ROI: {totalReturnPercent.toFixed(1)}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Receipt size={12} className="text-slate-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">Fee %</span>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                            {currentValue > 0 ? ((totalFees / currentValue) * 100).toFixed(1) : '---'}%
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">Of Net Worth</div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stream Analysis</span>
                        <Info size={12} className="text-slate-300" />
                    </div>
                    {!hasAnyData ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                            No cash flow data available
                        </div>
                    ) : (
                        sectionItems.filter(item => item.value !== 0).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center group/item hover:bg-slate-50 p-1.5 rounded-lg transition-all">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${item.bgColor} group-hover/item:scale-110 transition-transform`}>
                                    <item.icon size={12} className={item.color} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                            </div>
                            <span className={`font-mono font-black text-[11px] ${item.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                            </span>
                        </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center -mx-5 -mb-5 p-4 bg-slate-50/80 rounded-b-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Liquid Reserve</span>
                </div>
                <div className="font-mono font-black text-sm text-slate-900">
                    {formatCurrency(cashBalance)}
                </div>
            </div>
        </motion.div>
    );
};
