
import React, { useState, useEffect } from 'react';
import { parseCSV } from './utils/portfolioCalc';
import { validateCSVStructure, validateTransactionBatch } from './utils/validation';
import { INITIAL_CSV_DATA } from './constants';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionsList } from './components/TransactionsList';
import { BankOperationsList } from './components/BankOperationsList';
import { FeesList } from './components/FeesList';
import { MoneyManagement } from './components/MoneyManagement';
import { Upload, Database, RefreshCw, CheckCircle2, Download, AlertCircle } from 'lucide-react';
import { db } from './db';
import { DuplicateManager } from './components/DuplicateManager';
import { PortfolioProvider, usePortfolioContext } from './context/PortfolioContext';
import { ProfileImportButton } from './components/ProfileImportButton';
import { DividendCalendar } from './components/DividendCalendar';
import { FundamentalsPanel } from './components/FundamentalsPanel';
import { ValuationScreener } from './components/ValuationScreener';
import { QualityDashboard } from './components/QualityDashboard';
import { RiskDashboard } from './components/RiskDashboard';
import { AIInsights } from './components/AIInsights';
import { CloudSyncStatus } from './components/CloudSyncStatus';


const AppInner = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);

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

  // 1. Initial DB Seeding Effect
  useEffect(() => {
    const seedDatabase = async () => {
      const count = await db.transactions.count();
      if (count === 0 && !isSeeding) {
        setIsSeeding(true);
        try {
          const { transactions: initialData, errors } = parseCSV(INITIAL_CSV_DATA);
          if (errors.length > 0) {
            setLocalError(`Initial seed failed: ${errors[0]}`);
          } else {
            await importTransactions(initialData);
            setSuccessMsg("Database initialized with sample data.");
          }
        } catch (e) {
          setLocalError("Failed to seed database.");
        } finally {
          setIsSeeding(false);
        }
      }
    };
    seedDatabase();
  }, []);

  // Toast Cleanup
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleExportCSV = () => {
    if (!transactions.length) return setLocalError("No data to export.");

    const headers = ['Date', 'Company', 'Ticker', 'Operation', 'Qty', 'Price', 'Total', 'Fees', 'Tax', 'Realized P&L'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx => [
        `"${tx.Date}"`, `"${tx.Company}"`, `"${tx.Ticker}"`, `"${tx.Operation}"`,
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

    // Limit file size to 5MB
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
            <button onClick={async () => { if (window.confirm("Clear DB?")) await clearTransactions(); }} className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium border border-transparent hover:border-rose-100 flex items-center gap-2 ml-2">
              <RefreshCw size={14} />
              Reset
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
        <>
          <ProfileImportButton />
          <Dashboard />
        </>
      )}
      {activeTab === 'transactions' && (
        <TransactionsList />
      )}
      {activeTab === 'bankops' && (
        <BankOperationsList />
      )}
      {activeTab === 'fees' && (
        <FeesList />
      )}
      {activeTab === 'moneymgmt' && <MoneyManagement />}
      {activeTab === 'dividends' && <DividendCalendar />}
      {activeTab === 'fundamentals' && <FundamentalsPanel />}
      {activeTab === 'valuation' && <ValuationScreener />}
      {activeTab === 'quality' && <QualityDashboard />}
      {activeTab === 'risk' && <RiskDashboard />}
      {activeTab === 'insights' && <AIInsights />}
    </Layout>
  );
};

const App = () => (
  <PortfolioProvider>
    <AppInner />
  </PortfolioProvider>
);

export default App;
