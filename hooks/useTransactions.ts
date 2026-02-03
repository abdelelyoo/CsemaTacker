
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Transaction } from '../types';
import { DateService } from '../services/dateService';

export const useTransactions = () => {
    const [error, setError] = useState<string | null>(null);

    // Fetch all transactions, sorted chronologically
    const transactions = useLiveQuery(
        () => db.transactions.orderBy('parsedDate').toArray(),
        []
    ) || [];

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
            Fees: data.fees !== undefined ? parseFloat(data.fees) : (data.Fees || 0),
            Tax: data.tax !== undefined ? parseFloat(data.tax) : (data.Tax || 0),
            ISIN: data.isin || data.ISIN || ''
        };
    };

    const addTransaction = async (data: any) => {
        try {
            const tx = normalizeTransaction(data);
            await db.transactions.add(tx as Transaction);
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to add transaction.");
            return false;
        }
    };

    const deleteTransaction = async (id: number | string) => {
        try {
            const numericId = Number(id);
            if (isNaN(numericId)) throw new Error("Invalid ID");
            await db.transactions.delete(numericId);
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to delete transaction.");
            return false;
        }
    };

    const updateTransaction = async (id: number | string, data: any) => {
        try {
            const numericId = Number(id);
            if (isNaN(numericId)) throw new Error("Invalid ID");
            const tx = normalizeTransaction(data);
            await db.transactions.update(numericId, tx);
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to update transaction.");
            return false;
        }
    };

    const clearTransactions = async () => {
        try {
            await db.transactions.clear();
            return true;
        } catch (e) {
            setError("Failed to clear database.");
            return false;
        }
    };

    const deleteTransactions = async (ids: number[]) => {
        try {
            await db.transactions.bulkDelete(ids);
            return true;
        } catch (e) {
            setError("Failed to delete transactions.");
            return false;
        }
    };

    const importTransactions = async (parsed: Transaction[]) => {
        try {
            // Preparation step outside the transaction if it involves complex mapping
            // ensuring we have proper parsedDate objects
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
                    Operation: isBankFee ? 'Frais Bancaires' : rest.Operation // Standardize bank fees
                };
            });

            // Use an atomic transaction for clear + add
            await db.transaction('rw', db.transactions, async () => {
                await db.transactions.clear();
                await db.transactions.bulkAdd(clean as Transaction[]);
            });
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
            // Key: Date + Ticker + Operation + Qty + Price
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
        addTransaction,
        deleteTransaction,
        deleteTransactions,
        updateTransaction,
        clearTransactions,
        importTransactions,
        findDuplicates,
        error,
        clearError: () => setError(null)
    };
};
