import React from 'react';
import FloatingActionButton from './FloatingActionButton';

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

          {/* Header Actions - Optional, can be added here */}
          <div className="flex items-center space-x-4">
            {/* Current Tab Name Display */}
            <span className="text-sm text-slate-400 hidden md:block">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-24">
        {children}
      </main>

      {/* Floating Action Button - Primary Navigation */}
      <FloatingActionButton activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
