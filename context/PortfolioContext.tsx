
import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { Transaction, PortfolioSummary, FeeRecord, FeeType, BankOperation } from '../types';
import { useTransactions } from '../hooks/useTransactions';
import { useBankOperations } from '../hooks/useBankOperations';
import { usePortfolio } from '../hooks/usePortfolio';
import { useFees } from '../hooks/useFees';

interface PortfolioContextType {
    // Stock Transactions (Achat/Vente)
    transactions: Transaction[];
    enrichedTransactions: Transaction[];
    addTransaction: (data: any) => Promise<boolean>;
    deleteTransaction: (id: number | string) => Promise<boolean>;
    deleteTransactions: (ids: number[]) => Promise<boolean>;
    updateTransaction: (id: number | string, data: any) => Promise<boolean>;
    clearTransactions: () => Promise<boolean>;
    importTransactions: (parsed: Transaction[]) => Promise<boolean>;
    findDuplicates: () => Transaction[][];
    duplicateGroups: Transaction[][];

    // Bank Operations (Depot/Retrait/Frais/Taxe/Dividende)
    bankOperations: BankOperation[];
    addBankOperation: (data: any) => Promise<boolean>;
    deleteBankOperation: (id: number | string) => Promise<boolean>;
    clearBankOperations: () => Promise<boolean>;

    // Portfolio Calculations
    portfolio: PortfolioSummary;
    currentPrices: Record<string, number>;
    isFeedConnected: boolean;
    updateManualPrices: (prices: Record<string, number>) => void;
    updateManualPrice: (ticker: string, price: number) => void;
    resetManualPrices: () => void;

    // UI / Global State
    dbError: string | null;
    clearDbError: () => void;

    // Fees (CUS/SUB)
    fees: FeeRecord[];
    addFee: (date: Date, type: FeeType, amount: number, description?: string) => Promise<boolean>;
    deleteFee: (id: number) => Promise<boolean>;
    clearFees: () => Promise<boolean>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        transactions,
        addTransaction,
        deleteTransaction,
        deleteTransactions,
        updateTransaction,
        clearTransactions,
        importTransactions,
        findDuplicates,
        error: dbError,
        clearError: clearDbError
    } = useTransactions();

    const {
        operations: bankOperations,
        addBankOperation,
        deleteBankOperation,
        clearBankOperations,
        calculateBankTotals
    } = useBankOperations();

    const {
        fees,
        addFee,
        deleteFee,
        clearFees
    } = useFees();

    const {
        portfolio,
        currentPrices,
        updateManualPrice,
        updateManualPrices,
        resetManualPrices,
        isFeedConnected
    } = usePortfolio(transactions, fees, bankOperations, calculateBankTotals);

    // Memoized duplicate groups for performance
    const duplicateGroups = useMemo(() => findDuplicates(), [transactions, findDuplicates]);

    const value = {
        transactions,
        enrichedTransactions: portfolio.enrichedTransactions || transactions,
        addTransaction,
        deleteTransaction,
        deleteTransactions,
        updateTransaction,
        clearTransactions,
        importTransactions,
        findDuplicates,
        duplicateGroups,
        bankOperations,
        addBankOperation,
        deleteBankOperation,
        clearBankOperations,
        portfolio,
        currentPrices,
        isFeedConnected,
        updateManualPrice,
        updateManualPrices,
        resetManualPrices,
        dbError,
        clearDbError,
        fees,
        addFee,
        deleteFee,
        clearFees
    };

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolioContext = () => {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolioContext must be used within a PortfolioProvider');
    }
    return context;
};
