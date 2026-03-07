import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { CostMethod } from '../types';
import { Settings, Moon, Sun, Keyboard, Database, Shield, RotateCcw } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, toggleDarkMode, setCostMethod } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'calculation' | 'security'>('general');

  if (!isOpen) return null;

  const costMethods: { value: CostMethod; label: string; desc: string }[] = [
    { value: 'WAC', label: 'WAC (Weighted Average Cost)', desc: 'Default - averages all purchase prices' },
    { value: 'FIFO', label: 'FIFO (First In, First Out)', desc: 'Oldest shares sold first' },
    { value: 'LIFO', label: 'LIFO (Last In, First Out)', desc: 'Newest shares sold first' },
  ];

  const currencies = [
    { value: 'MAD', label: 'MAD (Moroccan Dirham)', symbol: 'MAD' },
    { value: 'EUR', label: 'EUR (Euro)', symbol: '€' },
    { value: 'USD', label: 'USD (US Dollar)', symbol: '$' },
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/03/2026)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (03/15/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-03-15)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <h2 className="text-lg font-semibold dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-slate-700">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'calculation', label: 'Calculation', icon: Database },
            { id: 'security', label: 'Security', icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium dark:text-white">Dark Mode</label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Use dark theme</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700"
                >
                  {settings.darkMode ? (
                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                </button>
              </div>

              {/* Currency */}
              <div>
                <label className="block font-medium mb-2 dark:text-white">Currency</label>
                <select
                  value={settings.currency}
                  onChange={e => updateSettings({ currency: e.target.value as any })}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  {currencies.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="block font-medium mb-2 dark:text-white">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={e => updateSettings({ dateFormat: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  {dateFormats.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  <div>
                    <p className="font-medium dark:text-white">Keyboard Shortcuts</p>
                    <p className="text-sm text-slate-500">View all shortcuts</p>
                  </div>
                </div>
                <button
                  onClick={() => updateSettings({ showShortcutsModal: true })}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
              </div>
            </div>
          )}

          {activeTab === 'calculation' && (
            <div className="space-y-6">
              {/* Cost Method */}
              <div>
                <label className="block font-medium mb-3 dark:text-white">Cost Basis Method</label>
                <div className="space-y-2">
                  {costMethods.map(method => (
                    <label
                      key={method.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        settings.costMethod === method.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="costMethod"
                        checked={settings.costMethod === method.value}
                        onChange={() => setCostMethod(method.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium dark:text-white">{method.label}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{method.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This affects how cost basis is calculated when selling shares.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Encryption */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  <div>
                    <p className="font-medium dark:text-white">Local Data Encryption</p>
                    <p className="text-sm text-slate-500">Encrypt data stored in browser</p>
                  </div>
                </div>
                <button
                  onClick={() => updateSettings({ enableEncryption: !settings.enableEncryption })}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.enableEncryption
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {settings.enableEncryption ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Reset */}
              <div className="pt-4 border-t dark:border-slate-700">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
