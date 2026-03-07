
import { Transaction, BankOperation, PerformancePoint, FeeRecord } from '../types';
import { DateService } from '../services/dateService';
import { createEmptyHoldingState, updateHoldingStateWithMethod, HoldingState } from './holdingCalc';
import { roundTo } from './helpers';

export const buildPerformanceHistory = (
    transactions: Transaction[],
    currentPrices: Record<string, number> = {},
    bankOperations: BankOperation[] = [],
    fees: FeeRecord[] = [],
    costMethod: 'FIFO' | 'LIFO' | 'WAC' = 'WAC'
): PerformancePoint[] => {
    const history: PerformancePoint[] = [];

    let simCash = 0;
    let simInvested = 0;
    const simHoldings = new Map<string, HoldingState>();

    // Group transactions by date
    const txsByDate = new Map<string, Transaction[]>();
    const sortedTxs = [...transactions].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    sortedTxs.forEach(tx => {
        const d = DateService.toIso(tx.parsedDate);
        if (!txsByDate.has(d)) txsByDate.set(d, []);
        txsByDate.get(d)!.push(tx);
    });

    // Group bank operations by date
    const opsByDate = new Map<string, BankOperation[]>();
    const sortedOps = [...(bankOperations || [])].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    sortedOps.forEach(op => {
        const d = op.parsedDate ? DateService.toIso(op.parsedDate) : DateService.toIso(new Date(op.Date));
        if (!opsByDate.has(d)) opsByDate.set(d, []);
        opsByDate.get(d)!.push(op);
    });

    // Group fees by date
    const feesByDate = new Map<string, FeeRecord[]>();
    const sortedFees = [...(fees || [])].sort((a, b) => a.date.getTime() - b.date.getTime());

    sortedFees.forEach(fee => {
        const d = DateService.toIso(fee.date);
        if (!feesByDate.has(d)) feesByDate.set(d, []);
        feesByDate.get(d)!.push(fee);
    });

    // Get all unique dates from all sources
    const allDates = new Set([
        ...Array.from(txsByDate.keys()),
        ...Array.from(opsByDate.keys()),
        ...Array.from(feesByDate.keys())
    ]);
    const uniqueDates = Array.from(allDates).sort();

    uniqueDates.forEach(dateStr => {
        // Process bank operations first
        const dailyOps = opsByDate.get(dateStr) || [];
        dailyOps.forEach(op => {
            const amount = Math.abs(op.Amount);
            if (op.Category === 'DEPOSIT') {
                simCash += amount;
                simInvested += amount;
            } else if (op.Category === 'WITHDRAWAL') {
                simCash -= amount;
                simInvested -= amount;
            } else if (op.Category === 'DIVIDEND') {
                simCash += amount;
                simInvested += amount;
            } else if (op.Category === 'TAX') {
                simCash += op.Amount;
                simInvested += op.Amount; // Tax refund counts as invested
            } else if (op.Category === 'BANK_FEE' || op.Category === 'CUSTODY' || op.Category === 'SUBSCRIPTION') {
                simCash -= amount;
            }
        });

        // Process fees
        const dailyFees = feesByDate.get(dateStr) || [];
        dailyFees.forEach(fee => {
            simCash -= Math.abs(fee.amount);
        });

        // Process stock transactions with proper WAC tracking
        const dailyTxs = txsByDate.get(dateStr) || [];

        dailyTxs.forEach(tx => {
            const op = tx.Operation.toLowerCase();
            const ticker = tx.Ticker;

            // Handle cash flow from trades
            if (op === 'achat' || op === 'buy') {
                simCash -= Math.abs(tx.Total || 0); // Money OUT for buy
            } else if (op === 'vente' || op === 'sell') {
                simCash += Math.abs(tx.Total || 0); // Money IN for sell
            }

            if (!simHoldings.has(ticker)) {
                simHoldings.set(ticker, createEmptyHoldingState(ticker, tx.Company || ticker));
            }

            const h = simHoldings.get(ticker)!;
            const result = updateHoldingStateWithMethod(h, tx, { costMethod });
            simHoldings.set(ticker, result.newState);
        });

        // Calculate holdings value using WAC (avgPrice) or last price
        let holdingsVal = 0;
        simHoldings.forEach((h, ticker) => {
            if (Math.abs(h.qty) > 0.0001) {
                let price = costMethod === 'WAC' ? h.avgPrice : h.lastPrice;
                if (!price || !isFinite(price)) price = 0;
                holdingsVal += h.qty * price;
            }
        });

        const totalValue = simCash + holdingsVal;
        history.push({
            date: dateStr,
            value: isFinite(totalValue) ? roundTo(totalValue, 2) : 0,
            invested: isFinite(simInvested) ? roundTo(simInvested, 2) : 0,
            cash: isFinite(simCash) ? roundTo(simCash, 2) : 0,
            holdings: isFinite(holdingsVal) ? roundTo(holdingsVal, 2) : 0
        });
    });

    // Append Today's data point
    const todayStr = DateService.toIso(new Date());
    let currentHoldingsVal = 0;
    simHoldings.forEach((h, ticker) => {
        if (Math.abs(h.qty) > 0.0001) {
            let price = currentPrices[ticker] !== undefined
                ? currentPrices[ticker]
                : (costMethod === 'WAC' ? h.avgPrice : h.lastPrice);
            if (!price || !isFinite(price)) price = 0;
            currentHoldingsVal += h.qty * price;
        }
    });

    // Add today if not already present
    const todayValue = simCash + currentHoldingsVal;
    if (!history.find(h => h.date === todayStr)) {
        history.push({
            date: todayStr,
            value: isFinite(todayValue) ? roundTo(todayValue, 2) : 0,
            invested: isFinite(simInvested) ? roundTo(simInvested, 2) : 0,
            cash: isFinite(simCash) ? roundTo(simCash, 2) : 0,
            holdings: isFinite(currentHoldingsVal) ? roundTo(currentHoldingsVal, 2) : 0
        });
    }

    return history;
};
