import React, { useState } from 'react';
import { FundamentalsPanel } from './FundamentalsPanel';
import { ValuationScreener } from './ValuationScreener';
import { QualityDashboard } from './QualityDashboard';
import { RiskDashboard } from './RiskDashboard';
import { PieChart, BarChart3, Award, ScanLine } from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';

type AnalysisSubTab = 'fundamentals' | 'valuation' | 'quality' | 'risk';

export const AnalysisTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>('fundamentals');
  const { selectedTicker, setSelectedTicker } = useMetrics();

  const subTabs: { id: AnalysisSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'fundamentals', label: 'Fundamentals', icon: <BarChart3 size={16} /> },
    { id: 'valuation', label: 'Valuation', icon: <PieChart size={16} /> },
    { id: 'quality', label: 'Quality', icon: <Award size={16} /> },
    { id: 'risk', label: 'Risk', icon: <ScanLine size={16} /> },
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
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
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
        {activeSubTab === 'fundamentals' && <FundamentalsPanel />}
        {activeSubTab === 'valuation' && <ValuationScreener />}
        {activeSubTab === 'quality' && <QualityDashboard />}
        {activeSubTab === 'risk' && <RiskDashboard />}
      </div>
    </div>
  );
};
