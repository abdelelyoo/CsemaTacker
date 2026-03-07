import React, { useState, useEffect } from 'react';
import { ProfileImportService, ImportStatus } from '../services/profileImportService';
import { Database, RefreshCw, Download } from 'lucide-react';

export const ProfileImportButton: React.FC = () => {
    const [status, setStatus] = useState<ImportStatus | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        const importStatus = await ProfileImportService.getImportStatus();
        setStatus(importStatus);
    };

    const handleImport = async () => {
        setIsImporting(true);

        try {
            const files = await ProfileImportService.loadProfileFilesFromServer();

            if (files.length === 0) {
                alert('No profile files found. Make sure profiles are accessible at /profiles/*.txt');
                setIsImporting(false);
                return;
            }

            await ProfileImportService.importAllProfiles(files);
            await loadStatus();
        } catch (err) {
            console.error('Import failed:', err);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClear = async () => {
        if (window.confirm('Are you sure you want to clear all profile data?')) {
            await ProfileImportService.clearProfileData();
            await loadStatus();
        }
    };

    return (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <Database size={18} className="text-blue-600" />
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-sm">
                        Ownership Data
                    </span>
                    {status && (
                        <span className="text-xs text-slate-500">
                            {status.isImported
                                ? `${status.companiesLoaded} companies loaded`
                                : 'No shareholder data loaded'}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-medium transition-colors text-sm"
                >
                    {isImporting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Importing...</span>
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            <span>{status?.isImported ? 'Re-import' : 'Import'} Shareholders</span>
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
    );
};
