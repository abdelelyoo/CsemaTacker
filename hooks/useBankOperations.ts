import { useState, useEffect, useCallback } from 'react';
import { BankOperation } from '../types';
import { DateService } from '../services/dateService';
import {
    getBankOperations,
    addBankOperation as addCloudBankOperation,
    deleteBankOperation as deleteCloudBankOperation,
    clearBankOperations as clearCloudBankOperations
} from '../services/cloudDatabase';
import { supabase } from '../lib/supabase';

import { parseNumber } from '../utils/validation';
export const useBankOperations = () => {
    const [operations, setOperations] = useState<BankOperation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
                loadOperations();
            });
            return () => subscription.unsubscribe();
        }
    }, [loadOperations]);

    const normalizeOperation = (data: any): Partial<BankOperation> => {
        const parsedDate = data.date ? DateService.parse(data.date) : (data.parsedDate || new Date());
        let amount = parseNumber(data.amount || data.Amount);
        const cat = (data.category || data.Category || 'DEPOSIT').toUpperCase();

        if (cat === 'DEPOSIT' || cat === 'DIVIDEND') {
            amount = Math.abs(amount);
        } else if (cat === 'WITHDRAWAL') {
            amount = -Math.abs(amount);
        } else if (cat === 'BANK_FEE' || cat === 'CUSTODY' || cat === 'SUBSCRIPTION' || cat === 'TAX') {
            if (cat === 'TAX') {
                const desc = (data.description || data.Description || '').toLowerCase();
                if (desc.includes('remboursement') || desc.includes('refund')) {
                    amount = Math.abs(amount);
                } else {
                    amount = -Math.abs(amount);
                }
            } else {
                amount = -Math.abs(amount);
            }
        }

        return {
            Date: data.date || data.Date || new Date().toISOString().split('T')[0],
            parsedDate: parsedDate,
            Operation: data.operation || data.Operation || 'DEPOSIT',
            Description: data.description || data.Description || '',
            Amount: amount,
            Category: cat as any,
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
                    acc.cashBalance += op.Amount;
                    break;
                case 'BANK_FEE':
                case 'CUSTODY':
                    acc.totalBankFees += Math.abs(op.Amount);
                    acc.cashBalance -= Math.abs(op.Amount);
                    break;
                case 'SUBSCRIPTION':
                    acc.totalSubscriptions += Math.abs(op.Amount);
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
            totalSubscriptions: 0,
            cashBalance: 0
        });
    };

    return {
        operations,
        isLoading,
        addBankOperation,
        deleteBankOperation,
        clearBankOperations,
        calculateBankTotals,
        error,
        clearError: () => setError(null),
        refreshOperations: loadOperations
    };
};