
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parseCSV } from './utils/portfolioCalc';
import { validateCSVStructure, validateTransactionBatch } from './utils/validation';
import { INITIAL_CSV_DATA } from './constants';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Upload, Database, RefreshCw, CheckCircle2, Download, AlertCircle, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { db } from './db';
import { DuplicateManager } from './components/DuplicateManager';
import { PortfolioProvider, usePortfolioContext } from './context/PortfolioContext';
import { DividendCalendar } from './components/DividendCalendar';
import { AnalysisTab } from './components/AnalysisTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SignalsTab } from './components/SignalsTab';
import { MoneyMgmtTab } from './components/MoneyMgmtTab';
import { CloudSyncStatus } from './components/CloudSyncStatus';
import { SettingsPanel } from './components/SettingsPanel';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { MetricsProvider } from './context/MetricsContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const seedingRef = useRef(false);
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { showShortcuts } = useSettings();

  const {
    transactions,
    enrichedTransactions,
    addTransaction,
    deleteTransaction,
    deleteTransactions,
    updateTransaction,
    clearTransactions,
    importTransactions,
    duplicateGroups,
    portfolio,
    currentPrices,
    updateManualPrices,
    isFeedConnected,
    dbError,
    clearDbError
  } = usePortfolioContext();

  const error = localError || dbError;

  const handleNavigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    let mounted = true;
    const seedDatabase = async () => {
      if (seedingRef.current || !mounted) return;
      const count = await db.transactions.count();
      if (count === 0 && mounted) {
        console.log('No transactions found. Please import your CSV manually.');
      }
    };
    seedDatabase();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleExportCSV = () => {
    if (!transactions.length) return setLocalError("No data to export.");

    const headers = ['Date', 'Company', 'ISIN', 'Operation', 'Ticker', 'Qty', 'Price', 'Total', 'Fees', 'TPCVM', 'Realized P&L'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx => [
        `"${tx.Date}"`, `"${tx.Company}"`, `"${tx.ISIN || ''}"`, `"${tx.Operation}"`, `"${tx.Ticker}"`,
        tx.Qty, tx.Price, tx.Total, tx.Fees || 0, tx.Tax || 0, tx.RealizedPL || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atlas_portfolio_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    setSuccessMsg("Export complete.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return setLocalError("File too large. Maximum size is 5MB.");
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const structValid = validateCSVStructure(text);
        if (!structValid.valid) return setLocalError(`CSV Error: ${structValid.errors[0]}`);

        const { transactions: parsed, errors: parseErrors } = parseCSV(text);
        if (parseErrors.length > 0) return setLocalError(`Parse Error: ${parseErrors[0]}`);

        const txValid = validateTransactionBatch(parsed);
        if (!txValid.valid) return setLocalError(`Data Error: ${txValid.errors[0]}`);

        if (window.confirm(`Import ${parsed.length} transactions? This replaces current data.`)) {
          await importTransactions(parsed);
          setSuccessMsg(`Imported ${parsed.length} transactions.`);
        }
      } catch (e) {
        setLocalError("Import failed.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <MetricsProvider onNavigateToTab={handleNavigateToTab}>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {error && (
          <div className="fixed top-20 right-4 z-50 bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded shadow-lg flex items-center gap-2">
            <strong>Error</strong>
            <span>{error}</span>
            <button onClick={() => { setLocalError(null); clearDbError(); }} className="ml-2 font-bold">&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="fixed top-20 right-4 z-50 bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded shadow-lg flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                <Database size={18} className="text-emerald-600" />
                Database Active
              </span>
              <span className="text-sm text-slate-500">
                {transactions.length} records stored securely.
              </span>
            </div>
            <CloudSyncStatus onMigrationComplete={() => setSuccessMsg('Data migrated to cloud successfully!')} />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleExportCSV} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg flex items-center space-x-2 font-medium">
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg flex items-center space-x-2 font-medium">
                <Upload size={16} />
                <span>Import CSV</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button onClick={async () => { if (window.confirm("Clear ALL transactions? This cannot be undone.")) await clearTransactions(); }} className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium border border-transparent hover:border-rose-100 flex items-center gap-2 ml-2">
                <Trash2 size={14} />
                Clear All
              </button>
              <button
                onClick={() => setShowDuplicateManager(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-all ${duplicateGroups.length > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  }`}
              >
                <AlertCircle size={16} />
                <span>Duplication Check</span>
                {duplicateGroups.length > 0 && (
                  <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {duplicateGroups.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {showDuplicateManager && (
          <DuplicateManager
            duplicateGroups={duplicateGroups}
            onDelete={async (ids) => {
              await deleteTransactions(ids);
            }}
            onClose={() => setShowDuplicateManager(false)}
          />
        )}

        {isSeeding && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="font-bold text-slate-800">Setting up Database...</h3>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <ErrorBoundary fallbackMessage="Dashboard failed to load">
            <Dashboard />
          </ErrorBoundary>
        )}
        {activeTab === 'transactions' && (
          <ErrorBoundary fallbackMessage="Transactions tab failed to load">
            <TransactionsTab />
          </ErrorBoundary>
        )}
        {activeTab === 'moneymgmt' && (
          <ErrorBoundary fallbackMessage="Money management tab failed to load">
            <MoneyMgmtTab />
          </ErrorBoundary>
        )}
        {activeTab === 'dividends' && <ErrorBoundary fallbackMessage="Dividend calendar failed to load"><DividendCalendar /></ErrorBoundary>}
        {activeTab === 'analysis' && <ErrorBoundary fallbackMessage="Analysis panel failed to load"><AnalysisTab /></ErrorBoundary>}
        {activeTab === 'signals' && <ErrorBoundary fallbackMessage="Signals tab failed to load"><SignalsTab /></ErrorBoundary>}
      </Layout>
    </MetricsProvider>
  );
};

const App = () => (
  <SettingsProvider>
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  </SettingsProvider>
);

export default App;
