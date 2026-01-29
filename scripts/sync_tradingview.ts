
import fs from 'fs';
import path from 'path';

const TV_SCANNER_URL = 'https://scanner.tradingview.com/morocco/scan';

const TICKER_MAP: Record<string, string> = {
    'SOT': 'SOTHEMA',
    'TGC': 'TGCC',
    'SNP': 'SNEP',
    'GTM': 'SGTM'
};

const main = async () => {
    console.log("Fetching live data from TradingView (Morocco)...");

    try {
        const response = await fetch(TV_SCANNER_URL, {
            method: 'POST',
            body: JSON.stringify({
                "filter": [],
                "options": { "lang": "en" },
                "markets": ["morocco"],
                "symbols": { "query": { "types": [] }, "tickers": [] },
                "columns": [
                    "name",
                    "close",
                    "market_cap_basic",
                    "price_earnings_ttm",
                    "dividend_yield_recent",
                    "change",
                    "volume"
                ],
                "sort": { "sortBy": "name", "sortOrder": "asc" },
                "range": [0, 150]
            })
        });

        if (!response.ok) {
            throw new Error(`TradingView API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        const rows = data.data || [];

        const prices: Record<string, number> = {};
        const fundamentals: any[] = [];

        rows.forEach((row: any) => {
            const [name, close, mcap, pe, dy, change, volume] = row.d;

            // Clean up name (TradingView often has suffixes)
            const ticker = name.split(':')[0];

            prices[ticker] = close;

            // Also map variants for backward compatibility if needed
            Object.entries(TICKER_MAP).forEach(([short, full]) => {
                if (ticker === full) prices[short] = close;
            });

            fundamentals.push({
                ticker,
                price: close,
                marketCap: mcap,
                peRatio: pe,
                dividendYield: dy,
                changePercent: change,
                volume
            });
        });

        // Generate the daily_data.ts file
        const tsContent = `
import { AnalystTarget, TickerFundamentals } from './types';

export const LATEST_PRICES: Record<string, number> = ${JSON.stringify(prices, null, 4)};

export const TICKER_FUNDAMENTALS: TickerFundamentals[] = ${JSON.stringify(fundamentals, null, 4)};

export const ANALYST_TARGETS: AnalystTarget[] = []; // TradingView targets require different endpoint
`;

        const outputPath = path.join(process.cwd(), 'daily_data.ts');
        fs.writeFileSync(outputPath, tsContent);

        console.log(`Successfully synced ${Object.keys(prices).length} tickers to daily_data.ts`);

    } catch (error) {
        console.error("Sync failed:", error);
        process.exit(1);
    }
};

main();
