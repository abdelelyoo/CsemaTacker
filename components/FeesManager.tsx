
import React, { useState } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { FeeType } from '../types';
import { X, Plus, Trash2, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
import { DateService } from '../services/dateService';

interface FeesManagerProps {
    onClose: () => void;
}

export const FeesManager: React.FC<FeesManagerProps> = ({ onClose }) => {
    const { fees, addFee, deleteFee } = usePortfolioContext();
    const [newFeeDate, setNewFeeDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newFeeType, setNewFeeType] = useState<FeeType>('SUB');
    const [newFeeAmount, setNewFeeAmount] = useState<string>('');
    const [newFeeDesc, setNewFeeDesc] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFeeAmount || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const amount = parseFloat(newFeeAmount);
            const date = new Date(newFeeDate);

            if (isNaN(amount) || isNaN(date.getTime())) {
                alert('Invalid date or amount');
                return;
            }

            const success = await addFee(date, newFeeType, amount, newFeeDesc);
            if (success) {
                setNewFeeAmount('');
                setNewFeeDesc('');
                // Optional: keep date or reset? Keeping date is usually better for batch entry
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this fee record?')) {
            await deleteFee(id);
        }
    };

    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fee Management</h2>
                        <p className="text-sm text-slate-500">Record Subscription (SUB) and Custody (CUS) fees</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Add New Fee Form */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-emerald-500" />
                            New Record
                        </h3>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <Calendar size={12} /> Date
                                </label>
                                <input
                                    type="date"
                                    value={newFeeDate}
                                    onChange={(e) => setNewFeeDate(e.target.value)}
                                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <Tag size={12} /> Type
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewFeeType('SUB')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${newFeeType === 'SUB'
                                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                : 'bg-white text-slate-500 border-slate-300 hover:border-purple-300'
                                            }`}
                                    >
                                        SUB (Subscription)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewFeeType('CUS')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${newFeeType === 'CUS'
                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                : 'bg-white text-slate-500 border-slate-300 hover:border-amber-300'
                                            }`}
                                    >
                                        CUS (Custody)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <DollarSign size={12} /> Amount (MAD)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newFeeAmount}
                                    onChange={(e) => setNewFeeAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <FileText size={12} /> Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={newFeeDesc}
                                    onChange={(e) => setNewFeeDesc(e.target.value)}
                                    placeholder="e.g. Monthly Subscription"
                                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Recording...' : 'Record Fee'}
                                </button>
                            </div>

                        </form>
                    </div>

                    {/* Records Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900">Recorded Fees</h3>
                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                Total: {totalFees.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                            </span>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {fees.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                                                    No fee records found. Use the form above to add one.
                                                </td>
                                            </tr>
                                        ) : (
                                            fees.map((fee) => (
                                                <tr key={fee.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-4 py-3 text-slate-700 font-medium">
                                                        {DateService.toShortDisplay(fee.date)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${fee.type === 'SUB'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                            }`}>
                                                            {fee.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                                        {fee.description || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-rose-600">
                                                        -{fee.amount.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => fee.id && handleDelete(fee.id)}
                                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
