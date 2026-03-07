import axios from 'axios';

const TV_COLUMNS = [
  'name', 'description', 'close', 'change', 'change_abs', 'volume',
  'RSI', 'SMA50', 'SMA200', 'MACD.macd', 'MACD.signal',
  'BB.upper', 'BB.lower', 'Recommend.All', 'market_cap_basic',
  'price_earnings_ttm', 'dividend_yield_recent', 'ATR', 'ADX',
  'sector'
];

const FALLBACK_TICKERS = [
  'MASI', 'BCP', 'ADH', 'ATW', 'BOA', 'CIH', 'IAM', 'MNG', 'SMI',
  'BCP', 'WAFA', 'S2M', 'LES', 'HPS', 'MDP', 'ALM', 'SNI', 'AXA', 'CCR'
];

interface StockData {
  ticker: string;
  name: string;
  price: number;
  change_percent: number;
  volume?: number;
  rsi_14?: number;
  sma_50?: number;
  sma_200?: number;
  macd_macd?: number;
  macd_signal?: number;
  bb_upper?: number;
  bb_lower?: number;
  tech_rating?: number;
  sector?: string;
  last_updated: string;
}

interface SignalStock {
  ticker: string;
  name: string;
  price: number;
  change_percent: number;
  sector: string;
  signal: string;
  conviction: number;
  quality_score: number;
  quality_grade: string;
  fundamentals: {
    pe?: number;
    dividend_yield?: number;
    roe?: number;
    pb?: number;
  };
  technical: {
    rsi?: number;
    trend?: string;
    macd?: string;
    support?: number;
    resistance?: number;
  };
  flags: string[];
}

function calculateSignalScore(stock: StockData): { signal: string; conviction: number; flags: string[] } {
  let bull = 0;
  let bear = 0;
  const flags: string[] = [];
  
  const rsi = stock.rsi_14;
  const price = stock.price;
  const sma50 = stock.sma_50;
  const sma200 = stock.sma_200;
  const macd = stock.macd_macd;
  const macdSignal = stock.macd_signal;
  
  // RSI Analysis
  if (rsi !== undefined) {
    if (rsi < 30) { bull += 2; flags.push('RSI Oversold'); }
    else if (rsi < 40) { bull += 1; flags.push('RSI Weak'); }
    else if (rsi > 70) { bear += 2; flags.push('RSI Overbought'); }
    else if (rsi > 60) { bear += 1; flags.push('RSI Strong'); }
  }
  
  // SMA Trend
  if (sma50 !== undefined && sma200 !== undefined) {
    if (sma50 > sma200) { bull += 3; flags.push('Golden Cross'); }
    else if (sma50 < sma200) { bear += 3; flags.push('Death Cross'); }
    
    if (price > sma50) { bull += 1; flags.push('Above SMA50'); }
    if (price > sma200) { bull += 1; flags.push('Above SMA200'); }
  }
  
  // MACD
  if (macd !== undefined && macdSignal !== undefined) {
    if (macd > macdSignal) { bull += 2; flags.push('MACD Bullish'); }
    else { bear += 2; flags.push('MACD Bearish'); }
  }
  
  // Price momentum
  if (stock.change_percent !== undefined) {
    if (stock.change_percent > 3) { bull += 2; flags.push('Strong Gain'); }
    else if (stock.change_percent > 0) { bull += 1; flags.push('Positive'); }
    else if (stock.change_percent < -3) { bear += 2; flags.push('Strong Loss'); }
    else { bear += 1; flags.push('Negative'); }
  }
  
  // Bollinger Bands
  if (stock.bb_upper !== undefined && stock.bb_lower !== undefined && price !== undefined) {
    if (price < stock.bb_lower) { bull += 2; flags.push('Near Lower BB'); }
    else if (price > stock.bb_upper) { bear += 2; flags.push('Near Upper BB'); }
  }
  
  // Determine signal
  let signal = 'NEUTRAL';
  let conviction = Math.abs(bull - bear);
  
  if (bull > bear + 3) signal = 'STRONG_BUY';
  else if (bull > bear) signal = 'BUY';
  else if (bear > bull + 3) signal = 'STRONG_SELL';
  else if (bear > bull) signal = 'SELL';
  
  return { signal, conviction: Math.min(conviction, 10), flags };
}

function calculateQualityScore(stock: StockData): { score: number; grade: string } {
  let score = 50;
  
  // P/E ratio (lower is generally better, but not too low)
  // This would need fundamental data which we don't have in the API
  
  // Use tech rating if available
  if (stock.tech_rating !== undefined) {
    const rating = Number(stock.tech_rating);
    if (rating >= 8) score += 20;
    else if (rating >= 5) score += 10;
    else score -= 10;
  }
  
  // RSI extremes can indicate quality opportunities
  if (stock.rsi_14 !== undefined) {
    if (stock.rsi_14 >= 30 && stock.rsi_14 <= 50) score += 10;
    else if (stock.rsi_14 >= 50 && stock.rsi_14 <= 70) score += 5;
  }
  
  // Positive momentum
  if ((stock.change_percent ?? 0) > 0) score += 10;
  else score -= 10;
  
  // Strong trend
  if (stock.sma_50 !== undefined && stock.sma_200 !== undefined) {
    if (stock.sma_50 > stock.sma_200) score += 10;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let grade = 'C';
  if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';
  
  return { score, grade };
}

async function fetchStockData(): Promise<StockData[]> {
  const tickers = FALLBACK_TICKERS;
  const results: StockData[] = [];

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
        symbols: { tickers: tickers.map(t => `CSEMA:${t}`) },
      };

      const response = await axios.post(source.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://www.tradingview.com',
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
              macd_macd: d[9] ?? undefined,
              macd_signal: d[10] ?? undefined,
              bb_upper: d[11] ?? undefined,
              bb_lower: d[12] ?? undefined,
              tech_rating: d[13] ?? undefined,
              sector: d[17] ?? 'Unknown',
              last_updated: new Date().toISOString(),
            });
          }
        }

        if (results.length > 0) return results;
      }
    } catch (error) {
      console.log(`${source.name} failed`);
    }
  }

  return results;
}

function generateSignals(stocks: StockData[]): SignalStock[] {
  return stocks.map(stock => {
    const { signal, conviction, flags } = calculateSignalScore(stock);
    const { score, grade } = calculateQualityScore(stock);
    
    let trend = 'NEUTRAL';
    if (stock.sma_50 !== undefined && stock.sma_200 !== undefined) {
      if (stock.sma_50 > stock.sma_200) trend = 'UPTREND';
      else if (stock.sma_50 < stock.sma_200) trend = 'DOWNTREND';
    }
    
    let macdStatus = 'NEUTRAL';
    if (stock.macd_macd !== undefined && stock.macd_signal !== undefined) {
      macdStatus = stock.macd_macd > stock.macd_signal ? 'BULLISH' : 'BEARISH';
    }
    
    return {
      ticker: stock.ticker,
      name: stock.name,
      price: stock.price,
      change_percent: stock.change_percent,
      sector: stock.sector || 'Unknown',
      signal,
      conviction,
      quality_score: score,
      quality_grade: grade,
      fundamentals: {
        pe: undefined,
        dividend_yield: undefined,
        roe: undefined,
        pb: undefined
      },
      technical: {
        rsi: stock.rsi_14,
        trend,
        macd: macdStatus,
        support: stock.bb_lower,
        resistance: stock.bb_upper
      },
      flags
    };
  }).sort((a, b) => b.conviction - a.conviction);
}

export default async function handler(req: Request) {
  try {
    const stocks = await fetchStockData();
    
    if (stocks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch stock data'
      }), { status: 500 });
    }
    
    const signals = generateSignals(stocks);
    
    // Group by signal
    const grouped = {
      strong_buy: signals.filter(s => s.signal === 'STRONG_BUY'),
      buy: signals.filter(s => s.signal === 'BUY'),
      neutral: signals.filter(s => s.signal === 'NEUTRAL'),
      sell: signals.filter(s => s.signal === 'SELL'),
      strong_sell: signals.filter(s => s.signal === 'STRONG_SELL')
    };
    
    return new Response(JSON.stringify({
      success: true,
      last_updated: new Date().toISOString(),
      count: signals.length,
      signals,
      grouped,
      summary: {
        strong_buy_count: grouped.strong_buy.length,
        buy_count: grouped.buy.length,
        sell_count: grouped.sell.length,
        strong_sell_count: grouped.strong_sell.length
      }
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
