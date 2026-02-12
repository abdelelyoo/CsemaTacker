import { db } from '../db';
import { DividendRecord } from '../types';
import { DIVIDEND_TAX_RATE } from '../constants';

export interface UpcomingDividend {
    ticker: string;
    companyName: string;
    year: number;
    amountPerShare: number;
    totalAmount: number; // amountPerShare * shares held
    exDate?: Date;
    paymentDate?: Date;
    daysUntilPayment: number;
    taxAmount: number;
    netAmount: number;
    sharesHeld: number;
}

export interface DividendProjection {
    ticker: string;
    companyName: string;
    currentYield: number;
    lastDividendAmount: number;
    projectedNextDividend: number;
    projectedAnnualIncome: number;
    projectedTax: number;
    projectedNetIncome: number;
    growthRate: number; // % change from previous year
    sustainability: 'healthy' | 'moderate' | 'risky';
    sustainabilityScore: number; // 0-100
    payoutRatio?: number;
}

export interface DividendSummary {
    totalProjectedIncome: number;
    totalProjectedTax: number;
    totalProjectedNetIncome: number;
    upcomingPayments: UpcomingDividend[];
    projections: DividendProjection[];
    nextPaymentDate?: Date;
    nextPaymentAmount?: number;
}

/**
 * Service for dividend analysis and forecasting
 */
export class DividendService {
    /**
     * Get upcoming dividend payments for holdings
     */
    static async getUpcomingDividends(
        holdings: Array<{ ticker: string; quantity: number }>
    ): Promise<UpcomingDividend[]> {
        const upcoming: UpcomingDividend[] = [];
        const now = new Date();

        for (const holding of holdings) {
            if (holding.quantity <= 0) continue;

            const company = await db.companies.where('ticker').equals(holding.ticker).first();
            if (!company) continue;

            // Get recent dividends (last 2 years)
            const recentDividends = await db.dividends
                .where('ticker')
                .equals(holding.ticker)
                .and(d => d.year >= now.getFullYear() - 1)
                .toArray();

            for (const dividend of recentDividends) {
                // Use payment date if available, otherwise ex_date, otherwise detachment_date
                const paymentDate = dividend.payment_date || dividend.ex_date || dividend.detachment_date;

                if (!paymentDate) continue;

                const daysUntil = Math.floor((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                // Include if payment is in the future or was within last 30 days
                if (daysUntil >= -30) {
                    const totalAmount = dividend.amount * holding.quantity;
                    const taxAmount = totalAmount * DIVIDEND_TAX_RATE;
                    const netAmount = totalAmount - taxAmount;

                    upcoming.push({
                        ticker: holding.ticker,
                        companyName: company.name,
                        year: dividend.year,
                        amountPerShare: dividend.amount,
                        totalAmount,
                        exDate: dividend.ex_date || dividend.detachment_date,
                        paymentDate,
                        daysUntilPayment: daysUntil,
                        taxAmount,
                        netAmount,
                        sharesHeld: holding.quantity
                    });
                }
            }
        }

        // Sort by payment date (soonest first)
        return upcoming.sort((a, b) => a.daysUntilPayment - b.daysUntilPayment);
    }

    /**
     * Project future dividends based on historical data
     */
    static async getDividendProjections(
        holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>
    ): Promise<DividendProjection[]> {
        const projections: DividendProjection[] = [];

        for (const holding of holdings) {
            if (holding.quantity <= 0) continue;

            const company = await db.companies.where('ticker').equals(holding.ticker).first();
            if (!company) continue;

            // Get dividend history
            const dividends = await db.dividends
                .where('ticker')
                .equals(holding.ticker)
                .sortBy('year');

            if (dividends.length === 0) continue;

            const latestDividend = dividends[dividends.length - 1];
            const previousDividend = dividends.length > 1 ? dividends[dividends.length - 2] : null;

            // Calculate growth rate
            let growthRate = 0;
            if (previousDividend && previousDividend.amount > 0) {
                growthRate = ((latestDividend.amount - previousDividend.amount) / previousDividend.amount) * 100;
            }

            // Project next dividend (simple: use latest or apply growth rate)
            const projectedNextDividend = growthRate > 0
                ? latestDividend.amount * (1 + growthRate / 100)
                : latestDividend.amount;

            const projectedAnnualIncome = projectedNextDividend * holding.quantity;
            const projectedTax = projectedAnnualIncome * DIVIDEND_TAX_RATE;
            const projectedNetIncome = projectedAnnualIncome - projectedTax;

            // Calculate current yield
            const currentYield = holding.currentPrice > 0
                ? (latestDividend.amount / holding.currentPrice) * 100
                : 0;

            // Get payout ratio from financial ratios
            const latestRatio = await db.financialRatios
                .where('ticker')
                .equals(holding.ticker)
                .and(r => r.year === latestDividend.year)
                .first();

            const payoutRatio = latestRatio?.payout_percent;

            // Calculate sustainability
            const { sustainability, score } = this.calculateSustainability(
                dividends,
                payoutRatio,
                growthRate
            );

            projections.push({
                ticker: holding.ticker,
                companyName: company.name,
                currentYield,
                lastDividendAmount: latestDividend.amount,
                projectedNextDividend,
                projectedAnnualIncome,
                projectedTax,
                projectedNetIncome,
                growthRate,
                sustainability,
                sustainabilityScore: score,
                payoutRatio
            });
        }

        // Sort by projected income (highest first)
        return projections.sort((a, b) => b.projectedAnnualIncome - a.projectedAnnualIncome);
    }

    /**
     * Calculate dividend sustainability score
     */
    private static calculateSustainability(
        dividends: DividendRecord[],
        payoutRatio?: number,
        growthRate?: number
    ): { sustainability: 'healthy' | 'moderate' | 'risky'; score: number } {
        let score = 100;

        // Check for dividend cuts
        let cuts = 0;
        for (let i = 1; i < dividends.length; i++) {
            if (dividends[i].amount < dividends[i - 1].amount) {
                cuts++;
            }
        }
        score -= cuts * 20; // -20 points per cut

        // Check payout ratio
        if (payoutRatio !== undefined) {
            if (payoutRatio > 100) score -= 30; // Unsustainable
            else if (payoutRatio > 80) score -= 20; // Risky
            else if (payoutRatio > 60) score -= 10; // Moderate
            // Below 60% is healthy
        }

        // Check growth consistency
        if (growthRate !== undefined) {
            if (growthRate < -10) score -= 15; // Declining
            else if (growthRate > 10) score += 10; // Strong growth
        }

        // Check consistency (has paid for multiple years)
        if (dividends.length >= 5) score += 10; // Bonus for track record

        score = Math.max(0, Math.min(100, score)); // Clamp to 0-100

        let sustainability: 'healthy' | 'moderate' | 'risky';
        if (score >= 70) sustainability = 'healthy';
        else if (score >= 40) sustainability = 'moderate';
        else sustainability = 'risky';

        return { sustainability, score };
    }

    /**
     * Get comprehensive dividend summary for portfolio
     */
    static async getDividendSummary(
        holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>
    ): Promise<DividendSummary> {
        const upcomingPayments = await this.getUpcomingDividends(holdings);
        const projections = await this.getDividendProjections(holdings);

        const totalProjectedIncome = projections.reduce((sum, p) => sum + p.projectedAnnualIncome, 0);
        const totalProjectedTax = projections.reduce((sum, p) => sum + p.projectedTax, 0);
        const totalProjectedNetIncome = totalProjectedIncome - totalProjectedTax;

        // Find next payment
        const nextPayment = upcomingPayments.find(p => p.daysUntilPayment >= 0);

        return {
            totalProjectedIncome,
            totalProjectedTax,
            totalProjectedNetIncome,
            upcomingPayments,
            projections,
            nextPaymentDate: nextPayment?.paymentDate,
            nextPaymentAmount: nextPayment?.totalAmount
        };
    }

    /**
     * Get dividend calendar events for the next 12 months
     */
    static async getDividendCalendar(
        holdings: Array<{ ticker: string; quantity: number }>
    ): Promise<Array<{ date: Date; ticker: string; amount: number; type: 'ex' | 'payment' }>> {
        const events: Array<{ date: Date; ticker: string; amount: number; type: 'ex' | 'payment' }> = [];
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        for (const holding of holdings) {
            if (holding.quantity <= 0) continue;

            const dividends = await db.dividends
                .where('ticker')
                .equals(holding.ticker)
                .toArray();

            for (const dividend of dividends) {
                const totalAmount = dividend.amount * holding.quantity;

                // Add ex-date event
                if (dividend.ex_date && dividend.ex_date >= now && dividend.ex_date <= oneYearFromNow) {
                    events.push({
                        date: dividend.ex_date,
                        ticker: holding.ticker,
                        amount: totalAmount,
                        type: 'ex'
                    });
                } else if (dividend.detachment_date && dividend.detachment_date >= now && dividend.detachment_date <= oneYearFromNow) {
                    events.push({
                        date: dividend.detachment_date,
                        ticker: holding.ticker,
                        amount: totalAmount,
                        type: 'ex'
                    });
                }

                // Add payment date event
                if (dividend.payment_date && dividend.payment_date >= now && dividend.payment_date <= oneYearFromNow) {
                    events.push({
                        date: dividend.payment_date,
                        ticker: holding.ticker,
                        amount: totalAmount,
                        type: 'payment'
                    });
                }
            }
        }

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
}
