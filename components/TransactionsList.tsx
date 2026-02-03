import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, PortfolioSummary } from '../types';
import { Search, Filter, Plus, Edit2, Trash2, AlertCircle, X, Calendar, RefreshCw } from 'lucide-react';
import { AddTransactionModal } from './AddTransactionModal';

import { usePortfolioContext } from '../context/PortfolioContext';

export const TransactionsList: React.FC = () => {
  const {
    enrichedTransactions: transactions,
    portfolio,
    addTransaction: onAddTransaction,
    deleteTransaction: onDeleteTransaction,
    updateTransaction: onEditTransaction,
    currentPrices
  } = usePortfolioContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'ALL',
    ticker: 'ALL'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Extract unique values for filter dropdowns
  const uniqueTickers = useMemo(() => {
    const tickers = new Set(transactions.map(t => t.Ticker).filter(Boolean));
    return Array.from(tickers).sort();
  }, [transactions]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.Operation).filter(Boolean));
    return Array.from(types).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // 1. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        t.Ticker.toLowerCase().includes(searchLower) ||
        t.Company.toLowerCase().includes(searchLower) ||
        t.Operation.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Date Range
      // Convert transaction date to YYYY-MM-DD for reliable string comparison
      const year = t.parsedDate.getFullYear();
      const month = String(t.parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(t.parsedDate.getDate()).padStart(2, '0');
      const txDateStr = `${year}-${month}-${day}`;

      if (filters.startDate && txDateStr < filters.startDate) return false;
      if (filters.endDate && txDateStr > filters.endDate) return false;

      // 3. Type Filter
      if (filters.type !== 'ALL' && t.Operation !== filters.type) return false;

      // 4. Ticker Filter
      if (filters.ticker !== 'ALL' && t.Ticker !== filters.ticker) return false;

      return true;
    });
  }, [transactions, searchTerm, filters]);

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', type: 'ALL', ticker: 'ALL' });
    setSearchTerm('');
  };

  const activeFiltersCount = [
    filters.startDate,
    filters.endDate,
    filters.type !== 'ALL',
    filters.ticker !== 'ALL'
  ].filter(Boolean).length;

  const getOpBadgeColor = (op: string) => {
    op = op.toLowerCase();
    if (op === 'achat') return 'bg-emerald-100 text-emerald-700';
    if (op === 'vente') return 'bg-rose-100 text-rose-700';
    if (op === 'depot') return 'bg-blue-100 text-blue-700';
    if (op === 'dividende') return 'bg-purple-100 text-purple-700';
    if (op === 'taxe' || op === 'frais') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getPLColor = (pl: number | undefined) => {
    if (pl === undefined || pl === null) return 'text-slate-400';
    if (pl > 0) return 'text-emerald-600';
    if (pl < 0) return 'text-rose-600';
    return 'text-slate-500'; // 0 / Neutral
  };

  const handleDelete = (id: number | string) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      onDeleteTransaction?.(id);
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden pb-20 md:pb-0 relative">
      {/* Add Modal */}
      {isAddModalOpen && onAddTransaction && (
        <AddTransactionModal
          onSave={onAddTransaction}
          onClose={() => setIsAddModalOpen(false)}
          holdings={portfolio?.holdings}
          currentPrices={currentPrices}
        />
      )}

      {/* Add Modal */}

      {/* Edit Modal */}
      {editingTransaction && onEditTransaction && (
        <AddTransactionModal
          initialData={editingTransaction}
          onSave={(data) => {
            if (editingTransaction.id !== undefined) {
              onEditTransaction(editingTransaction.id, data);
            } else if (onAddTransaction) {
              // Handle virtual/auto transactions (like SUB Auto) by creating a real one
              onAddTransaction(data);
            }
            setEditingTransaction(null);
          }}
          onClose={() => setEditingTransaction(null)}
          holdings={portfolio?.holdings}
          currentPrices={currentPrices}
        />
      )}

      <div className="p-4 border-b border-slate-100">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <h2 className="font-semibold text-slate-800">Transaction History</h2>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search text..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors border ${showFilters || activeFiltersCount > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <Filter size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 bg-blue-200 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {onAddTransaction && (
              <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add New</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="date"
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="date"
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="ALL">All Operations</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ticker</label>
              <select
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filters.ticker}
                onChange={(e) => handleFilterChange('ticker', e.target.value)}
              >
                <option value="ALL">All Tickers</option>
                {uniqueTickers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <X size={14} />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Fees</th>
              <th className="px-4 py-3 text-right">Tax</th>
              <th className="px-4 py-3 text-right">Net Amount</th>
              <th className="px-4 py-3 text-right">Realized P&L</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3 text-slate-600">{t.Date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpBadgeColor(t.Operation)}`}>
                    {t.Operation}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {t.Ticker || t.Company || '-'}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {t.Qty ? Math.abs(t.Qty).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {t.Price ? t.Price.toFixed(2) : '-'}
                </td>
                <td className="px-4 py-3 text-right text-rose-600 text-xs">
                  {t.Fees ? t.Fees.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                </td>
                <td className="px-4 py-3 text-right text-rose-600 text-xs">
                  {t.Tax ? t.Tax.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  {t.Total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${getPLColor(t.RealizedPL)}`}>
                  {t.RealizedPL !== undefined && t.RealizedPL !== null
                    ? `${t.RealizedPL > 0 ? '+' : ''}${t.RealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {onEditTransaction && (
                      <button
                        onClick={() => setEditingTransaction(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {onDeleteTransaction && t.id !== undefined && (
                      <button
                        onClick={() => handleDelete(t.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400">
          No transactions found matching your search.
        </div>
      )}
    </div>
  );
};