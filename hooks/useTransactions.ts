import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { DateService } from '../services/dateService';
import {
  getTransactions,
  addTransaction as addCloudTransaction,
  addTransactions,
  deleteTransaction as deleteCloudTransaction,
  clearTransactions as clearCloudTransactions,
  addBankOperation as addCloudBankOperation,
  clearBankOperations as clearCloudBankOperations,
  addFees as addCloudFees
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

            // Separate transactions into stock trades vs bank operations/fees
            const stockTransactions: Transaction[] = [];
            const bankOps: any[] = [];
            const fees: any[] = [];

            for (const tx of parsed) {
                const normalizedOp = (tx.Operation || '').toLowerCase();
                const ticker = (tx.Ticker || '').toLowerCase();
                const company = (tx.Company || '').toLowerCase();

                // Skip if already processed as stock trade
                if (normalizedOp === 'achat' || normalizedOp === 'buy' || 
                    normalizedOp === 'vente' || normalizedOp === 'sell') {
                    stockTransactions.push({
                        ...tx,
                        parsedDate: tx.parsedDate || DateService.parse(tx.Date)
                    });
                    continue;
                }

                // Depot/Retrait → bank_operations
                if (normalizedOp.includes('depot') || normalizedOp.includes('retrait') || normalizedOp.includes('withdrawal')) {
                    bankOps.push({
                        Date: tx.Date,
                        parsedDate: tx.parsedDate || DateService.parse(tx.Date),
                        Operation: normalizedOp.includes('depot') ? 'DEPOSIT' : 'WITHDRAWAL',
                        Description: tx.Company,
                        Amount: Math.abs(tx.Total),
                        Category: normalizedOp.includes('depot') ? 'DEPOSIT' : 'WITHDRAWAL'
                    });
                    continue;
                }

                // Dividende → bank_operations (DIVIDEND)
                if (normalizedOp.includes('dividende') || normalizedOp.includes('dividend')) {
                    bankOps.push({
                        Date: tx.Date,
                        parsedDate: tx.parsedDate || DateService.parse(tx.Date),
                        Operation: 'DIVIDEND',
                        Description: tx.Company || tx.Ticker,
                        Amount: Math.abs(tx.Total),
                        Category: 'DIVIDEND'
                    });
                    continue;
                }

                // Frais/CUS → fees table (FRAIS)
                if (normalizedOp.includes('frais') || ticker === 'cus' || ticker.includes('bank')) {
                    fees.push({
                        date: tx.Date,
                        type: 'FRAIS',
                        amount: Math.abs(tx.Total),
                        description: tx.Company || 'Bank Fee',
                        ticker: tx.Ticker
                    });
                    continue;
                }

                // Taxe/TPCVM → fees table (TAXE)
                if (normalizedOp.includes('taxe') || normalizedOp.includes('tpcvm') || normalizedOp.includes('tax')) {
                    fees.push({
                        date: tx.Date,
                        type: 'TAXE',
                        amount: Math.abs(tx.Total),
                        description: tx.Company || 'Tax',
                        ticker: tx.Ticker
                    });
                    continue;
                }

                // Unknown operation - keep as stock transaction
                stockTransactions.push({
                    ...tx,
                    parsedDate: tx.parsedDate || DateService.parse(tx.Date)
                });
            }

            // Import stock transactions
            if (stockTransactions.length > 0) {
                await addTransactions(stockTransactions);
            }

            // Import bank operations
            if (bankOps.length > 0) {
                await clearCloudBankOperations();
                for (const op of bankOps) {
                    await addCloudBankOperation(op);
                }
            }

            // Import fees
            if (fees.length > 0) {
                await addCloudFees(fees);
            }

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
