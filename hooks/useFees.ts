
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { FeeRecord, FeeType } from '../types';

export const useFees = () => {
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadFees = useCallback(async () => {
        try {
            const allFees = await db.fees.toArray();
            // Sort by date descending
            allFees.sort((a, b) => b.date.getTime() - a.date.getTime());
            setFees(allFees);
            setError(null);
        } catch (err) {
            console.error('Failed to load fees:', err);
            setError('Failed to load fees from database');
        }
    }, []);

    useEffect(() => {
        loadFees();
    }, [loadFees]);

    const addFee = async (date: Date, type: FeeType, amount: number, description?: string) => {
        try {
            await db.fees.add({
                date,
                type,
                amount,
                description
            });
            await loadFees();
            return true;
        } catch (err) {
            console.error('Failed to add fee:', err);
            setError('Failed to add fee');
            return false;
        }
    };

    const deleteFee = async (id: number) => {
        try {
            await db.fees.delete(id);
            await loadFees();
            return true;
        } catch (err) {
            console.error('Failed to delete fee:', err);
            setError('Failed to delete fee');
            return false;
        }
    };

    const clearFees = async () => {
        try {
            await db.fees.clear();
            await loadFees();
            return true;
        } catch (err) {
            console.error('Failed to clear fees:', err);
            setError('Failed to clear fees');
            return false;
        }
    };

    return {
        fees,
        addFee,
        deleteFee,
        clearFees,
        error,
        refreshFees: loadFees
    };
};
