import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                       event.code.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const altMatch = !!shortcut.altKey === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        if (!isInput || shortcut.key === 'Escape') {
          event.preventDefault();
          shortcut.handler(event);
          return;
        }
      }
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrlKey: true,
    description: 'New transaction',
    handler: () => console.log('New transaction')
  },
  {
    key: 's',
    ctrlKey: true,
    description: 'Save/Sync',
    handler: () => console.log('Save')
  },
  {
    key: 'f',
    ctrlKey: true,
    description: 'Search/Filter',
    handler: () => console.log('Search')
  },
  {
    key: 'Escape',
    description: 'Close modal/Cancel',
    handler: () => console.log('Escape')
  },
  {
    key: '?',
    shiftKey: true,
    description: 'Show keyboard shortcuts',
    handler: () => console.log('Show help')
  },
  {
    key: 'h',
    ctrlKey: true,
    description: 'Go to Dashboard',
    handler: () => console.log('Dashboard')
  },
  {
    key: 'p',
    ctrlKey: true,
    description: 'Go to Portfolio',
    handler: () => console.log('Portfolio')
  },
  {
    key: 't',
    ctrlKey: true,
    description: 'Go to Transactions',
    handler: () => console.log('Transactions')
  },
  {
    key: 'd',
    ctrlKey: true,
    description: 'Go to Dividends',
    handler: () => console.log('Dividends')
  },
  {
    key: 'r',
    ctrlKey: true,
    description: 'Go to Analysis/Risk',
    handler: () => console.log('Risk Analysis')
  }
];

export const useGlobalKeyboardShortcuts = (enabled: boolean = true) => {
  return useKeyboardShortcuts({
    enabled,
    shortcuts: DEFAULT_SHORTCUTS
  });
};

export const useModalKeyboardShortcuts = (
  isOpen: boolean,
  onClose: () => void
) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
};
