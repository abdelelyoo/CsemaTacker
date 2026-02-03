
import { useState, useMemo, useEffect } from 'react';
import { Transaction, PortfolioSummary, FeeRecord } from '../types';
import { calculatePortfolio } from '../utils/portfolioCalc';
import { getMarketPrices } from '../services/marketService';

const STORAGE_KEY_MANUAL_PRICES = 'atlas_portfolio_manual_prices';

export const usePortfolio = (transactions: Transaction[], fees: FeeRecord[] = []) => {
    // State for manual price overrides
    const [manualPrices, setManualPrices] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_MANUAL_PRICES);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // Effect to persist manual prices
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_MANUAL_PRICES, JSON.stringify(manualPrices));
    }, [manualPrices]);

    // Derived Effective Prices
    const currentPrices = useMemo(() => {
        let feedPrices: Record<string, number> = {};
        if (transactions.length > 0) {
            feedPrices = getMarketPrices(transactions);
        }
        return { ...feedPrices, ...manualPrices };
    }, [transactions, manualPrices]);

    // Derived Portfolio Summary
    const portfolio: PortfolioSummary = useMemo(() => {
        if (!transactions.length) {
            return {
                totalValue: 0, totalCost: 0, totalRealizedPL: 0, totalUnrealizedPL: 0,
                totalDividends: 0, totalDeposits: 0, holdings: [], cashBalance: 0,
                totalTradingFees: 0, totalCustodyFees: 0, netTaxImpact: 0, history: [],
                enrichedTransactions: []
            };
        }
        return calculatePortfolio(transactions, currentPrices, fees);
    }, [transactions, currentPrices, fees]);

    const updateManualPrice = (ticker: string, price: number) => {
        setManualPrices(prev => ({ ...prev, [ticker]: price }));
    };

    const updateManualPrices = (prices: Record<string, number>) => {
        setManualPrices(prev => ({ ...prev, ...prices }));
    };

    const resetManualPrices = () => {
        setManualPrices({});
    };

    return {
        portfolio,
        currentPrices,
        updateManualPrice,
        updateManualPrices,
        resetManualPrices,
        isFeedConnected: transactions.length > 0
    };
};
