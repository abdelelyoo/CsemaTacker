import React, { useState, useEffect } from 'react';
import { CashTransaction, CashTransactionType } from '../types';
import { Save, X, RotateCcw, Wallet } from 'lucide-react';

interface CashFormProps {
    initialData?: CashTransaction | null;
    onSave: (transaction: CashTransaction) => void;
    onCancel: () => void;
}

export const CashForm: React.FC<CashFormProps> = ({ initialData, onSave, onCancel }) => {
    const defaultTransaction: Partial<CashTransaction> = {
        date: new Date().toISOString().split('T')[0],
        type: 'DEPOSIT',
        amount: 0,
        description: ''
    };

    const [formData, setFormData] = useState<Partial<CashTransaction>>(defaultTransaction);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData(defaultTransaction);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value
        }));
    };

    const setToday = () => {
        setFormData(prev => ({
            ...prev,
            date: new Date().toISOString().split('T')[0]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.date || !formData.type) return;
        
        onSave(formData as CashTransaction);
        if (!initialData) {
            setFormData(defaultTransaction);
        }
    };

    const isExpense = ['WITHDRAWAL', 'CUSTODY_FEE', 'SUBSCRIPTION', 'TAX_ADJUSTMENT'].includes(formData.type || '');

    return (
        <div className={`p-6 rounded-xl border mb-6 transition-all ${initialData ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold flex items-center ${initialData ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {initialData ? <RotateCcw className="w-5 h-5 mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
                    {initialData ? 'Edit Cash Record' : 'Record Cash Movement'}
                </h3>
                {initialData && (
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Date</label>
                        <button 
                            type="button" 
                            onClick={setToday}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                        >
                            TODAY
                        </button>
                    </div>
                    <input 
                        type="date" 
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>
                
                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                    <select 
                        name="type" 
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="DEPOSIT">Deposit (Injection)</option>
                        <option value="WITHDRAWAL">Withdrawal</option>
                        <option value="DIVIDEND">Dividend</option>
                        <option value="TAX_ADJUSTMENT">Tax Adjustment</option>
                        <option value="CUSTODY_FEE">Custody Fee</option>
                        <option value="SUBSCRIPTION">Subscription</option>
                    </select>
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                    <input 
                        type="text" 
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="e.g. Monthly Savings"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (MAD)</label>
                    <input 
                        type="number" 
                        name="amount"
                        value={formData.amount || ''}
                        onChange={handleChange}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>

                <div className="lg:col-span-1 flex items-end">
                    <button 
                        type="submit" 
                        className={`w-full py-2 px-4 rounded-lg text-sm font-bold text-white transition-colors flex justify-center items-center shadow-sm ${initialData ? 'bg-indigo-600 hover:bg-indigo-700' : isExpense ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {initialData ? 'Update Record' : 'Add Record'}
                    </button>
                </div>
            </form>
        </div>
    );
};