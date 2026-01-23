import React, { useState, useEffect } from 'react';
import { Trade, TradeType } from '../types';
import { Save, X, RotateCcw } from 'lucide-react';

interface TradeFormProps {
    initialData?: Trade | null;
    onSave: (trade: Trade) => void;
    onCancel: () => void;
}

export const TradeForm: React.FC<TradeFormProps> = ({ initialData, onSave, onCancel }) => {
    const defaultTrade: Partial<Trade> = {
        date: new Date().toISOString().split('T')[0],
        type: 'Achat',
        ticker: '',
        qty: 0,
        price: 0,
        notes: ''
    };

    const [formData, setFormData] = useState<Partial<Trade>>(defaultTrade);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData(defaultTrade);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'qty' || name === 'price' ? parseFloat(value) || 0 : value
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
        if (!formData.ticker || !formData.qty || !formData.price || !formData.date) return;
        
        onSave(formData as Trade);
        // Only reset if not editing (if editing, the parent will handle closing/resetting via props)
        if (!initialData) {
            setFormData(defaultTrade);
        }
    };

    return (
        <div className={`p-6 rounded-xl border mb-6 transition-all ${initialData ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold flex items-center ${initialData ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {initialData ? <RotateCcw className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                    {initialData ? 'Edit Transaction' : 'Record New Transaction'}
                </h3>
                {initialData && (
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                        <option value="Achat">BUY (Achat)</option>
                        <option value="Vente">SELL (Vente)</option>
                    </select>
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ticker</label>
                    <input 
                        type="text" 
                        name="ticker"
                        value={formData.ticker}
                        onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } })}
                        placeholder="e.g. IAM"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity</label>
                    <input 
                        type="number" 
                        name="qty"
                        value={formData.qty || ''}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    />
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Price (MAD)</label>
                    <input 
                        type="number" 
                        name="price"
                        value={formData.price || ''}
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
                        className={`w-full py-2 px-4 rounded-lg text-sm font-bold text-white transition-colors flex justify-center items-center shadow-sm ${initialData ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {initialData ? 'Update' : 'Add Trade'}
                    </button>
                </div>
            </form>
        </div>
    );
};