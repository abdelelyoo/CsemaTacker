
import { MARKET_SNAPSHOT } from '../data/marketSnapshot';
import { Transaction } from '../types';

/**
 * Service to manage market price retrieval and fallbacks.
 */
export class MarketService {
  /**
   * Returns a merged price map: Snapshot + Last known transaction price for missing tickers.
   */
  static getEffectivePrices(transactions: Transaction[]): Record<string, number> {
    const prices: Record<string, number> = { ...MARKET_SNAPSHOT };

    // Extract unique tickers from transactions that are missing in the snapshot
    const activeTickers = new Set(transactions.map(t => t.Ticker).filter(Boolean));
    const missingTickers = Array.from(activeTickers).filter(t => prices[t] === undefined);

    if (missingTickers.length === 0) return prices;

    // For missing tickers, find the most recent non-zero price from transaction history
    // Optimization: Traverse the transactions once to get the latest prices
    const latestPrices: Record<string, number> = {};
    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      if (tx.Ticker && tx.Price > 0 && !latestPrices[tx.Ticker]) {
        latestPrices[tx.Ticker] = tx.Price;
      }
    }

    missingTickers.forEach(ticker => {
      if (latestPrices[ticker]) {
        prices[ticker] = latestPrices[ticker];
      }
    });

    return prices;
  }

  static getStatus() {
    return {
      status: 'static',
      lastUpdate: new Date('2026-02-26'), // Date of last snapshot
      source: 'Atlas Market Feed (Static Snapshot)',
      warning: 'Market prices are static and for estimation only. Real-time data is not currently active.'
    };
  }
}

// Backward compatibility export (optional, but good for minimal diff elsewhere)
export const getMarketPrices = (txs: Transaction[]) => MarketService.getEffectivePrices(txs);
