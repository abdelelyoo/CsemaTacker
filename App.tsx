import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { parseCSV } from './utils/portfolioCalc';
import { validateCSVStructure, validateTransactionBatch } from './utils/validation';
import { Layout } from './components/Layout';
import { Upload, Database, CheckCircle2, Download, AlertCircle, Trash2 } from 'lucide-react';
import { db } from './db';
import { DuplicateManager } from './components/DuplicateManager';
import { PortfolioProvider, usePortfolioContext } from './context/PortfolioContext';
import { CloudSyncStatus } from './components/CloudSyncStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import { MetricsProvider } from './context/MetricsContext';
import { logger, logContext } from './utils/logger';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionsTab = lazy(() => import('./components/TransactionsTab').then(m => ({ default: m.TransactionsTab })));
const MoneyMgmtTab = lazy(() => import('./components/MoneyMgmtTab').then(m => ({ default: m.MoneyMgmtTab })));
const DividendCalendar = lazy(() => import('./components/DividendCalendar').then(m => ({ default: m.DividendCalendar })));
const AnalysisTab = lazy(() => import('./components/AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const SignalsTab = lazy(() => import('./components/SignalsTab').then(m => ({ default: m.SignalsTab })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm">Loading...</span>
    </div>
  </div>
);

// Tab content wrapper with Suspense
const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary fallbackMessage="This section failed to load">
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const seedingRef = useRef(false);
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);

  const {
    transactions,
    deleteTransactions,
    clearTransactions,
    importTransactions,
    duplicateGroups,
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
        logger.info(logContext.DB, 'No transactions found. Please import your CSV manually.');
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
    return undefined;
  }, [successMsg]);

  const handleExportCSV = (): void => {
    if (!transactions.length) {
      setLocalError("No data to export.");
      return;
    }

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
    URL.revokeObjectURL(url);
    setSuccessMsg("Export complete.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLocalError("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const structValid = validateCSVStructure(text);
        if (!structValid.valid) {
          setLocalError(`CSV Error: ${structValid.errors[0] ?? 'Unknown error'}`);
          return;
        }

        const { transactions: parsed, errors: parseErrors } = parseCSV(text);
        if (parseErrors.length > 0) {
          setLocalError(`Parse Error: ${parseErrors[0] ?? 'Unknown error'}`);
          return;
        }

        const txValid = validateTransactionBatch(parsed);
        if (!txValid.valid) {
          setLocalError(`Data Error: ${txValid.errors[0] ?? 'Unknown error'}`);
          return;
        }

        if (window.confirm(`Import ${parsed.length} transactions? This replaces current data.`)) {
          await importTransactions(parsed);
          setSuccessMsg(`Imported ${parsed.length} transactions.`);
        }
      } catch {
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

        {activeTab === 'dashboard' && (
          <TabContent>
            <Dashboard />
          </TabContent>
        )}
        {activeTab === 'transactions' && (
          <TabContent>
            <TransactionsTab />
          </TabContent>
        )}
        {activeTab === 'moneymgmt' && (
          <TabContent>
            <MoneyMgmtTab />
          </TabContent>
        )}
        {activeTab === 'dividends' && (
          <TabContent>
            <DividendCalendar />
          </TabContent>
        )}
        {activeTab === 'analysis' && (
          <TabContent>
            <AnalysisTab />
          </TabContent>
        )}
        {activeTab === 'signals' && (
          <TabContent>
            <SignalsTab />
          </TabContent>
        )}
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