import { db } from '../db';
import { FinancialFigure, FinancialRatio } from '../types';

export interface FundamentalMetrics {
    ticker: string;
    companyName: string;
    sector: string;

    // Latest ratios
    latestPE?: number;
    latestPB?: number;
    latestROE?: number;
    latestDividendYield?: number;
    latestEPS?: number;

    // Historical averages (3 years)
    avgPE?: number;
    avgROE?: number;
    avgDividendYield?: number;

    // Growth rates (CAGR)
    revenueCAGR?: number; // 3-year compound annual growth rate
    earningsCAGR?: number;

    // Trends
    roeImproving: boolean;
    revenueGrowing: boolean;

    // Historical data for charts
    historicalROE: Array<{ year: number; value: number }>;
    historicalPE: Array<{ year: number; value: number }>;
    historicalRevenue: Array<{ year: number; value: number }>;
}

export interface SectorComparison {
    sector: string;
    companies: Array<{
        ticker: string;
        name: string;
        pe?: number;
        roe?: number;
        dividendYield?: number;
    }>;
    sectorMedianPE?: number;
    sectorMedianROE?: number;
    sectorMedianDivYield?: number;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
function calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate median of an array
 */
function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/**
 * Service for fundamental analysis calculations
 */
export class FundamentalService {
    /**
     * Get fundamental metrics for a single ticker
     */
    static async getMetrics(ticker: string): Promise<FundamentalMetrics | null> {
        const company = await db.companies.where('ticker').equals(ticker).first();
        if (!company) return null;

        const figures = await db.financialFigures
            .where('ticker')
            .equals(ticker)
            .sortBy('year');

        const ratios = await db.financialRatios
            .where('ticker')
            .equals(ticker)
            .sortBy('year');

        if (figures.length === 0 || ratios.length === 0) return null;

        // Get latest year data
        const latestRatio = ratios[ratios.length - 1];
        const latestFigure = figures[figures.length - 1];

        // Calculate historical averages (defensively – avoid divide by zero)
        let avgPE: number | undefined;
        let avgROE: number | undefined;
        let avgDividendYield: number | undefined;

        if (ratios.length > 0) {
            const peSamples = ratios
                .map(r => r.per)
                .filter((v): v is number => v !== undefined);
            if (peSamples.length > 0) {
                avgPE = peSamples.reduce((sum, v) => sum + v, 0) / peSamples.length;
            }

            const roeSamples = ratios
                .map(r => r.roe_percent)
                .filter((v): v is number => v !== undefined);
            if (roeSamples.length > 0) {
                avgROE = roeSamples.reduce((sum, v) => sum + v, 0) / roeSamples.length;
            }

            const divSamples = ratios
                .map(r => r.dividend_yield_percent)
                .filter((v): v is number => v !== undefined);
            if (divSamples.length > 0) {
                avgDividendYield = divSamples.reduce((sum, v) => sum + v, 0) / divSamples.length;
            }
        }

        // Calculate growth rates (3-year CAGR)
        let revenueCAGR: number | undefined;
        let earningsCAGR: number | undefined;

        if (figures.length >= 2) {
            const oldestFigure = figures[0];
            const years = latestFigure.year - oldestFigure.year;

            if (years > 0) {
                if (oldestFigure.revenue && latestFigure.revenue) {
                    revenueCAGR = calculateCAGR(oldestFigure.revenue, latestFigure.revenue, years);
                }

                if (oldestFigure.net_income_group_share && latestFigure.net_income_group_share) {
                    earningsCAGR = calculateCAGR(
                        oldestFigure.net_income_group_share,
                        latestFigure.net_income_group_share,
                        years
                    );
                }
            }
        }

        // Determine trends
        const roeValues = ratios
            .map(r => r.roe_percent)
            .filter((v): v is number => v !== undefined);
        const roeImproving = roeValues.length >= 2
            ? roeValues[roeValues.length - 1] > roeValues[0]
            : false;

        const revenueValues = figures.map(f => f.revenue).filter(v => v !== undefined) as number[];
        const revenueGrowing = revenueValues.length >= 2
            ? revenueValues[revenueValues.length - 1] > revenueValues[0]
            : false;

        // Prepare historical data for charts
        const historicalROE = ratios
            .filter(r => r.roe_percent !== undefined)
            .map(r => ({ year: r.year, value: r.roe_percent! }));

        const historicalPE = ratios
            .filter(r => r.per !== undefined)
            .map(r => ({ year: r.year, value: r.per! }));

        const historicalRevenue = figures
            .filter(f => f.revenue !== undefined)
            .map(f => ({ year: f.year, value: f.revenue! }));

        return {
            ticker,
            companyName: company.name,
            sector: company.sector,
            latestPE: latestRatio.per,
            latestPB: latestRatio.pbr,
            latestROE: latestRatio.roe_percent,
            latestDividendYield: latestRatio.dividend_yield_percent,
            latestEPS: latestRatio.eps_bpa,
            avgPE,
            avgROE,
            avgDividendYield,
            revenueCAGR,
            earningsCAGR,
            roeImproving,
            revenueGrowing,
            historicalROE,
            historicalPE,
            historicalRevenue
        };
    }

    /**
     * Get metrics for multiple tickers
     */
    static async getMultipleMetrics(tickers: string[]): Promise<FundamentalMetrics[]> {
        const metrics = await Promise.all(tickers.map(t => this.getMetrics(t)));
        return metrics.filter((m): m is FundamentalMetrics => m !== null);
    }

    /**
     * Get sector comparison data
     */
    static async getSectorComparison(sector: string): Promise<SectorComparison | null> {
        const companies = await db.companies.where('sector').equals(sector).toArray();

        if (companies.length === 0) return null;

        const companiesData = [];
        const peValues: number[] = [];
        const roeValues: number[] = [];
        const divYieldValues: number[] = [];

        for (const company of companies) {
            const latestRatio = await db.financialRatios
                .where('ticker')
                .equals(company.ticker)
                .last();

            if (latestRatio) {
                companiesData.push({
                    ticker: company.ticker,
                    name: company.name,
                    pe: latestRatio.per,
                    roe: latestRatio.roe_percent,
                    dividendYield: latestRatio.dividend_yield_percent
                });

                if (latestRatio.per) peValues.push(latestRatio.per);
                if (latestRatio.roe_percent) roeValues.push(latestRatio.roe_percent);
                if (latestRatio.dividend_yield_percent) divYieldValues.push(latestRatio.dividend_yield_percent);
            }
        }

        return {
            sector,
            companies: companiesData,
            sectorMedianPE: peValues.length > 0 ? median(peValues) : undefined,
            sectorMedianROE: roeValues.length > 0 ? median(roeValues) : undefined,
            sectorMedianDivYield: divYieldValues.length > 0 ? median(divYieldValues) : undefined
        };
    }

    /**
     * Get top performers by a specific metric
     */
    static async getTopPerformers(
        metric: 'roe' | 'revenue_growth' | 'dividend_yield',
        limit: number = 10
    ): Promise<FundamentalMetrics[]> {
        const allCompanies = await db.companies.toArray();
        const metrics = await this.getMultipleMetrics(allCompanies.map(c => c.ticker));

        const sorted = metrics.sort((a, b) => {
            switch (metric) {
                case 'roe':
                    return (b.latestROE || 0) - (a.latestROE || 0);
                case 'revenue_growth':
                    return (b.revenueCAGR || 0) - (a.revenueCAGR || 0);
                case 'dividend_yield':
                    return (b.latestDividendYield || 0) - (a.latestDividendYield || 0);
                default:
                    return 0;
            }
        });

        return sorted.slice(0, limit);
    }
}
