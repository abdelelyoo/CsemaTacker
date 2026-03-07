import React, { useState } from 'react';
import { TransactionsList } from './TransactionsList';
import { BankOperationsList } from './BankOperationsList';
import { FileText, Building2 } from 'lucide-react';

type TransactionsSubTab = 'transactions' | 'bankops';

export const TransactionsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<TransactionsSubTab>('transactions');

  const subTabs: { id: TransactionsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'transactions', label: 'Transactions', icon: <FileText size={16} /> },
    { id: 'bankops', label: 'Bank Ops', icon: <Building2 size={16} /> },
  ];

  return (
    <div className="space-y-4">
      {/* SubTab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'transactions' && <TransactionsList />}
        {activeSubTab === 'bankops' && <BankOperationsList />}
      </div>
    </div>
  );
};
