import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

const DATA_FILE = path.join(__dirname, '../market_data_local.json');
const SIGNALS_FILE = path.join(__dirname, '../market_signals.json');
const PYTHON_SCRIPT = path.join(__dirname, '../scripts/signal_engine.py');

// OpenCode API Key
const OPENCODE_API_KEY = process.env.VITE_OPENCODE_API_KEY || process.env.OPENCODE_API_KEY || '';

// OpenCode API Proxy for GLM-5
app.post('/api/opencode/v1/chat/completions', async (req, res) => {
  if (!OPENCODE_API_KEY) {
    return res.status(401).json({
      error: {
        message: 'OpenCode API key not configured. Set VITE_OPENCODE_API_KEY environment variable.',
        type: 'authentication_error'
      }
    });
  }

  try {
    const response = await axios.post('https://opencode.ai/zen/go/v1/chat/completions', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCODE_API_KEY}`
      },
      timeout: 120000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('OpenCode API Error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({
      error: {
        message: error.message || 'Failed to connect to OpenCode API',
        type: 'api_error'
      }
    });
  }
});

// Dynamically load all tickers from the local JSON instead of hardcoding 20
function getAllTickers(): string[] {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.map((s: any) => s.ticker).filter(Boolean);
  } catch (e) {
    // Fallback if file doesn't exist
    return ['MASI', 'BCP', 'ADH', 'ATW', 'BOA', 'CIH', 'IAM', 'MNG', 'SMI'];
  }
}

// Columns requested from TradingView scanner API
// The response d[] array values correspond to this order
const TV_COLUMNS = [
  'name',             // 0
  'description',      // 1
  'close',            // 2
  'change',           // 3
  'change_abs',       // 4
  'volume',           // 5
  'RSI',              // 6
  'SMA50',            // 7
  'SMA200',           // 8
  'MACD.macd',        // 9
  'MACD.signal',      // 10
  'BB.upper',         // 11
  'BB.lower',         // 12
  'Recommend.All',    // 13
  'market_cap_basic',        // 14
  'price_earnings_ttm',      // 15
  'dividend_yield_recent',   // 16
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
  macd_macd?: number;
  macd_signal?: number;
  bb_upper?: number;
  bb_lower?: number;
  tech_rating?: number;
  last_updated: string;
}

async function fetchMoroccanPrices(): Promise<StockPrice[]> {
  const tickers = getAllTickers();
  const results: StockPrice[] = [];

  console.log(`Fetching prices for ${tickers.length} Moroccan stocks...`);

  // Try TradingView scanner API with market filter (more reliable than per-ticker)
  const sources = [
    { name: 'TradingView Global', url: 'https://scanner.tradingview.com/global/scan' },
    { name: 'TradingView Morocco', url: 'https://scanner.tradingview.com/morocco/scan' },
  ];

  for (const source of sources) {
    try {
      console.log(`Trying ${source.name}...`);

      // Build payload: use tickers list to request specific symbols
      const payload: any = {
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
          // TradingView returns d[] as flat values matching TV_COLUMNS order
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
              last_updated: new Date().toISOString(),
            });
          }
        }

        if (results.length > 0) {
          console.log(`✓ Fetched ${results.length} stocks from ${source.name}`);
          return results;
        }
      }
    } catch (error: any) {
      console.log(`✗ ${source.name} failed: ${error.message}`);
    }
  }

  // If all APIs fail, return data from local JSON
  console.log('All APIs failed, using local data');
  return getDemoPrices();
}

async function getDemoPrices(): Promise<StockPrice[]> {
  // Read existing data to return all stocks with their stored values
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const existingData = JSON.parse(fileContent);
    return existingData.map((s: any) => ({
      ticker: s.ticker,
      name: s.name || s.ticker,
      price: s.price ?? 0,
      change_percent: s.change_percent ?? 0,
      volume: s.volume,
      rsi_14: s.rsi_14,
      sma_50: s.sma_50,
      sma_200: s.sma_200,
      tech_rating: s.tech_rating,
      last_updated: s.last_updated || new Date().toISOString(),
    }));
  } catch (e) {
    return [];
  }
}

async function updatePricesInFile(stocks: StockPrice[]) {
  let existingData: any[] = [];

  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    existingData = JSON.parse(fileContent);
  } catch (e) {
    console.log('No existing data file, creating new one');
  }

  const updatedData = existingData.map(existingStock => {
    const newPrice = stocks.find(s => s.ticker === existingStock.ticker);
    if (newPrice) {
      return {
        ...existingStock,
        price: newPrice.price,
        change_percent: newPrice.change_percent,
        last_updated: newPrice.last_updated
      };
    }
    return existingStock;
  });

  // Add any new stocks that weren't in the original data
  for (const stock of stocks) {
    if (!updatedData.find(s => s.ticker === stock.ticker)) {
      updatedData.push(stock);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2));
  console.log(`Updated ${DATA_FILE}`);

  return updatedData;
}

app.get('/api/prices', async (req, res) => {
  try {
    const prices = await fetchMoroccanPrices();
    res.json({ success: true, data: prices, count: prices.length });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/prices/update', async (req, res) => {
  try {
    const prices = await fetchMoroccanPrices();

    // DELIBERATELY REMOVED updatePricesInFile(prices) here:
    // Writing to the local JSON file on every fetch causes Vite to trigger HMR, 
    // reloading the UI and creating an infinite fetch loop.
    // The frontend securely holds these live prices in memory instead.

    res.json({
      success: true,
      message: `Fetched ${prices.length} prices`,
      count: prices.length,
      data: prices
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual price update endpoint
app.post('/api/prices/manual', async (req, res) => {
  const { ticker, price, change_percent } = req.body;

  if (!ticker || !price) {
    return res.status(400).json({ success: false, error: 'ticker and price required' });
  }

  try {
    let existingData: any[] = [];
    try {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (e) { }

    const index = existingData.findIndex((s: any) => s.ticker === ticker);
    if (index >= 0) {
      existingData[index].price = price;
      existingData[index].change_percent = change_percent || 0;
      existingData[index].last_updated = new Date().toISOString();
    } else {
      existingData.push({
        ticker,
        name: ticker,
        price,
        change_percent: change_percent || 0,
        last_updated: new Date().toISOString()
      });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
    res.json({ success: true, message: `Updated ${ticker}`, data: existingData[index] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/prices/status', (req, res) => {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    const lastUpdated = data[0]?.last_updated || null;
    res.json({
      success: true,
      stockCount: data.length,
      lastUpdated
    });
  } catch (e) {
    res.json({
      success: true,
      stockCount: 0,
      lastUpdated: null
    });
  }
});

app.get('/api/market-signals', async (req, res) => {
  try {
    const signalsPath = path.join(process.cwd(), 'market_signals.json');
    if (fs.existsSync(signalsPath)) {
      const data = await fs.promises.readFile(signalsPath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      // Create placeholder and return info
      const placeholderData = {
        regime: 'mixed',
        last_updated: new Date().toISOString(),
        stocks: [],
        note: 'Market signals require Python with tvscreener. Install: pip install tvscreener pandas numpy'
      };
      res.json(placeholderData);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read signals' });
  }
});

// Frontend signals endpoint - transforms market_signals.json to frontend format
app.get('/api/signals', async (req, res) => {
  try {
    const signalsPath = path.join(process.cwd(), 'market_signals.json');
    let rawData: any = { regime: 'mixed', last_updated: new Date().toISOString(), stocks: [] };
    
    if (fs.existsSync(signalsPath)) {
      const data = await fs.promises.readFile(signalsPath, 'utf8');
      rawData = JSON.parse(data);
    }
    
    // Transform to frontend format
    const signals = (rawData.stocks || []).map((s: any) => ({
      ticker: s.ticker,
      name: s.name || s.ticker,
      price: s.close || s.price || 0,
      change_percent: s.price_change_pct || s.change_percent || 0,
      bull_score: s.bull_score || 0,
      bear_score: s.bear_score || 0,
      conviction: s.conviction || 'NEUTRAL',
      perfect_entry: s.perfect_entry || null,
      quality_score: s.quality_score,
      quality_grade: s.quality_grade || 'F',
      is_liquid: s.is_liquid !== false,
      rvol: s.rvol,
      bb_position: s.bb_position,
      relative_rsi: s.relative_rsi,
      is_squeeze: s.is_squeeze,
      rsi_14: s.rsi,
      sma_50: s.sma_50,
      sma_200: s.sma_200,
      tech_rating: s.tech_rating,
      signals: (s.signal_flags || []).map((f: string) => ({
        type: f.toLowerCase().includes('bear') || f.toLowerCase().includes('sell') ? 'bearish' : 'bullish',
        indicator: f,
        message: f,
        strength: 70
      })),
      flags: s.signal_flags || [],
      technical: {
        rsi: s.rsi,
        trend: s.sma_50 > s.sma_200 ? 'UPTREND' : 'DOWNTREND',
        macd: 'NEUTRAL',
        support: s.bb_lower,
        resistance: s.bb_upper
      }
    }));
    
    const strongBuy = signals.filter((s: any) => (s.bull_score || 0) >= 7);
    const strongSell = signals.filter((s: any) => (s.bear_score || 0) >= 7);
    
    res.json({
      success: true,
      regime: rawData.regime || 'mixed',
      last_updated: rawData.last_updated,
      signals,
      summary: {
        total: signals.length,
        strong_buy_count: strongBuy.length,
        strong_sell_count: strongSell.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to read signals' });
  }
});

app.post('/api/trigger-signals', async (req, res) => {
  try {
    const result = await runSignalEngine();
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Signal engine executed successfully',
        output: result.stdout 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Signal engine requires Python with tvscreener package',
        hint: 'Install: pip install tvscreener pandas numpy',
        error: result.error
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Initial run of signal engine if file doesn't exist (optional - requires Python)
const signalsPath = path.join(process.cwd(), 'market_signals.json');
if (!fs.existsSync(signalsPath)) {
  console.log('Market signals file not found. Creating placeholder...');
  // Create placeholder file instead of running Python
  const placeholderData = {
    regime: 'mixed',
    last_updated: new Date().toISOString(),
    stocks: [],
    note: 'Signal engine requires Python with tvscreener package. Run: pip install tvscreener pandas numpy'
  };
  fs.writeFileSync(signalsPath, JSON.stringify(placeholderData, null, 2));
  console.log('Created placeholder market_signals.json. Signal generation requires Python.');
}

// Helper to run the python signal engine (optional - requires Python with tvscreener)
async function runSignalEngine(): Promise<{ success: boolean; error?: string; stderr?: string; stdout?: string }> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'signal_engine.py');
  
  // Check if Python script exists
  if (!fs.existsSync(scriptPath)) {
    console.log('Signal engine script not found, skipping...');
    return { success: false, error: 'Signal engine script not found' };
  }

  console.log(`Executing signal engine: ${scriptPath}`);

  // Try different python commands
  const commands = ['python', 'python3', 'py'];
  let lastError = '';
  let lastStderr = '';
  let lastStdout = '';

  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execAsync(`${cmd} "${scriptPath}"`, { 
        timeout: 60000,
        cwd: process.cwd()
      });
      lastStdout = stdout;
      if (stderr && !stderr.includes('Warning:')) console.warn(`Signal Engine (${cmd}) Stderr:`, stderr);
      console.log(`Signal Engine (${cmd}) completed successfully`);
      return { success: true, stdout, stderr };
    } catch (error: any) {
      lastError = error.message;
      lastStderr = error.stderr || '';
    }
  }

  // Check if the output file was created despite the error
  const signalsPath = path.join(process.cwd(), 'market_signals.json');
  if (fs.existsSync(signalsPath)) {
    console.log('Signal output file exists, using cached data');
    return { success: true, stdout: 'Using cached signals', stderr: lastStderr };
  }

  console.log('Signal engine requires Python with tvscreener package. Install with: pip install tvscreener pandas numpy');
  return { success: false, error: 'Python not available or tvscreener not installed', stderr: lastStderr };
}

app.listen(PORT, () => {
  console.log(`
=====================================================
       Moroccan Stock Price Server Running
=====================================================
  Server:    http://localhost:${PORT}

  Endpoints:
  GET  /api/prices        - Get current prices
  POST /api/prices/update - Fetch & save prices
  POST /api/prices/manual - Manual price update
  GET  /api/prices/status - Check last update
  GET  /api/signals       - Get trading signals (frontend format)
  GET  /api/market-signals- Get raw market signals
  POST /api/trigger-signals - Generate new signals
  POST /api/opencode/v1/chat/completions - GLM-5 AI proxy
=====================================================
  `);
});
