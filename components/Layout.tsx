import React, { useState } from 'react';
import FloatingActionButton from './FloatingActionButton';
import { SettingsPanel } from './SettingsPanel';
import { ShortcutsModal } from './ShortcutsModal';
import { useSettings } from '../context/SettingsContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Settings, Keyboard, Shield, Bell, User, Layout as LayoutIcon, Activity } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { showShortcuts } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dark:bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tighter leading-none">ATLAS</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Portfolio Manager</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutIcon size={14} />
                <span>TERMINAL</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity size={14} />
                <span>ANALYTICS</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">System Nominal</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900"></span>
              </button>
              <button
                onClick={showShortcuts}
                className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                title="Shortcuts (?)"
              >
                <Keyboard size={20} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg group-hover:scale-105 transition-transform">
                  <User size={16} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-24">
        {children}
      </main>

      {/* Floating Action Button - Primary Navigation */}
      <FloatingActionButton activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings Panel Modal */}
      <ErrorBoundary fallbackMessage="Settings failed to load">
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </ErrorBoundary>

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal />
    </div>
  );
};
