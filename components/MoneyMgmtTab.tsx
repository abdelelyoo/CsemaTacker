import React, { useState } from 'react';
import { MoneyManagement } from './MoneyManagement';
import { GLMInsights } from './GLMInsights';
import { Calculator, Sparkles } from 'lucide-react';

type MoneyMgmtSubTab = 'moneymgmt' | 'insights';

export const MoneyMgmtTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<MoneyMgmtSubTab>('moneymgmt');

  const subTabs: { id: MoneyMgmtSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'moneymgmt', label: 'Money Mgmt', icon: <Calculator size={16} /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeSubTab === 'moneymgmt' && <MoneyManagement />}
        {activeSubTab === 'insights' && <GLMInsights />}
      </div>
    </div>
  );
};
