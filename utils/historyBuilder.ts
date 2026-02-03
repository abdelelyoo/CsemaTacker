
import { Transaction, PerformancePoint } from '../types';
import { DateService } from '../services/dateService';

/**
 * Builds a chronological list of performance data points.
 */
export const buildPerformanceHistory = (
    transactions: Transaction[],
    currentPrices: Record<string, number> = {}
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

    const uniqueDates = Array.from(txsByDate.keys()).sort();

    uniqueDates.forEach(dateStr => {
        const dailyTxs = txsByDate.get(dateStr) || [];

        dailyTxs.forEach(tx => {
            const op = tx.Operation.toLowerCase();
            const ticker = tx.Ticker;

            if (op === 'depot') {
                simCash += tx.Total;
                simInvested += tx.Total;
            } else if (op === 'retrait') {
                simCash += tx.Total;
                simInvested += tx.Total; // Withdrawal total is negative
            } else if (op === 'dividende' || op === 'taxe' || op === 'frais') {
                simCash += tx.Total;
            } else if (op === 'achat' || op === 'buy') {
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

    const todayDataPoint = {
        date: todayStr,
        value: simCash + currentHoldingsVal,
        invested: simInvested
    };

    if (uniqueDates.length > 0 && uniqueDates[uniqueDates.length - 1] === todayStr) {
        history[history.length - 1] = todayDataPoint;
    } else if (uniqueDates.length > 0 || simInvested > 0) {
        history.push(todayDataPoint);
    }

    return history;
};
