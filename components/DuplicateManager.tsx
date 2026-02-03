
import React, { useState } from 'react';
import { Transaction } from '../types';
import { X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DuplicateManagerProps {
    duplicateGroups: Transaction[][];
    onDelete: (ids: number[]) => void;
    onClose: () => void;
}

export const DuplicateManager: React.FC<DuplicateManagerProps> = ({ duplicateGroups, onDelete, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const toggleSelection = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Delete ${selectedIds.size} transactions?`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const totalPossibleSaves = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Duplicate Transactions</h2>
                                <div className="flex items-center gap-4 mt-1">
                                    <p className="text-sm text-slate-500">
                                        {duplicateGroups.length} suspected groups. You can remove {totalPossibleSaves} redundant records.
                                    </p>
                                    {duplicateGroups.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const allRedundantIds = duplicateGroups.flatMap(group => group.slice(1).map(t => t.id!).filter(Boolean));
                                                setSelectedIds(new Set(allRedundantIds));
                                            }}
                                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-bold transition-colors"
                                        >
                                            Select All Redundant
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {duplicateGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-4 animate-bounce">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Clean Database!</h3>
                            <p className="text-slate-500">No duplicates detected currently.</p>
                        </div>
                    ) : (
                        duplicateGroups.map((group, groupIdx) => (
                            <div key={groupIdx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Group {groupIdx + 1}: {group[0].Ticker} ({group[0].Date})
                                    </span>
                                    <button
                                        onClick={() => {
                                            const ids = group.slice(1).map(t => t.id!).filter(Boolean);
                                            const next = new Set(selectedIds);
                                            ids.forEach(id => next.add(id));
                                            setSelectedIds(next);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Keep First, Delete Others
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {group.map((t) => (
                                        <div key={t.id} className={`flex items-center p-3 gap-4 transition-colors ${selectedIds.has(t.id!) ? 'bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(t.id!)}
                                                onChange={() => toggleSelection(t.id!)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div className="grid grid-cols-5 flex-1 gap-2 text-sm">
                                                <div className="font-medium text-slate-700">{t.Operation}</div>
                                                <div className="text-slate-500">{t.Qty} @ {t.Price}</div>
                                                <div className="text-slate-500">Total: {t.Total.toLocaleString()}</div>
                                                <div className="text-slate-400 text-xs truncate col-span-2">ID: {t.id}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-600">
                        {selectedIds.size} transactions selected for deletion
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            disabled={selectedIds.size === 0}
                            onClick={handleBulkDelete}
                            className={`px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${selectedIds.size > 0
                                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <Trash2 size={18} />
                            Delete Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
