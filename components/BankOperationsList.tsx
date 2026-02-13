import React, { useState, useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { Search, Trash2, RefreshCw, Building2 } from 'lucide-react';

export const BankOperationsList: React.FC = () => {
  const {
    bankOperations,
    deleteBankOperation,
    clearBankOperations
  } = usePortfolioContext();
  
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOps = useMemo(() => {
    if (!searchTerm) return bankOperations;
    const search = searchTerm.toLowerCase();
    return bankOperations.filter(op => 
      op.Operation.toLowerCase().includes(search) ||
      op.Description?.toLowerCase().includes(search) ||
      op.Category?.toLowerCase().includes(search)
    );
  }, [bankOperations, searchTerm]);

  const totals = useMemo(() => {
    return bankOperations.reduce((acc, op) => {
      if (op.Category === 'DEPOSIT' || op.Category === 'DIVIDEND') {
        acc.totalIn += op.Amount;
      } else if (op.Category === 'WITHDRAWAL' || op.Category === 'BANK_FEE' || op.Category === 'TAX') {
        acc.totalOut += op.Amount;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
  }, [bankOperations]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'DEPOSIT': return 'bg-green-100 text-green-800';
      case 'WITHDRAWAL': return 'bg-red-100 text-red-800';
      case 'DIVIDEND': return 'bg-blue-100 text-blue-800';
      case 'BANK_FEE': return 'bg-orange-100 text-orange-800';
      case 'TAX': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (id: number | string) => {
    if (window.confirm('Delete this bank operation?')) {
      await deleteBankOperation(id);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all bank operations? This cannot be undone.')) {
      await clearBankOperations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold text-slate-800">Bank Operations</h2>
          <span className="text-sm text-slate-500">({bankOperations.length} records)</span>
        </div>
        <button
          onClick={handleClear}
          className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Total In</p>
          <p className="text-2xl font-bold text-green-700">€{totals.totalIn.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600">Total Out</p>
          <p className="text-2xl font-bold text-red-700">€{totals.totalOut.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search bank operations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {filteredOps.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>No bank operations found</p>
          <p className="text-sm">Import a CSV to add bank operations</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Operation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOps.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{op.Date}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{op.Operation}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{op.Description || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(op.Category)}`}>
                      {op.Category}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                    op.Category === 'DEPOSIT' || op.Category === 'DIVIDEND' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {op.Category === 'DEPOSIT' || op.Category === 'DIVIDEND' ? '+' : '-'}€{Math.abs(op.Amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(op.id!)}
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
