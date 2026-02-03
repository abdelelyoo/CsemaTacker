import React from 'react';
import { LayoutDashboard, PieChart, FileText, BrainCircuit, ScanLine, Calculator } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden md:block">Atlas Portfolio Manager</h1>
            <h1 className="text-xl font-bold tracking-tight md:hidden">Atlas</h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-1">
            <NavButton
              label="Dashboard"
              id="dashboard"
              active={activeTab === 'dashboard'}
              onClick={setActiveTab}
              icon={<LayoutDashboard size={18} />}
            />
            <NavButton
              label="Transactions"
              id="transactions"
              active={activeTab === 'transactions'}
              onClick={setActiveTab}
              icon={<FileText size={18} />}
            />
            <NavButton
              label="Money Mgmt"
              id="moneymgmt"
              active={activeTab === 'moneymgmt'}
              onClick={setActiveTab}
              icon={<Calculator size={18} />}
            />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around shadow-lg z-50">
        <NavButtonMobile
          label="Dash"
          id="dashboard"
          active={activeTab === 'dashboard'}
          onClick={setActiveTab}
          icon={<LayoutDashboard size={20} />}
        />
        <NavButtonMobile
          label="Trans."
          id="transactions"
          active={activeTab === 'transactions'}
          onClick={setActiveTab}
          icon={<FileText size={20} />}
        />
        <NavButtonMobile
          label="Kelly"
          id="moneymgmt"
          active={activeTab === 'moneymgmt'}
          onClick={setActiveTab}
          icon={<Calculator size={20} />}
        />
      </div>
    </div>
  );
};

const NavButton = ({ label, id, active, onClick, icon }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${active
        ? 'bg-slate-800 text-emerald-400 font-medium'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const NavButtonMobile = ({ label, id, active, onClick, icon }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex flex-col items-center justify-center space-y-1 p-2 w-full ${active ? 'text-emerald-600' : 'text-slate-500'
      }`}
  >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);