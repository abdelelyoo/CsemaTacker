import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CostMethod } from '../types';

export interface AppSettings {
  costMethod: CostMethod;
  currency: 'MAD' | 'EUR' | 'USD';
  darkMode: boolean;
  dateFormat: string;
  enableEncryption: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  costMethod: 'WAC',
  currency: 'MAD',
  darkMode: false,
  dateFormat: 'DD/MM/YYYY',
  enableEncryption: false
};

const STORAGE_KEY = 'atlas_settings';

interface SettingsContextType {
  settings: AppSettings;
  showShortcutsModal: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  toggleDarkMode: () => void;
  setCostMethod: (method: CostMethod) => void;
  showShortcuts: () => void;
  hideShortcuts: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Transient UI state — NOT persisted to localStorage
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Apply dark mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const setCostMethod = useCallback((method: CostMethod) => {
    setSettings(prev => ({ ...prev, costMethod: method }));
  }, []);

  const showShortcutsFn = useCallback(() => {
    setShowShortcutsModal(true);
  }, []);

  const hideShortcuts = useCallback(() => {
    setShowShortcutsModal(false);
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      showShortcutsModal,
      updateSettings,
      resetSettings,
      toggleDarkMode,
      setCostMethod,
      showShortcuts: showShortcutsFn,
      hideShortcuts
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
