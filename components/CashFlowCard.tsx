
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet, Banknote } from 'lucide-react';
import { usePortfolioContext } from '../context/PortfolioContext';

export const CashFlowCard: React.FC = () => {
    const { portfolio } = usePortfolioContext();

    const netDeposits = portfolio.totalDeposits - portfolio.totalWithdrawals;
    const realized = portfolio.totalRealizedPL;
    const unrealized = portfolio.totalUnrealizedPL;
    const cashBalance = portfolio.cashBalance;

    // Current Value = Market Value of Holdings + Cash Balance
    const holdingsValue = portfolio.totalValue;
    const currentValue = holdingsValue + cashBalance;
    const totalReturn = realized + unrealized;
    const returnPercent = netDeposits !== 0 ? (totalReturn / netDeposits) * 100 : 0;

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Capital Flow</h3>
                    <p className="text-[10px] text-slate-500">Inflow vs Current Value</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${totalReturn >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {totalReturn >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(returnPercent).toFixed(2)}%
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
                {/* Inflow Section */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Banknote size={12} />
                            <span>Net Inflow</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                            {netDeposits.toLocaleString('fr-MA', { maximumFractionDigits: 0 })} MAD
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full w-full opacity-30"></div>
                    </div>
                </div>

                {/* Outcome Section */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                            <Wallet size={12} />
                            <span>Current Value</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-600 text-base">
                            {currentValue.toLocaleString('fr-MA', { maximumFractionDigits: 0 })} MAD
                        </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        {/* Reusing the proportional logic visually without strict scale to ensure visibility */}
                        <div className="h-full bg-blue-500 w-[70%]"></div> {/* Proxy for Principal */}
                        <div className={`h-full ${totalReturn >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} flex-1`}></div> {/* Proxy for Gain */}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mb-5 p-3 rounded-b-2xl">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cash Available</div>
                <div className="font-mono font-bold text-sm text-slate-800">
                    {portfolio.cashBalance.toLocaleString('fr-MA', { maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">MAD</span>
                </div>
            </div>
        </div>
    );
};
