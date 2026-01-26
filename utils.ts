import { Trade, Position, MonthlyMetric, TickerFrequency, PortfolioSummary } from './types';

// Fees breakdown strictly from the "Grille Tarifaire" Image:
// Intermédiation (Brokerage): 0.60% (HT), Min 7.50 DH
// Règlement/Livraison (Settlement): 0.20% (HT), Min 2.50 DH
// VAT (TVA): 10% on all commissions
// TPCVM (Tax on Capital Gains): 15% (Standard)
const FEES = {
    inter: 0.006, interMin: 7.50,
    rl: 0.002, rlMin: 2.50,
    tva: 0.10,
    tpcvm: 0.15
};

// Total percentage-based fee rate for Break-even projection only
// (0.6% + 0.2%) * 1.10 = 0.88%
const TOTAL_FEE_RATE = (FEES.inter + FEES.rl) * (1 + FEES.tva);

// Helper for strict financial rounding
const roundTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateTransactionFees = (qty: number, price: number): number => {
    const gross = qty * price;

    // 1. Calculate HT amounts strictly applying minimums
    // Use standard Math.max but don't round yet to maintain precision until the sum
    const brokerageRaw = Math.max(gross * FEES.inter, FEES.interMin);
    const settlementRaw = Math.max(gross * FEES.rl, FEES.rlMin);

    // 2. Sum HT and Round (Banks usually round the Line Item HT total)
    const totalHt = roundTwo(brokerageRaw + settlementRaw);

    // 3. Calculate VAT on the rounded HT
    const tva = roundTwo(totalHt * FEES.tva);

    // 4. Return Total TTC
    return roundTwo(totalHt + tva);
};

export const calculatePortfolioStats = (trades: Trade[], currentPrices: Record<string, number>): { positions: Position[], summary: PortfolioSummary, enrichedTrades: Trade[] } => {
    const positions: Record<string, Position> = {};
    let totalFees = 0;
    let totalTaxes = 0;
    let totalRealizedPnL = 0;

    // Stats for Kelly Criterion
    let winningTradesPnl = 0;
    let losingTradesPnl = 0;
    let winCount = 0;
    let lossCount = 0;

    // Sort trades by date to ensure correct FIFO/Weighted Average Cost calculation sequence
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const enrichedTrades = sortedTrades.map(t => {
        const fees = calculateTransactionFees(t.qty, t.price);
        let tax = 0;
        let netAmount = 0;
        let realized = 0;
        let taxableGain = 0;

        // Initialize position if not exists
        if (!positions[t.ticker]) {
            positions[t.ticker] = {
                ticker: t.ticker,
                qty: 0,
                avgCost: 0,
                totalCost: 0,
                marketPrice: 0,
                marketValue: 0,
                unrealizedPnL: 0,
                totalSoldVal: 0,
                buyCount: 0,
                sellCount: 0,
                realizedPnL: 0,
                totalFeesPaid: 0,
                totalTaxPaid: 0,
                breakEven: 0
            };
        }
        const pos = positions[t.ticker];
        pos.totalFeesPaid += fees;
        totalFees += fees;

        if (t.type === 'Achat') {
            // For Buys: Acquisition Cost = (Price * Qty) + Fees (TTC)
            netAmount = (t.qty * t.price) + fees;

            // Weighted Average Cost (PMP) Calculation
            // PMP = (Total Cost of held shares + Cost of new shares) / Total Shares
            const oldTotalCost = pos.avgCost * pos.qty;
            const newTotalCost = oldTotalCost + netAmount;
            const newQty = pos.qty + t.qty;

            pos.avgCost = newQty > 0 ? newTotalCost / newQty : 0;
            pos.qty = newQty;
            pos.totalCost = pos.qty * pos.avgCost; // Total Book Value
            pos.buyCount++;

        } else {
            // For Sells: Net Proceeds = (Price * Qty) - Fees (TTC)
            netAmount = (t.qty * t.price) - fees;

            // Calculate Gain/Loss based on PMP
            // Cost of Shares Sold = PMP * Qty Sold
            const costOfSharesSold = pos.avgCost * t.qty;
            const grossPnL = netAmount - costOfSharesSold;

            if (grossPnL > 0) {
                // Tax (TPCVM) applies to Net Capital Gain
                taxableGain = grossPnL;
                tax = roundTwo(grossPnL * FEES.tpcvm);
                winCount++;
                winningTradesPnl += (grossPnL - tax);
            } else {
                lossCount++;
                losingTradesPnl += Math.abs(grossPnL); // Track absolute loss
            }

            // Net Realized P&L
            realized = grossPnL - tax;

            pos.qty -= t.qty;
            // Update totalCost: The PMP of remaining shares remains unchanged
            pos.totalCost = pos.qty * pos.avgCost;

            pos.totalSoldVal += netAmount;
            pos.sellCount++;
            pos.realizedPnL += realized;
            pos.totalTaxPaid += tax;

            totalTaxes += tax;
            totalRealizedPnL += realized;
        }

        // Update Break-even Price (P)
        // Formula: P = max((TotalCost + MinFeeTTC) / Qty, AvgCost / (1 - Rate))
        // MinFeeTTC = 11.00 MAD (10 MAD HT + 10% VAT)
        // Rate = 0.88% (0.6% + 0.2% + VAT)
        if (pos.qty > 0) {
            const bpPercentage = pos.avgCost / (1 - TOTAL_FEE_RATE);
            const bpMinimum = (pos.totalCost + 11.00) / pos.qty;
            pos.breakEven = Math.max(bpPercentage, bpMinimum);
        } else {
            pos.breakEven = 0;
        }

        return {
            ...t,
            calculatedFees: fees,
            calculatedTax: tax,
            netAmount: netAmount,
            realizedPnL: t.type === 'Vente' ? realized : undefined,
            taxableGain: t.type === 'Vente' && taxableGain > 0 ? taxableGain : undefined
        };
    });

    const activePositions = Object.values(positions)
        .filter(p => p.qty > 0.001 || p.realizedPnL !== 0) // Keep if active or has realized history
        .map(p => {
            // Calculate Market Value & Unrealized P&L
            // Unrealized P&L = (Market Price * Qty) - (PMP * Qty)
            // Note: Standard Unrealized P&L is gross of potential exit fees.
            const marketPrice = currentPrices[p.ticker] || 0;
            const marketValue = p.qty * marketPrice;

            const unrealizedPnL = marketPrice > 0 ? marketValue - p.totalCost : 0;

            return {
                ...p,
                marketPrice,
                marketValue,
                unrealizedPnL
            };
        })
        .sort((a, b) => (b.qty * b.avgCost) - (a.qty * a.avgCost)); // Sort by position weight

    const buys = enrichedTrades.filter(t => t.type === 'Achat');
    const sells = enrichedTrades.filter(t => t.type === 'Vente');

    // Net Invested: Book Value of current positions
    const netInvested = activePositions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalMarketValue = activePositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPnL = activePositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

    // --- Advanced Quant Calculations ---
    const totalClosedTrades = winCount + lossCount;
    const winRate = totalClosedTrades > 0 ? (winCount / totalClosedTrades) : 0;
    const avgWin = winCount > 0 ? winningTradesPnl / winCount : 0;
    const avgLoss = lossCount > 0 ? losingTradesPnl / lossCount : 0;

    // Profit Factor: Ratio of Gross Wins to Gross Losses
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Expectancy: Average PnL per trade
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    // Kelly Criterion Formula: K% = W - [ (1 - W) / R ]
    // W = Win Probability
    // R = Win/Loss Ratio (Profit Factor)
    // We use "Half Kelly" usually for safety, but here we calculate Full Kelly
    const kellyPercent = profitFactor > 0 ? (winRate - ((1 - winRate) / profitFactor)) : 0;

    const summary: PortfolioSummary = {
        totalBuys: buys.reduce((sum, t) => sum + (t.qty * t.price), 0),
        totalSells: sells.reduce((sum, t) => sum + (t.qty * t.price), 0),
        netInvested,
        totalMarketValue,
        totalUnrealizedPnL,
        uniqueTickers: Object.keys(positions).length,
        tradeCount: trades.length,
        totalFees: roundTwo(totalFees),
        totalTaxes: roundTwo(totalTaxes),
        totalRealizedPnL: roundTwo(totalRealizedPnL),
        winRate: winRate * 100,
        avgWin,
        avgLoss,
        profitFactor,
        kellyPercent: kellyPercent * 100, // Stored as percentage (e.g., 25 for 25%)
        expectancy
    };

    return { positions: activePositions, summary, enrichedTrades };
};

/**
 * Calculates the Herfindahl-Hirschman Index (HHI) for portfolio concentration.
 * Formula: Sum of squared weights * 10,000.
 * HHI < 1500: Diversified
 * 1500 < HHI < 2500: Moderate Concentration
 * HHI > 2500: High Concentration
 */
export const calculateConcentrationRisk = (positions: Position[]): { hhi: number, level: 'Low' | 'Moderate' | 'High' } => {
    // Only consider active positions
    const active = positions.filter(p => p.qty > 0.001 && p.marketValue > 0);
    const totalValue = active.reduce((sum, p) => sum + p.marketValue, 0);

    if (totalValue === 0) return { hhi: 0, level: 'Low' };

    let sumSquaredWeights = 0;

    active.forEach(p => {
        const weight = p.marketValue / totalValue;
        sumSquaredWeights += (weight * weight);
    });

    const hhi = sumSquaredWeights * 10000;

    let level: 'Low' | 'Moderate' | 'High' = 'Low';
    if (hhi > 2500) level = 'High';
    else if (hhi > 1500) level = 'Moderate';

    return { hhi: Math.round(hhi), level };
};

export const getMonthlyMetrics = (trades: Trade[]): MonthlyMetric[] => {
    const monthly: Record<string, MonthlyMetric> = {};

    trades.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthly[month]) {
            monthly[month] = { month, buys: 0, sells: 0, trades: 0, fees: 0 };
        }
        monthly[month].trades++;
        const value = t.qty * t.price;
        const fees = calculateTransactionFees(t.qty, t.price);

        monthly[month].fees += fees;

        if (t.type === 'Achat') {
            monthly[month].buys += value;
        } else {
            monthly[month].sells += value;
        }
    });

    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
};

export const getTickerFrequency = (trades: Trade[]): TickerFrequency[] => {
    const freq: Record<string, number> = {};
    trades.forEach(t => {
        freq[t.ticker] = (freq[t.ticker] || 0) + 1;
    });
    return Object.entries(freq)
        .map(([ticker, count]) => ({ ticker, count }))
        .sort((a, b) => b.count - a.count);
};

export const getAllTickers = (trades: Trade[]): string[] => {
    return Array.from(new Set(trades.map(t => t.ticker))).sort();
};

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 }).format(val);
};

export const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
};

// Performance Utilities
// Calculate Value at Risk (VaR)
export const calculateVaR = (returns: number[], confidenceLevel: number = 0.95): number => {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sortedReturns.length * (1 - confidenceLevel));
    return sortedReturns[index];
};

// Monte Carlo Simulation using Box-Muller transform for Log-Normal distribution of returns
export const monteCarloSimulation = (
    initialValue: number,
    expectedReturn: number,
    volatility: number,
    days: number = 252,
    simulations: number = 1000
) => {
    const results = [];

    for (let i = 0; i < simulations; i++) {
        let currentValue = initialValue;
        for (let j = 0; j < days; j++) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

            // Standard Geometric Brownian Motion: S_t = S_0 * exp((mu - 0.5 * sigma^2) * dt + sigma * epsilon * sqrt(dt))
            // Here dt = 1 day
            const dailyReturn = Math.exp((expectedReturn - 0.5 * Math.pow(volatility, 2)) + volatility * z);
            currentValue *= dailyReturn;
        }
        results.push(currentValue);
    }

    const sortedResults = [...results].sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    return {
        mean,
        median: sortedResults[Math.floor(results.length / 2)],
        min: sortedResults[0],
        max: sortedResults[results.length - 1],
        stdDev: Math.sqrt(results.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / results.length),
        data: sortedResults
    };
};

// Anomaly Detection using Z-score
export const detectAnomalies = (trades: Trade[], threshold: number = 3) => {
    const amounts = trades.map(t => t.qty * t.price);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length);

    return trades.map((trade, index) => {
        const amount = trade.qty * trade.price;
        const zScore = stdDev === 0 ? 0 : Math.abs((amount - mean) / stdDev);
        return {
            ...trade,
            isAnomaly: zScore > threshold,
            anomalyScore: zScore,
            anomalyType: zScore > threshold ? (amount > mean ? 'Large Position' : 'Small Position') : null
        };
    }).filter(t => t.isAnomaly);
};

// Correlation Analysis
export const calculateCorrelationMatrix = (priceSeries: Record<string, number[]>) => {
    const tickers = Object.keys(priceSeries);
    const matrix: Record<string, Record<string, number>> = {};

    tickers.forEach(ticker1 => {
        matrix[ticker1] = {};
        tickers.forEach(ticker2 => {
            const series1 = priceSeries[ticker1];
            const series2 = priceSeries[ticker2];

            // Calculate correlation coefficient
            const n = Math.min(series1.length, series2.length);
            if (n === 0) {
                matrix[ticker1][ticker2] = 0;
                return;
            }

            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

            for (let i = 0; i < n; i++) {
                sumX += series1[i];
                sumY += series2[i];
                sumXY += series1[i] * series2[i];
                sumX2 += series1[i] * series1[i];
                sumY2 += series2[i] * series2[i];
            }

            const numerator = sumXY - (sumX * sumY) / n;
            const denominatorX = Math.sqrt(sumX2 - (sumX * sumX) / n);
            const denominatorY = Math.sqrt(sumY2 - (sumY * sumY) / n);
            const denominator = denominatorX * denominatorY;

            matrix[ticker1][ticker2] = denominator === 0 ? 0 : numerator / denominator;
        });
    });

    return matrix;
};

// Risk Contribution Analysis
export const calculateRiskContribution = (positions: Position[], correlationMatrix: Record<string, Record<string, number>>) => {
    // Calculate portfolio variance
    const weights = positions.map(pos => pos.marketValue / positions.reduce((sum, p) => sum + p.marketValue, 0));

    // This is a simplified version - full implementation would require more complex covariance calculations
    return positions.map((position, i) => {
        const weight = weights[i];
        const individualRisk = position.marketValue * (position.unrealizedPnL / position.totalCost); // Simplified
        const marginalContribution = individualRisk * weight;

        return {
            ...position,
            riskContribution: marginalContribution,
            riskPercentage: (marginalContribution / positions.reduce((sum, p) => sum + Math.abs(p.unrealizedPnL), 0)) * 100
        };
    });
};