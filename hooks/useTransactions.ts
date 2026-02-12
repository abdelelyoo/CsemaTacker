import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { DateService } from '../services/dateService';
import {
  getTransactions,
  addTransaction as addCloudTransaction,
  addTransactions,
  deleteTransaction as deleteCloudTransaction,
  clearTransactions as clearCloudTransactions
} from '../services/cloudDatabase';
import { supabase } from '../lib/supabase';

export const useTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load transactions on mount and when auth state changes
    const loadTransactions = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getTransactions();
            setTransactions(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load transactions:', err);
            setError('Failed to load transactions');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactions();

        // Subscribe to auth changes to reload data
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadTransactions();
        });

        return () => subscription.unsubscribe();
    }, [loadTransactions]);

    /**
     * Normalizes a transaction object before DB operations.
     */
    const normalizeTransaction = (data: any): Partial<Transaction> => {
        // 1. Handle Date
        const parsedDate = data.date ? DateService.parse(data.date) : (data.parsedDate || new Date());
        const dateStr = DateService.toShortDisplay(parsedDate);

        // 2. Handle Quantity (Vente should be negative)
        let qty = parseFloat(data.qty) || 0;
        const op = data.operation || data.Operation;
        if (op === 'Vente' || op === 'sell') {
            qty = -Math.abs(qty);
        } else if (op === 'Achat' || op === 'buy') {
            qty = Math.abs(qty);
        }

        return {
            Date: dateStr,
            parsedDate: parsedDate,
            Operation: op,
            Ticker: data.ticker || data.Ticker || '',
            Company: data.company || data.Company || '',
            Qty: qty,
            Price: parseFloat(data.price || data.Price) || 0,
            Total: parseFloat(data.total || data.Total) || 0,
            Fees: data.fees !== undefined ? parseFloat(data.fees) : data.Fees,
            Tax: data.tax !== undefined ? parseFloat(data.tax) : data.Tax,
            ISIN: data.isin || data.ISIN || ''
        };
    };

    const addTransaction = async (data: any) => {
        try {
            const tx = normalizeTransaction(data);
            await addCloudTransaction(tx as Transaction);
            await loadTransactions();
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to add transaction.");
            return false;
        }
    };

    const deleteTransaction = async (id: number | string) => {
        try {
            await deleteCloudTransaction(id);
            await loadTransactions();
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to delete transaction.");
            return false;
        }
    };

    const updateTransaction = async (id: number | string, data: any) => {
        try {
            // For cloud DB, we'll delete and re-add since we don't have a direct update
            await deleteCloudTransaction(id);
            const tx = normalizeTransaction(data);
            await addCloudTransaction(tx as Transaction);
            await loadTransactions();
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to update transaction.");
            return false;
        }
    };

    const clearTransactions = async () => {
        try {
            await clearCloudTransactions();
            await loadTransactions();
            return true;
        } catch (e) {
            setError("Failed to clear database.");
            return false;
        }
    };

    const deleteTransactions = async (ids: number[]) => {
        try {
            for (const id of ids) {
                await deleteCloudTransaction(id);
            }
            await loadTransactions();
            return true;
        } catch (e) {
            setError("Failed to delete transactions.");
            return false;
        }
    };

    const importTransactions = async (parsed: Transaction[]) => {
        try {
            // Clear existing transactions first
            await clearCloudTransactions();

            // Preparation step
            const clean = parsed.map(({ id, ...rest }) => {
                const normalizedOp = (rest.Operation || '').toLowerCase();
                const ticker = (rest.Ticker || '').toLowerCase();
                const company = (rest.Company || '').toLowerCase();
                const isSubscription = normalizedOp.includes('abonnement') || normalizedOp.includes('subscription');
                const isBankFee = !isSubscription && (
                    (normalizedOp.includes('frais') || normalizedOp.includes('fees')) &&
                    (ticker === 'bank' || ticker === 'cus' || ticker.includes('bank') || company.includes('bank'))
                );

                return {
                    ...rest,
                    parsedDate: rest.parsedDate || DateService.parse(rest.Date),
                    Operation: isBankFee ? 'Frais Bancaires' : rest.Operation
                };
            });

            await addTransactions(clean as Transaction[]);
            await loadTransactions();
            return true;
        } catch (e) {
            console.error(e);
            setError("Import failed. Database preserved.");
            return false;
        }
    };

    const findDuplicates = () => {
        const groups = new Map<string, Transaction[]>();

        transactions.forEach(tx => {
            const key = `${tx.Date}|${tx.Ticker}|${tx.Operation}|${tx.Qty}|${tx.Price}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(tx);
        });

        const duplicateGroups: Transaction[][] = [];
        groups.forEach(group => {
            if (group.length > 1) {
                duplicateGroups.push(group);
            }
        });

        return duplicateGroups;
    };

    return {
        transactions,
        isLoading,
        addTransaction,
        deleteTransaction,
        deleteTransactions,
        updateTransaction,
        clearTransactions,
        importTransactions,
        findDuplicates,
        error,
        clearError: () => setError(null),
        refreshTransactions: loadTransactions
    };
};
