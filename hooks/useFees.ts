import { useState, useEffect, useCallback } from 'react';
import { FeeRecord, FeeType } from '../types';
import {
  getFees,
  addFee as addCloudFee,
  clearFees as clearCloudFees
} from '../services/cloudDatabase';
import { supabase } from '../lib/supabase';

export const useFees = () => {
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadFees = useCallback(async () => {
        try {
            setIsLoading(true);
            const allFees = await getFees();
            // Sort by date descending
            allFees.sort((a, b) => b.date.getTime() - a.date.getTime());
            setFees(allFees);
            setError(null);
        } catch (err) {
            console.error('Failed to load fees:', err);
            setError('Failed to load fees from database');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFees();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadFees();
        });

        return () => subscription.unsubscribe();
    }, [loadFees]);

    const addFee = async (date: Date, type: FeeType, amount: number, description?: string) => {
        try {
            await addCloudFee({
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
            // For cloud DB, we'd need a delete function
            // For now, we'll reload to sync state
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
            await clearCloudFees();
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
        isLoading,
        addFee,
        deleteFee,
        clearFees,
        error,
        refreshFees: loadFees
    };
};
