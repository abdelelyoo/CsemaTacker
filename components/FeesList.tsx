import React, { useState, useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { Search, Trash2, Receipt } from 'lucide-react';

export const FeesList: React.FC = () => {
  const {
    fees,
    deleteFee,
    clearFees
  } = usePortfolioContext();
  
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFees = useMemo(() => {
    if (!searchTerm) return fees;
    const search = searchTerm.toLowerCase();
    return fees.filter(fee => 
      fee.type.toLowerCase().includes(search) ||
      fee.description?.toLowerCase().includes(search)
    );
  }, [fees, searchTerm]);

  const totals = useMemo(() => {
    return fees.reduce((acc, fee) => {
      if (fee.type === 'SUB') {
        acc.subscription += fee.amount;
      } else if (fee.type === 'CUS') {
        acc.custody += fee.amount;
      }
      acc.total += fee.amount;
      return acc;
    }, { subscription: 0, custody: 0, total: 0 });
  }, [fees]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUB': return 'bg-purple-100 text-purple-800';
      case 'CUS': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SUB': return 'Subscription';
      case 'CUS': return 'Custody';
      default: return type;
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this fee record?')) {
      await deleteFee(id);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all fees? This cannot be undone.')) {
      await clearFees();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800">Fees</h2>
          <span className="text-sm text-slate-500">({fees.length} records)</span>
        </div>
        <button
          onClick={handleClear}
          className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600">Subscription Fees</p>
          <p className="text-2xl font-bold text-purple-700">€{totals.subscription.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-600">Custody Fees</p>
          <p className="text-2xl font-bold text-orange-700">€{totals.custody.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600">Total Fees</p>
          <p className="text-2xl font-bold text-red-700">€{totals.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search fees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {filteredFees.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Receipt size={48} className="mx-auto mb-4 opacity-50" />
          <p>No fees found</p>
          <p className="text-sm">Import a CSV to add fees</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{fee.date instanceof Date ? fee.date.toLocaleDateString() : String(fee.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(fee.type)}`}>
                      {getTypeLabel(fee.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{fee.description || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                    -€{fee.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(fee.id!)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
