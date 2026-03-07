import axios from 'axios';

const TV_COLUMNS = [
  'name', 'description', 'close', 'change', 'change_abs', 'volume',
  'RSI', 'SMA50', 'SMA200', 'MACD.macd', 'MACD.signal',
  'BB.upper', 'BB.lower', 'Recommend.All', 'market_cap_basic',
  'price_earnings_ttm', 'dividend_yield_recent',
];

const FALLBACK_TICKERS = [
  'MASI', 'BCP', 'ADH', 'ATW', 'BOA', 'CIH', 'IAM', 'MNG', 'SMI',
  'BCP', 'WAFA', 'S2M', 'LES', 'HPS', 'MDP', 'ALM', 'SNI', 'AXA', 'CCR'
];

interface StockPrice {
  ticker: string;
  name: string;
  price: number;
  change_percent: number;
  volume?: number;
  rsi_14?: number;
  sma_50?: number;
  sma_200?: number;
  tech_rating?: number;
  last_updated: string;
}

async function fetchMoroccanPrices(): Promise<StockPrice[]> {
  const tickers = FALLBACK_TICKERS;
  const results: StockPrice[] = [];

  const sources = [
    { name: 'TradingView Global', url: 'https://scanner.tradingview.com/global/scan' },
    { name: 'TradingView Morocco', url: 'https://scanner.tradingview.com/morocco/scan' },
  ];

  for (const source of sources) {
    try {
      const payload = {
        columns: TV_COLUMNS,
        options: { lang: 'en' },
        range: [0, tickers.length + 20],
        sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
        symbols: {
          tickers: tickers.map(t => `CSEMA:${t}`),
        },
      };

      const response = await axios.post(source.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
        },
        timeout: 15000,
      });

      if (response.data?.data && response.data.data.length > 0) {
        for (const item of response.data.data) {
          const ticker = item.s?.replace(/^.*?:/, '') || item.s;
          const d = item.d || [];
          const close = d[2];

          if (ticker && close != null) {
            results.push({
              ticker,
              name: d[1] || d[0] || ticker,
              price: close,
              change_percent: d[3] ?? 0,
              volume: d[5] ?? undefined,
              rsi_14: d[6] ?? undefined,
              sma_50: d[7] ?? undefined,
              sma_200: d[8] ?? undefined,
              tech_rating: d[13] ?? undefined,
              last_updated: new Date().toISOString(),
            });
          }
        }

        if (results.length > 0) {
          return results;
        }
      }
    } catch (error) {
      console.log(`${source.name} failed`);
    }
  }

  return results;
}

export default async function handler(req: Request) {
  try {
    const prices = await fetchMoroccanPrices();
    return new Response(JSON.stringify({ 
      success: true, 
      data: prices, 
      count: prices.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
