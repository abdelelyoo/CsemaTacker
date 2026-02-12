import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  LayoutDashboard, 
  FileText, 
  Calculator, 
  Banknote, 
  Award, 
  PieChart, 
  Check, 
  ScanLine, 
  BrainCircuit 
} from 'lucide-react';

interface TabOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface FloatingActionButtonProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: TabOption[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, color: 'bg-blue-500' },
  { id: 'transactions', label: 'Transactions', icon: <FileText size={20} />, color: 'bg-emerald-500' },
  { id: 'moneymgmt', label: 'Money Mgmt', icon: <Calculator size={20} />, color: 'bg-violet-500' },
  { id: 'dividends', label: 'Dividends', icon: <Banknote size={20} />, color: 'bg-amber-500' },
  { id: 'fundamentals', label: 'Fundamentals', icon: <Award size={20} />, color: 'bg-indigo-500' },
  { id: 'valuation', label: 'Valuation', icon: <PieChart size={20} />, color: 'bg-pink-500' },
  { id: 'quality', label: 'Quality', icon: <Check size={20} />, color: 'bg-teal-500' },
  { id: 'risk', label: 'Risk', icon: <ScanLine size={20} />, color: 'bg-rose-500' },
  { id: 'insights', label: 'Insights', icon: <BrainCircuit size={20} />, color: 'bg-cyan-500' },
];

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const fabRef = useRef<HTMLDivElement>(null);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsOpen(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle tab selection
  const handleTabSelect = (tabId: string) => {
    console.log('Tab selected:', tabId);
    onTabChange(tabId);
    setIsOpen(false);
  };

  // Get current tab info
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div 
      ref={fabRef}
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      {/* Tab Options Menu */}
      <div 
        className={`flex flex-col items-end space-y-3 mb-4 ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease'
        }}
      >
        {tabs.filter(tab => tab.id !== activeTab).map((tab, index) => (
          <div
            key={tab.id}
            onClick={() => handleTabSelect(tab.id)}
            className="flex items-center group cursor-pointer"
            style={{
              transform: isOpen ? 'translateX(0)' : 'translateX(20px)',
              opacity: isOpen ? 1 : 0,
              transition: `all 0.3s ease ${isOpen ? index * 0.05 : 0}s`
            }}
          >
            {/* Label */}
            <span 
              className="mr-3 bg-white text-slate-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-slate-200 pointer-events-none"
            >
              {tab.label}
            </span>
            
            {/* Icon Button */}
            <div 
              className={`w-12 h-12 ${tab.color} text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200 pointer-events-none`}
            >
              {tab.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Active Tab Indicator */}
      <div 
        className="flex items-center mb-3"
        style={{
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}
      >
        <span className="mr-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-md text-sm font-medium">
          {currentTab.label}
        </span>
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-rose-500 text-white' 
            : `${currentTab.color} text-white`
        }`}
        style={{
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
};

export default FloatingActionButton;
