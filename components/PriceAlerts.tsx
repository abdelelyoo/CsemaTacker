import React, { useState } from 'react';
import { PriceAlert } from '../types';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils';

interface PriceAlertsProps {
    alerts: PriceAlert[];
    prices: Record<string, number>;
    onAdd: (alert: PriceAlert) => void;
    onDelete: (id: string) => void;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({ alerts, prices, onAdd, onDelete }) => {
    const [newAlert, setNewAlert] = useState<Partial<PriceAlert>>({
        ticker: '',
        threshold: 0,
        condition: 'ABOVE'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlert.ticker || !newAlert.threshold) return;

        onAdd({
            id: `alert-${Date.now()}`,
            ticker: newAlert.ticker.toUpperCase(),
            threshold: Number(newAlert.threshold),
            condition: newAlert.condition as 'ABOVE' | 'BELOW'
        });

        setNewAlert({ ticker: '', threshold: 0, condition: 'ABOVE' });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-slate-700">Stock Price Alerts</h4>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Alert Form */}
                <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-8">
                    <h5 className="text-sm font-bold text-slate-500 uppercase mb-4">Set New Alert</h5>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase">Ticker</label>
                            <input 
                                type="text"
                                placeholder="e.g. VCN"
                                value={newAlert.ticker}
                                onChange={e => setNewAlert({...newAlert, ticker: e.target.value.toUpperCase()})}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase">Condition</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewAlert({...newAlert, condition: 'ABOVE'})}
                                    className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${newAlert.condition === 'ABOVE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                                >
                                    <TrendingUp className="w-4 h-4 mr-1" /> ≥ Above
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewAlert({...newAlert, condition: 'BELOW'})}
                                    className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${newAlert.condition === 'BELOW' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                                >
                                    <TrendingDown className="w-4 h-4 mr-1" /> ≤ Below
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-1 uppercase">Price Threshold</label>
                            <input 
                                type="number"
                                placeholder="0.00"
                                value={newAlert.threshold || ''}
                                onChange={e => setNewAlert({...newAlert, threshold: parseFloat(e.target.value)})}
                                step="0.01"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create Alert
                        </button>
                    </form>
                </div>

                {/* Active Alerts List */}
                <div className="lg:col-span-2">
                    <h5 className="text-sm font-bold text-slate-500 uppercase mb-4 flex justify-between items-center">
                        <span>Active Monitors</span>
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">{alerts.length}</span>
                    </h5>
                    
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400">
                            <Bell className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No active price alerts</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {alerts.map(alert => {
                                const currentPrice = prices[alert.ticker] || 0;
                                const isTriggered = currentPrice > 0 && (
                                    (alert.condition === 'ABOVE' && currentPrice >= alert.threshold) ||
                                    (alert.condition === 'BELOW' && currentPrice <= alert.threshold)
                                );

                                return (
                                    <div 
                                        key={alert.id} 
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                            isTriggered 
                                            ? 'bg-amber-50 border-amber-200 shadow-sm' 
                                            : 'bg-white border-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${isTriggered ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {isTriggered ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{alert.ticker}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                        alert.condition === 'ABOVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {alert.condition === 'ABOVE' ? 'Above' : 'Below'}
                                                    </span>
                                                    <span className="font-mono font-medium text-slate-600">{formatCurrency(alert.threshold)}</span>
                                                </div>
                                                <div className="text-xs mt-1 flex items-center gap-1">
                                                    <span className="text-slate-400">Current:</span> 
                                                    <span className={`font-mono font-bold ${isTriggered ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {formatCurrency(currentPrice)}
                                                    </span>
                                                    {isTriggered && <span className="text-amber-600 font-bold ml-1 animate-pulse">• Condition Met</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onDelete(alert.id)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                            title="Dismiss Alert"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
