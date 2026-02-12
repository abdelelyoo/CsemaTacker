import { db } from '../db';
import { FinancialRatio, FinancialFigure, DividendRecord } from '../types';

export interface QualityScore {
    ticker: string;
    companyName: string;
    sector: string;

    // Sub-scores (0-100)
    financialHealthScore: number; // ROE, debt, margin trends
    dividendQualityScore: number; // Payout ratio, consistency, growth
    valuationAttractiveness: number; // P/E vs growth, PB ratio
    governanceScore?: number; // If data available

    // Overall
    overallQuality: number; // Weighted average
    qualityRating: 'A' | 'B' | 'C' | 'D' | 'F';

    // Flags
    redFlags: string[]; // Warnings
    greenFlags: string[]; // Positives

    // Trends
    qualityTrend: 'improving' | 'stable' | 'declining';
}

/**
 * Convert score to letter grade
 */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
function calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Service for portfolio quality scoring
 */
export class QualityScoreService {
    /**
     * Calculate financial health score (40% of total)
     */
    private static async calculateFinancialHealthScore(ticker: string): Promise<number> {
        let score = 0;

        // Get financial ratios
        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .toArray();

        // Get financial figures
        const figures = await db.financialFigures
            .where('ticker')
            .equals(ticker)
            .toArray();

        if (ratios.length === 0 || figures.length === 0) return 50; // Default neutral score

        ratios.sort((a, b) => a.year - b.year);
        figures.sort((a, b) => a.year - b.year);

        // ROE Trend (0-30 points)
        const roeValues = ratios
            .map(r => r.roe_percent)
            .filter((roe): roe is number => roe !== undefined);
        if (roeValues.length >= 2) {
            if (roeValues[roeValues.length - 1] > roeValues[0]) {
                score += 30; // Improving
            } else if (roeValues[roeValues.length - 1] === roeValues[0]) {
                score += 20; // Stable
            } else {
                score += 5; // Declining
            }
        }

        // Debt Level (0-30 points)
        const latestFigure = figures[figures.length - 1];
        if (latestFigure.shareholders_equity && latestFigure.shareholders_equity > 0) {
            // Calculate a proxy for debt (simplified)
            // If we had total assets and liabilities, we'd use those
            // For now, use equity as proxy
            const equity = latestFigure.shareholders_equity;
            const revenue = latestFigure.revenue || 1;

            const equityRatio = equity / revenue;
            if (equityRatio > 0.5) score += 30;
            else if (equityRatio > 0.3) score += 20;
            else if (equityRatio > 0.1) score += 10;
            else score += 5;
        }

        // Profit Margin Trend (0-40 points)
        if (latestFigure.net_income_group_share && latestFigure.revenue) {
            const netMargin = (latestFigure.net_income_group_share / latestFigure.revenue) * 100;
            if (netMargin > 15) score += 40;
            else if (netMargin > 10) score += 30;
            else if (netMargin > 5) score += 20;
            else if (netMargin > 0) score += 10;
            else score += 0;
        }

        return clamp(score, 0, 100);
    }

    /**
     * Calculate dividend quality score (35% of total)
     */
    private static async calculateDividendQualityScore(ticker: string): Promise<number> {
        let score = 0;

        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .toArray();

        const dividends = await db.dividends
            .where('ticker')
            .equals(ticker)
            .toArray();

        if (ratios.length === 0 || dividends.length === 0) return 40; // Low score for non-dividend stocks

        ratios.sort((a, b) => a.year - b.year);
        dividends.sort((a, b) => a.year - b.year);

        const latestRatio = ratios[ratios.length - 1];

        // Payout Ratio (0-35 points)
        if (latestRatio.payout_percent !== undefined) {
            const payoutRatio = latestRatio.payout_percent;
            if (payoutRatio < 50) score += 35;
            else if (payoutRatio < 70) score += 25;
            else if (payoutRatio < 100) score += 15;
            else score += 0; // Unsustainable
        }

        // Consistency (0-30 points) - Check for dividend cuts
        let cuts = 0;
        for (let i = 1; i < dividends.length; i++) {
            if (dividends[i].amount < dividends[i - 1].amount) {
                cuts++;
            }
        }

        if (cuts === 0 && dividends.length >= 3) {
            score += 30; // Never cut with 3+ years of history
        } else if (cuts === 0) {
            score += 20;
        } else if (cuts === 1) {
            score += 15;
        } else {
            score += 5;
        }

        // Growth Rate (0-35 points)
        if (dividends.length >= 2) {
            const oldestDiv = dividends[0].amount;
            const latestDiv = dividends[dividends.length - 1].amount;
            const years = dividends.length - 1;

            if (oldestDiv > 0) {
                const divGrowth = calculateCAGR(oldestDiv, latestDiv, years);

                if (divGrowth > 10) score += 35;
                else if (divGrowth > 5) score += 25;
                else if (divGrowth > 0) score += 15;
                else if (divGrowth < -10) score += 0;
                else score += 5;
            }
        }

        return clamp(score, 0, 100);
    }

    /**
     * Calculate valuation attractiveness (25% of total)
     */
    private static async calculateValuationAttractiveness(ticker: string): Promise<number> {
        let score = 50; // Neutral baseline

        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .toArray();

        const figures = await db.financialFigures
            .where('ticker')
            .equals(ticker)
            .toArray();

        if (ratios.length === 0 || figures.length === 0) return 50;

        const latestRatio = ratios[ratios.length - 1];

        let avgRatio: number | undefined;
        const peSamples = ratios
            .map(r => r.per)
            .filter((v): v is number => v !== undefined);
        if (peSamples.length > 0) {
            avgRatio = peSamples.reduce((sum, v) => sum + v, 0) / peSamples.length;
        }

        // P/E vs average (0-50 points)
        if (latestRatio.per && avgRatio && avgRatio > 0) {
            const peRatio = latestRatio.per / avgRatio;
            if (peRatio < 0.8) score += 40;
            else if (peRatio < 1.0) score += 30;
            else if (peRatio < 1.2) score += 20;
            else if (peRatio < 1.5) score += 10;
            else score += 0;
        }

        // P/B ratio check (0-50 points)
        if (latestRatio.pbr && latestRatio.pbr > 0) {
            if (latestRatio.pbr < 1.0) score += 40;
            else if (latestRatio.pbr < 1.5) score += 25;
            else if (latestRatio.pbr < 2.0) score += 15;
            else score += 5;
        }

        return clamp(score, 0, 100);
    }

    /**
     * Get quality score for a single ticker
     */
    static async getQualityScore(ticker: string): Promise<QualityScore | null> {
        const company = await db.companies.where('ticker').equals(ticker).first();
        if (!company) return null;

        // Calculate sub-scores
        const financialHealthScore = await this.calculateFinancialHealthScore(ticker);
        const dividendQualityScore = await this.calculateDividendQualityScore(ticker);
        const valuationAttractiveness = await this.calculateValuationAttractiveness(ticker);

        // Calculate overall (weighted average: 40% + 35% + 25%)
        const overallQuality =
            financialHealthScore * 0.4 + dividendQualityScore * 0.35 + valuationAttractiveness * 0.25;

        // Detect red flags
        const redFlags: string[] = [];
        const greenFlags: string[] = [];

        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .toArray();

        const figures = await db.financialFigures
            .where('ticker')
            .equals(ticker)
            .toArray();

        if (ratios.length > 0 && figures.length > 0) {
            ratios.sort((a, b) => a.year - b.year);
            figures.sort((a, b) => a.year - b.year);

            const latestRatio = ratios[ratios.length - 1];
            const latestFigure = figures[figures.length - 1];

            // Check payout ratio
            if (latestRatio.payout_percent && latestRatio.payout_percent > 100) {
                redFlags.push('Unsustainable dividend payout (> 100%)');
            } else if (latestRatio.payout_percent && latestRatio.payout_percent > 80) {
                redFlags.push('High payout ratio (> 80%)');
            }

            // Check ROE trend
            const roeValues = ratios
                .map(r => r.roe_percent)
                .filter((roe): roe is number => roe !== undefined);
            if (roeValues.length >= 2) {
                if (roeValues[roeValues.length - 1] < roeValues[0]) {
                    redFlags.push('Declining ROE');
                } else if (roeValues[roeValues.length - 1] > roeValues[0] * 1.1) {
                    greenFlags.push('Rising ROE');
                }
            }

            // Check for dividend cuts
            const dividends = await db.dividends
                .where('ticker')
                .equals(ticker)
                .toArray();
            if (dividends.length > 0) {
                dividends.sort((a, b) => a.year - b.year);
                for (let i = 1; i < dividends.length; i++) {
                    if (dividends[i].amount < dividends[i - 1].amount) {
                        redFlags.push(`Dividend cut in ${dividends[i].year}`);
                        break;
                    }
                }

                // Check for dividend growth
                if (dividends.length >= 3) {
                    const oldestDiv = dividends[0].amount;
                    const latestDiv = dividends[dividends.length - 1].amount;
                    if (latestDiv > oldestDiv * 1.2) {
                        greenFlags.push('Strong dividend growth');
                    }
                }
            }

            // Check valuation
            if (latestRatio.per && latestRatio.per > 30) {
                redFlags.push('High P/E ratio (> 30)');
            } else if (latestRatio.per && latestRatio.per < 10) {
                greenFlags.push('Attractive valuation (P/E < 10)');
            }

            // Check revenue growth
            if (figures.length >= 2) {
                const oldestRevenue = figures[0].revenue;
                const latestRevenue = latestFigure.revenue;
                if (oldestRevenue && latestRevenue && oldestRevenue > 0) {
                    const revenueGrowth =
                        ((latestRevenue - oldestRevenue) / oldestRevenue) * 100;
                    if (revenueGrowth > 20) {
                        greenFlags.push('Strong revenue growth');
                    } else if (revenueGrowth < -10) {
                        redFlags.push('Declining revenue');
                    }
                }
            }
        }

        // Determine quality trend
        let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
        if (greenFlags.length > redFlags.length) {
            qualityTrend = 'improving';
        } else if (redFlags.length > greenFlags.length) {
            qualityTrend = 'declining';
        }

        return {
            ticker,
            companyName: company.name,
            sector: company.sector,
            financialHealthScore,
            dividendQualityScore,
            valuationAttractiveness,
            overallQuality: clamp(overallQuality, 0, 100),
            qualityRating: scoreToGrade(overallQuality),
            redFlags,
            greenFlags,
            qualityTrend
        };
    }

    /**
     * Get quality scores for multiple tickers
     */
    static async getMultipleScores(tickers: string[]): Promise<QualityScore[]> {
        const scores = await Promise.all(tickers.map(t => this.getQualityScore(t)));
        return scores.filter((s): s is QualityScore => s !== null);
    }

    /**
     * Get sector quality average
     */
    static async getSectorQualityAverage(sector: string): Promise<{
        avgOverall: number;
        avgFinancialHealth: number;
        avgDividendQuality: number;
        avgValuation: number;
    }> {
        const companies = await db.companies.where('sector').equals(sector).toArray();
        const scores = await this.getMultipleScores(companies.map(c => c.ticker));

        if (scores.length === 0) {
            return {
                avgOverall: 0,
                avgFinancialHealth: 0,
                avgDividendQuality: 0,
                avgValuation: 0
            };
        }

        return {
            avgOverall: scores.reduce((sum, s) => sum + s.overallQuality, 0) / scores.length,
            avgFinancialHealth: scores.reduce((sum, s) => sum + s.financialHealthScore, 0) / scores.length,
            avgDividendQuality: scores.reduce((sum, s) => sum + s.dividendQualityScore, 0) / scores.length,
            avgValuation: scores.reduce((sum, s) => sum + s.valuationAttractiveness, 0) / scores.length
        };
    }

    /**
     * Get top quality stocks
     */
    static async getTopQualityStocks(limit: number = 10): Promise<QualityScore[]> {
        const companies = await db.companies.toArray();
        const scores = await this.getMultipleScores(companies.map(c => c.ticker));

        return scores
            .sort((a, b) => b.overallQuality - a.overallQuality)
            .slice(0, limit);
    }

    /**
     * Get stocks with red flags
     */
    static async getStocksWithRedFlags(): Promise<QualityScore[]> {
        const companies = await db.companies.toArray();
        const scores = await this.getMultipleScores(companies.map(c => c.ticker));

        return scores.filter(s => s.redFlags.length > 0)
            .sort((a, b) => b.redFlags.length - a.redFlags.length);
    }

    /**
     * Get red flag count for a stock
     */
    static async getRedFlagCount(ticker: string): Promise<number> {
        const score = await this.getQualityScore(ticker);
        return score ? score.redFlags.length : 0;
    }
}
