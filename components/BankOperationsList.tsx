import React, { useState, useMemo } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { Search, Trash2, Plus, Building2, Receipt, X, Edit2 } from 'lucide-react';
import { FeeType } from '../types';
import { formatCurrency } from '../utils/helpers';

interface UnifiedRecord {
  id: string | number;
  type: 'bank_op' | 'fee';
  date: string;
  operation: string;
  category: string;
  description: string;
  amount: number;
}

export const BankOperationsList: React.FC = () => {
  const {
    bankOperations,
    deleteBankOperation,
    clearBankOperations,
    fees,
    deleteFee,
    clearFees,
    addFee,
    addBankOperation
  } = usePortfolioContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFeeForm, setShowAddFeeForm] = useState(false);
  const [showAddBankOpForm, setShowAddBankOpForm] = useState(false);
  
  // Form states
  const [newFeeDate, setNewFeeDate] = useState(new Date().toISOString().split('T')[0]);
  const [newFeeType, setNewFeeType] = useState<FeeType>('SUB');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDesc, setNewFeeDesc] = useState('');
  
  const [newOpDate, setNewOpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOpType, setNewOpType] = useState('DEPOSIT');
  const [newOpAmount, setNewOpAmount] = useState('');
  const [newOpDesc, setNewOpDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit state
  const [editingRecord, setEditingRecord] = useState<UnifiedRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const unifiedRecords: UnifiedRecord[] = useMemo(() => {
    const records: UnifiedRecord[] = [];
    
    bankOperations.forEach(op => {
      records.push({
        id: op.id!,
        type: 'bank_op',
        date: op.Date,
        operation: op.Operation,
        category: op.Category || op.Operation,
        description: op.Description || '',
        amount: op.Amount
      });
    });
    
    fees.forEach(fee => {
      records.push({
        id: fee.id!,
        type: 'fee',
        date: fee.date instanceof Date ? fee.date.toISOString().split('T')[0] : String(fee.date),
        operation: fee.type === 'SUB' ? 'Subscription Fee' : 'Custody Fee',
        category: fee.type === 'SUB' ? 'SUBSCRIPTION' : 'CUSTODY',
        description: fee.description || '',
        amount: fee.amount
      });
    });
    
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return records;
  }, [bankOperations, fees]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return unifiedRecords;
    const search = searchTerm.toLowerCase();
    return unifiedRecords.filter(r => 
      r.operation.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search) ||
      r.category.toLowerCase().includes(search)
    );
  }, [unifiedRecords, searchTerm]);

  const totals = useMemo(() => {
    return unifiedRecords.reduce((acc, r) => {
      if (r.category === 'DEPOSIT' || r.category === 'DIVIDEND' || r.category === 'TAX') {
        acc.totalIn += r.amount;
      } else {
        acc.totalOut += r.amount;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
  }, [unifiedRecords]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'DEPOSIT': return 'bg-green-100 text-green-800';
      case 'WITHDRAWAL': return 'bg-red-100 text-red-800';
      case 'DIVIDEND': return 'bg-blue-100 text-blue-800';
      case 'BANK_FEE': return 'bg-orange-100 text-orange-800';
      case 'TAX': return 'bg-purple-100 text-purple-800';
      case 'SUBSCRIPTION': return 'bg-purple-100 text-purple-800';
      case 'CUSTODY': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (record: UnifiedRecord) => {
    if (!window.confirm(`Delete this ${record.type === 'bank_op' ? 'bank operation' : 'fee'}?`)) return;
    
    if (record.type === 'bank_op') {
      await deleteBankOperation(record.id);
    } else {
      await deleteFee(record.id as number);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all bank operations and fees? This cannot be undone.')) return;
    await clearBankOperations();
    await clearFees();
  };

  const handleEdit = (record: UnifiedRecord) => {
    setEditingRecord(record);
    setEditDate(record.date);
    setEditType(record.category);
    setEditAmount(String(record.amount));
    setEditDesc(record.description);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editAmount) return;
    
    const amount = parseFloat(editAmount);
    const date = new Date(editDate);
    
    if (isNaN(amount) || isNaN(date.getTime())) {
      alert('Invalid date or amount');
      return;
    }

    try {
      if (editingRecord.type === 'bank_op') {
        await deleteBankOperation(editingRecord.id);
        await addBankOperation({
          Date: date.toISOString().split('T')[0],
          parsedDate: date,
          Operation: editType,
          Description: editDesc,
          Amount: amount,
          Category: editType
        });
      } else {
        await deleteFee(editingRecord.id as number);
        await addFee(date, editType as FeeType, amount, editDesc);
      }
      setEditingRecord(null);
    } catch (e) {
      console.error('Error updating record:', e);
      alert('Failed to update record');
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
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

      await addFee(date, newFeeType, amount, newFeeDesc);
      setNewFeeAmount('');
      setNewFeeDesc('');
      setShowAddFeeForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBankOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(newOpAmount);
      const date = new Date(newOpDate);

      if (isNaN(amount) || isNaN(date.getTime())) {
        alert('Invalid date or amount');
        return;
      }

      await addBankOperation({
        Date: date.toISOString().split('T')[0],
        parsedDate: date,
        Operation: newOpType,
        Description: newOpDesc,
        Amount: amount,
        Category: newOpType
      });
      setNewOpAmount('');
      setNewOpDesc('');
      setShowAddBankOpForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold text-slate-800">Bank Operations & Fees</h2>
          <span className="text-sm text-slate-500">({unifiedRecords.length} records)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddFeeForm(true)}
            className="text-sm bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 flex items-center gap-1"
          >
            <Plus size={14} /> Add Fee
          </button>
          <button
            onClick={() => setShowAddBankOpForm(true)}
            className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 flex items-center gap-1"
          >
            <Plus size={14} /> Add Bank Op
          </button>
          <button
            onClick={handleClearAll}
            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Total In (Deposits, Dividends, Tax Refunds)</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.totalIn)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600">Total Out (Withdrawals, Fees, Taxes Paid)</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.totalOut)}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search bank operations and fees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>No bank operations or fees found</p>
          <p className="text-sm">Import a CSV or add manually</p>
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
              {filteredRecords.map((record) => (
                <tr key={`${record.type}-${record.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{record.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(record.category)}`}>
                      {record.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.description || '-'}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                    record.category === 'DEPOSIT' || record.category === 'DIVIDEND' || record.category === 'TAX' 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.category === 'DEPOSIT' || record.category === 'DIVIDEND' || record.category === 'TAX' ? '+' : '-'}{formatCurrency(Math.abs(record.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-slate-400 hover:text-blue-500"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddFeeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Fee</h3>
              <button onClick={() => setShowAddFeeForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddFee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newFeeDate}
                  onChange={(e) => setNewFeeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newFeeType}
                  onChange={(e) => setNewFeeType(e.target.value as FeeType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="SUB">Subscription Fee</option>
                  <option value="CUS">Custody Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newFeeAmount}
                  onChange={(e) => setNewFeeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newFeeDesc}
                  onChange={(e) => setNewFeeDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Optional description"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Fee'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Op Modal */}
      {showAddBankOpForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Bank Operation</h3>
              <button onClick={() => setShowAddBankOpForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddBankOp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newOpDate}
                  onChange={(e) => setNewOpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newOpType}
                  onChange={(e) => setNewOpType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                  <option value="DIVIDEND">Dividend</option>
                  <option value="BANK_FEE">Bank Fee</option>
                  <option value="TAX">Tax (Refund)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOpAmount}
                  onChange={(e) => setNewOpAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newOpDesc}
                  onChange={(e) => setNewOpDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Optional description"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Operation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit {editingRecord.type === 'bank_op' ? 'Bank Operation' : 'Fee'}</h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {editingRecord.type === 'fee' ? (
                    <>
                      <option value="SUB">Subscription Fee</option>
                      <option value="CUS">Custody Fee</option>
                    </>
                  ) : (
                    <>
                      <option value="DEPOSIT">Deposit</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                      <option value="DIVIDEND">Dividend</option>
                      <option value="BANK_FEE">Bank Fee</option>
                      <option value="TAX">Tax (Refund)</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Optional description"
                />
              </div>
              <button
                onClick={handleSaveEdit}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
