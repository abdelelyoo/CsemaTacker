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

        // Update Break-even Price
        // Break-even Price P is where Net Proceeds = Book Value
        // (P * Qty) - Fees(P * Qty) = AvgCost * Qty
        // P * (1 - Rate) = AvgCost  =>  P = AvgCost / (1 - Rate)
        // Rate = 0.88% (0.6% + 0.2% + VAT)
        // Note: This approximates that trade size > 1250 MAD (where minimums don't apply)
        pos.breakEven = pos.qty > 0 ? pos.avgCost / (1 - TOTAL_FEE_RATE) : 0;

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