
import { AnalystTarget, MarketIntelligence } from './types';

export const LATEST_PRICES: Record<string, number> = {
    'VCN': 420.20,
    'TGC': 831.00,
    'MSA': 1808.00, // Matching Sothema (SOT) from letter
    'DHO': 70.40,  // Delta Holding from letter
    'NKL': 52.00,
    'ATW': 720.10,
    'HPS': 520.00,
    'AKT': 1178.00,
    'RIS': 391.00,
    'STR': 221.90, // Stroc Industrie
    'FBR': 365.00, // Fenie Brossette
    'BOA': 200.00,
    'GTM': 818.00, // SGTM from letter
    'SNA': 85.00,
    'DYT': 328.00
};

export const ANALYST_TARGETS: AnalystTarget[] = [
    { ticker: 'TGC', targetPrice: 1150.00, recommendation: 'BUY', date: '2026-01-26', source: 'BKGR' },
    { ticker: 'VCN', targetPrice: 480.00, recommendation: 'ACCUMULATE', date: '2026-01-26', source: 'BKGR' },
    { ticker: 'BOA', targetPrice: 285.00, recommendation: 'BUY', date: '2026-01-26', source: 'BKGR' },
    { ticker: 'AKT', targetPrice: 1350.00, recommendation: 'HOLD', date: '2026-01-26', source: 'BKGR' },
    { ticker: 'ATW', targetPrice: 820.00, recommendation: 'ACCUMULATE', date: '2026-01-26', source: 'BKGR' },
    { ticker: 'MSA', targetPrice: 1050.00, recommendation: 'BUY', date: '2026-01-26', source: 'BKGR' }
];

export const MARKET_DAILY_HIGHLIGHTS: MarketIntelligence = {
    date: '2026-01-26',
    sentiment: 'Bearish',
    masiVariation: -1.39,
    totalVolume: 311030000,
    highlights: [
        {
            category: 'Macro',
            title: 'Market Performance',
            content: 'The MASI closed at 18,384.99 pts (-1.39%) with a global volume of 311.03 M MAD. The market continues its year-to-date decline of -2.45%.'
        },
        {
            category: 'Corporate',
            title: 'TAQA Morocco - JBIC Partnership',
            content: 'TAQA Morocco signed a memorandum with Japan Bank for International Cooperation (JBIC) to exploit financing opportunities for electricity, water, and infrastructure projects up to 2030.',
            tickers: ['TQA']
        },
        {
            category: 'Macro',
            title: 'Tech Financing Surge',
            content: 'Morocco ranks 7th in Africa for total tech financing raised in 2025, according to the Africa Tech Venture Capital Report.'
        },
        {
            category: 'Corporate',
            title: 'Mining Dominance',
            content: 'Minière Touissit (+8.63%) and SMI (+8.08%) were the top performers of the session. In contrast, SNA (-5.73%) and Jet Contractors (-5.55%) faced significant selling pressure.',
            tickers: ['SMT', 'SMI', 'SNA', 'JET']
        }
    ],
    topPerformers: [
        { ticker: 'CMT', change: 8.63 },
        { ticker: 'SMI', change: 8.08 },
        { ticker: 'SOT', change: 4.45 }
    ],
    bottomPerformers: [
        { ticker: 'SNP', change: -6.92 },
        { ticker: 'LES', change: -6.85 },
        { ticker: 'CRS', change: -6.58 }
    ]
};
