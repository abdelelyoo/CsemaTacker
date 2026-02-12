import React, { useState, useEffect } from 'react';
import { ProfileImportService, ImportStatus } from '../services/profileImportService';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Download } from 'lucide-react';

export const ProfileImportButton: React.FC = () => {
    const [status, setStatus] = useState<ImportStatus | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        const importStatus = await ProfileImportService.getImportStatus();
        setStatus(importStatus);
    };

    const handleImport = async () => {
        setIsImporting(true);
        setError(null);
        setSuccess(null);

        try {
            const files = await ProfileImportService.loadProfileFilesFromServer();

            if (files.length === 0) {
                setError('No profile files found. Make sure profiles are accessible at /profiles/*.txt');
                setIsImporting(false);
                return;
            }

            const result = await ProfileImportService.importAllProfiles(files);

            if (result.failed.length > 0) {
                setError(
                    `Imported ${result.success} profiles, but ${result.failed.length} failed: ${result.failed
                        .slice(0, 3)
                        .map(f => f.ticker)
                        .join(', ')}${result.failed.length > 3 ? '...' : ''}`
                );
            } else {
                setSuccess(
                    `Successfully imported ${result.totalCompanies} companies with ${result.totalDividends} dividends and ${result.totalFinancialRecords} financial records!`
                );
            }

            await loadStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    const handleClear = async () => {
        if (window.confirm('Are you sure you want to clear all profile data?')) {
            await ProfileImportService.clearProfileData();
            await loadStatus();
            setSuccess('Profile data cleared');
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                        <Database size={18} className="text-blue-600" />
                        Company Profile Database
                    </span>
                    {status && (
                        <span className="text-sm text-slate-500">
                            {status.isImported
                                ? `${status.companiesLoaded} companies loaded${status.lastImportDate
                                    ? ` on ${status.lastImportDate.toLocaleDateString()}`
                                    : ''
                                }`
                                : 'No profile data loaded'}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-medium transition-colors"
                    >
                        {isImporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Importing...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>{status?.isImported ? 'Re-import' : 'Import'} Profiles</span>
                            </>
                        )}
                    </button>

                    {status?.isImported && (
                        <button
                            onClick={handleClear}
                            disabled={isImporting}
                            className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium border border-transparent hover:border-rose-100 flex items-center gap-2"
                        >
                            <RefreshCw size={14} />
                            Clear Data
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{success}</span>
                </div>
            )}
        </div>
    );
};
