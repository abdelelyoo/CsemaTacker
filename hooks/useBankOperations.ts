import { useState, useEffect, useCallback } from 'react';
import { BankOperation, BankOperationType } from '../types';
import { DateService } from '../services/dateService';
import {
  getBankOperations,
  addBankOperation as addCloudBankOperation,
  deleteBankOperation as deleteCloudBankOperation,
  clearBankOperations as clearCloudBankOperations
} from '../services/cloudDatabase';
import { supabase } from '../lib/supabase';

export const useBankOperations = () => {
    const [operations, setOperations] = useState<BankOperation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load operations on mount and when auth state changes
    const loadOperations = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getBankOperations();
            setOperations(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load bank operations:', err);
            setError('Failed to load bank operations');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOperations();

        // Subscribe to auth changes to reload data
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadOperations();
        });

        return () => subscription.unsubscribe();
    }, [loadOperations]);

    /**
     * Normalizes a bank operation object before DB operations.
     */
    const normalizeOperation = (data: any): Partial<BankOperation> => {
        // Handle Date
        const parsedDate = data.date ? DateService.parse(data.date) : (data.parsedDate || new Date());
        const dateStr = DateService.toShortDisplay(parsedDate);

        // Determine category and normalize amount sign
        let category: BankOperation['Category'] = 'DEPOSIT';
        let amount = parseFloat(data.amount || data.Amount) || 0;
        
        const op = (data.operation || data.Operation || '').toLowerCase();
        
        if (op.includes('depot') || op.includes('deposit')) {
            category = 'DEPOSIT';
            amount = Math.abs(amount); // Deposits are positive
        } else if (op.includes('retrait') || op.includes('withdrawal')) {
            category = 'WITHDRAWAL';
            amount = -Math.abs(amount); // Withdrawals are negative
        } else if (op.includes('dividende') || op.includes('dividend')) {
            category = 'DIVIDEND';
            amount = Math.abs(amount); // Dividends are positive
        } else if (op.includes('taxe') || op.includes('tax')) {
            category = 'TAX';
            amount = -Math.abs(amount); // Taxes are negative (money out)
        } else if (op.includes('frais') || op.includes('fee')) {
            category = 'BANK_FEE';
            amount = -Math.abs(amount); // Fees are negative (money out)
        }

        return {
            Date: dateStr,
            parsedDate: parsedDate,
            Operation: category as BankOperationType,
            Description: data.description || data.Description || data.company || data.Company || '',
            Amount: amount,
            Category: category,
            Reference: data.reference || data.Reference || ''
        };
    };

    const addBankOperation = async (data: any) => {
        try {
            const op = normalizeOperation(data);
            await addCloudBankOperation(op as BankOperation);
            await loadOperations();
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to add bank operation.");
            return false;
        }
    };

    const deleteBankOperation = async (id: number | string) => {
        try {
            await deleteCloudBankOperation(id);
            await loadOperations();
            return true;
        } catch (e) {
            console.error(e);
            setError("Failed to delete bank operation.");
            return false;
        }
    };

    const clearBankOperations = async () => {
        try {
            await clearCloudBankOperations();
            await loadOperations();
            return true;
        } catch (e) {
            setError("Failed to clear bank operations.");
            return false;
        }
    };

    const importBankOperations = async (parsed: BankOperation[]) => {
        try {
            // Clear existing operations first
            await clearCloudBankOperations();

            // Clean and normalize
            const clean = parsed.map(({ id, ...rest }) => ({
                ...rest,
                parsedDate: rest.parsedDate || DateService.parse(rest.Date),
                Amount: rest.Category === 'DEPOSIT' || rest.Category === 'DIVIDEND' 
                    ? Math.abs(rest.Amount) 
                    : -Math.abs(rest.Amount)
            }));

            for (const op of clean) {
                await addCloudBankOperation(op as BankOperation);
            }
            
            await loadOperations();
            return true;
        } catch (e) {
            console.error(e);
            setError("Import failed.");
            return false;
        }
    };

    // Calculate totals for portfolio
    const calculateBankTotals = () => {
        return operations.reduce((acc, op) => {
            switch (op.Category) {
                case 'DEPOSIT':
                    acc.totalDeposits += Math.abs(op.Amount);
                    acc.cashBalance += Math.abs(op.Amount);
                    break;
                case 'WITHDRAWAL':
                    acc.totalWithdrawals += Math.abs(op.Amount);
                    acc.cashBalance -= Math.abs(op.Amount);
                    break;
                case 'DIVIDEND':
                    acc.totalDividends += Math.abs(op.Amount);
                    acc.cashBalance += Math.abs(op.Amount);
                    break;
                case 'TAX':
                    acc.totalTaxes += Math.abs(op.Amount);
                    acc.cashBalance -= Math.abs(op.Amount);
                    break;
                case 'BANK_FEE':
                    acc.totalBankFees += Math.abs(op.Amount);
                    acc.cashBalance -= Math.abs(op.Amount);
                    break;
            }
            return acc;
        }, {
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalDividends: 0,
            totalTaxes: 0,
            totalBankFees: 0,
            cashBalance: 0
        });
    };

    return {
        operations,
        isLoading,
        addBankOperation,
        deleteBankOperation,
        clearBankOperations,
        importBankOperations,
        calculateBankTotals,
        error,
        clearError: () => setError(null),
        refreshOperations: loadOperations
    };
};