
import { Transaction, BankOperation, PerformancePoint } from '../types';
import { DateService } from '../services/dateService';

export const buildPerformanceHistory = (
    transactions: Transaction[],
    currentPrices: Record<string, number> = {},
    bankOperations: BankOperation[] = []
): PerformancePoint[] => {
    const history: PerformancePoint[] = [];

    let simCash = 0;
    let simInvested = 0;
    const simHoldings = new Map<string, { qty: number, price: number }>();

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

    // Get all unique dates from both sources
    const allDates = new Set([...Array.from(txsByDate.keys()), ...Array.from(opsByDate.keys())]);
    const uniqueDates = Array.from(allDates).sort();

    uniqueDates.forEach(dateStr => {
        // Process bank operations first
        const dailyOps = opsByDate.get(dateStr) || [];
        dailyOps.forEach(op => {
            if (op.Category === 'DEPOSIT') {
                simCash += op.Amount;
                simInvested += op.Amount;
            } else if (op.Category === 'WITHDRAWAL') {
                simCash -= op.Amount;
                simInvested -= op.Amount;
            } else if (op.Category === 'DIVIDEND') {
                simCash += op.Amount;
            } else if (op.Category === 'BANK_FEE' || op.Category === 'TAX') {
                simCash -= op.Amount;
            }
        });

        // Process stock transactions
        const dailyTxs = txsByDate.get(dateStr) || [];

        dailyTxs.forEach(tx => {
            const op = tx.Operation.toLowerCase();
            const ticker = tx.Ticker;

            if (op === 'achat' || op === 'buy') {
                simCash += tx.Total;
                if (!simHoldings.has(ticker)) simHoldings.set(ticker, { qty: 0, price: 0 });
                const h = simHoldings.get(ticker)!;
                h.qty += Math.abs(tx.Qty);
                h.price = tx.Price;
            } else if (op === 'vente' || op === 'sell') {
                simCash += tx.Total;
                if (simHoldings.has(ticker)) {
                    const h = simHoldings.get(ticker)!;
                    h.qty -= Math.abs(tx.Qty);
                    h.price = tx.Price;
                }
            }
        });

        let holdingsVal = 0;
        simHoldings.forEach(h => {
            if (Math.abs(h.qty) > 0.0001) holdingsVal += h.qty * h.price;
        });

        history.push({
            date: dateStr,
            value: simCash + holdingsVal,
            invested: simInvested
        });
    });

    // Append Today's data point
    const todayStr = DateService.toIso(new Date());
    let currentHoldingsVal = 0;
    simHoldings.forEach((data, ticker) => {
        const price = currentPrices[ticker] !== undefined ? currentPrices[ticker] : data.price;
        if (Math.abs(data.qty) > 0.0001) currentHoldingsVal += data.qty * price;
    });

    // Add today if not already present
    if (!history.find(h => h.date === todayStr)) {
        history.push({
            date: todayStr,
            value: simCash + currentHoldingsVal,
            invested: simInvested
        });
    }

    return history;
};
