import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketDataService, MarketStock } from '../services/marketDataService';

interface UseMarketDataResult {
  marketData: Map<string, MarketStock>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketData(tickers: string[], dependencies: any[] = []): UseMarketDataResult {
  const [marketData, setMarketData] = useState<Map<string, MarketStock>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (tickers.length === 0) {
      setMarketData(new Map());
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const stocks = await MarketDataService.getAllStocks({ limit: 200 });
      const dataMap = new Map<string, MarketStock>();
      stocks.forEach(stock => dataMap.set(stock.ticker, stock));
      setMarketData(dataMap);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to load market data');
        console.error('Failed to load market data:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [tickers]);

  useEffect(() => {
    refresh();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return { marketData, loading, error, refresh };
}