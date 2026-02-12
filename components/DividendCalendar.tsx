import React, { useEffect, useState } from 'react';
import { DividendService, DividendSummary } from '../services/dividendService';
import { usePortfolioContext } from '../context/PortfolioContext';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';

export const DividendCalendar: React.FC = () => {
    const { portfolio } = usePortfolioContext();
    const [summary, setSummary] = useState<DividendSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDividendData();
    }, [portfolio]);

    const loadDividendData = async () => {
        setLoading(true);
        const holdings = portfolio.holdings.map(h => ({
            ticker: h.ticker,
            quantity: h.quantity,
            currentPrice: h.currentPrice
        }));

        const data = await DividendService.getDividendSummary(holdings);
        setSummary(data);
        setLoading(false);
    };

    const formatCurrency = (amount: number): string => {
        return amount.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getSustainabilityColor = (
        sustainability: 'healthy' | 'moderate' | 'risky'
    ): { bg: string; text: string; border: string } => {
        switch (sustainability) {
            case 'healthy':
                return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
            case 'moderate':
                return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
            case 'risky':
                return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!summary || summary.projections.length === 0) {
        return (
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center">
                <CalendarIcon size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700 mb-2">No Dividend Data</h3>
                <p className="text-sm text-slate-500">
                    Import profile data to see dividend projections and calendar.
                </p>
            </div>
        );
    }

    const nextPayments = summary.upcomingPayments.filter(p => p.daysUntilPayment >= 0).slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <DollarSign size={28} />
                    <div>
                        <h2 className="text-2xl font-bold">Dividend Calendar & Planning</h2>
                        <p className="text-sm text-emerald-100">Track upcoming payments and forecast income</p>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="text-xs text-emerald-100 mb-1 uppercase tracking-wide">Projected Annual Income</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalProjectedIncome)} MAD</p>
                        <p className="text-xs text-emerald-200 mt-1">Before tax</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="text-xs text-emerald-100 mb-1 uppercase tracking-wide">Tax (2%)</p>
                        <p className="text-2xl font-bold">-{formatCurrency(summary.totalProjectedTax)} MAD</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="text-xs text-emerald-100 mb-1 uppercase tracking-wide">Net Income</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalProjectedNetIncome)} MAD</p>
                        <p className="text-xs text-emerald-200 mt-1">After tax</p>
                    </div>
                </div>
            </div>

            {/* Upcoming Payments */}
            {nextPayments.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Upcoming Payments
                    </h3>
                    <div className="space-y-3">
                        {nextPayments.map((payment, idx) => (
                            <div
                                key={`${payment.ticker}-${payment.year}-${idx}`}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xs font-bold text-emerald-700">{payment.ticker}</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{payment.companyName}</p>
                                        <p className="text-xs text-slate-500">
                                            {payment.exDate && `Ex: ${formatDate(payment.exDate)} • `}
                                            Payment: {payment.paymentDate ? formatDate(payment.paymentDate) : 'TBD'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-600">+{formatCurrency(payment.netAmount)} MAD</p>
                                    <p className="text-xs text-slate-400">
                                        {payment.daysUntilPayment === 0
                                            ? 'Today'
                                            : payment.daysUntilPayment > 0
                                                ? `in ${payment.daysUntilPayment} days`
                                                : `${Math.abs(payment.daysUntilPayment)} days ago`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dividend Projections */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" />
                        Dividend Projections by Holding
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Annual income forecast based on historical data</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-3 text-left">Company</th>
                                <th className="px-6 py-3 text-right">Yield</th>
                                <th className="px-6 py-3 text-right">Last Div</th>
                                <th className="px-6 py-3 text-right">Projected</th>
                                <th className="px-6 py-3 text-right">Annual Income</th>
                                <th className="px-6 py-3 text-right">Tax</th>
                                <th className="px-6 py-3 text-right">Net Income</th>
                                <th className="px-6 py-3 text-center">Sustainability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {summary.projections.map(proj => {
                                const colorScheme = getSustainabilityColor(proj.sustainability);
                                return (
                                    <tr key={proj.ticker} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800">{proj.ticker}</p>
                                                <p className="text-xs text-slate-500">{proj.companyName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-emerald-600">{proj.currentYield.toFixed(2)}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {proj.lastDividendAmount.toFixed(2)} MAD
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {proj.projectedNextDividend.toFixed(2)} MAD
                                                </p>
                                                {proj.growthRate !== 0 && (
                                                    <p
                                                        className={`text-xs font-bold ${proj.growthRate > 0 ? 'text-emerald-600' : 'text-rose-600'
                                                            }`}
                                                    >
                                                        {proj.growthRate > 0 ? '▲' : '▼'} {Math.abs(proj.growthRate).toFixed(1)}%
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                                            {formatCurrency(proj.projectedAnnualIncome)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-rose-600">
                                            -{formatCurrency(proj.projectedTax)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            {formatCurrency(proj.projectedNetIncome)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} border`}
                                                >
                                                    {proj.sustainability === 'healthy' && <CheckCircle2 size={12} />}
                                                    {proj.sustainability === 'risky' && <AlertCircle size={12} />}
                                                    {proj.sustainability.charAt(0).toUpperCase() + proj.sustainability.slice(1)}
                                                </span>
                                                <span className="text-xs text-slate-400">{proj.sustainabilityScore}/100</span>
                                            </div>
                                            {proj.payoutRatio && (
                                                <p className="text-[10px] text-slate-400 text-center mt-1">
                                                    Payout: {proj.payoutRatio.toFixed(0)}%
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
