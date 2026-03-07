import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'Ctrl + N', description: 'New transaction' },
  { key: 'Ctrl + S', description: 'Save / Sync' },
  { key: 'Ctrl + F', description: 'Search / Filter' },
  { key: 'Ctrl + H', description: 'Go to Dashboard' },
  { key: 'Ctrl + P', description: 'Go to Portfolio' },
  { key: 'Ctrl + T', description: 'Go to Transactions' },
  { key: 'Ctrl + D', description: 'Go to Dividends' },
  { key: 'Ctrl + R', description: 'Go to Risk Analysis' },
  { key: 'Ctrl + ,', description: 'Open Settings' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal / Cancel' },
];

export const ShortcutsModal: React.FC = () => {
  const { settings, hideShortcuts } = useSettings();

  if (!settings.showShortcutsModal) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={hideShortcuts}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <h2 className="text-lg font-semibold dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={hideShortcuts}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-2">
            {SHORTCUTS.map(shortcut => (
              <div 
                key={shortcut.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className="text-slate-600 dark:text-slate-300">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-sm font-mono bg-slate-100 dark:bg-slate-600 rounded dark:text-white">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-200 dark:bg-slate-600 rounded">?</kbd> anytime to show this dialog
          </p>
        </div>
      </div>
    </div>
  );
};
