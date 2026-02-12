import { db } from '../db';

export interface ConcentrationMetrics {
    // Herfindahl-Hirschman Index (0-10000)
    herfindahlIndex: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'extreme';

    // Top holdings
    topHoldingPercent: number;
    top3Percent: number;
    top5Percent: number;

    // Distribution
    stockCount: number;
    effectiveDiversification: number; // (1 - HHI/10000) * 100
}

export interface SectorExposure {
    sector: string;
    percentOfPortfolio: number;
    holdingCount: number;
    companies: string[];
}

export interface OwnershipOverlap {
    majorShareholder: string;
    percentage: number;
    affectedHoldings: string[]; // Tickers that share this shareholder
    overlapLevel: 'low' | 'medium' | 'high';
    riskNote: string;
}

/**
 * Service for risk analysis and diversification assessment
 */
export class RiskAnalysisService {
    /**
     * Calculate concentration metrics
     */
    static async getConcentrationMetrics(
        holdings: Array<{ ticker: string; value: number }>
    ): Promise<ConcentrationMetrics> {
        if (holdings.length === 0) {
            return {
                herfindahlIndex: 0,
                riskLevel: 'low',
                topHoldingPercent: 0,
                top3Percent: 0,
                top5Percent: 0,
                stockCount: 0,
                effectiveDiversification: 100
            };
        }

        // Calculate total portfolio value
        const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

        if (totalValue === 0) {
            return {
                herfindahlIndex: 0,
                riskLevel: 'low',
                topHoldingPercent: 0,
                top3Percent: 0,
                top5Percent: 0,
                stockCount: holdings.length,
                effectiveDiversification: 100
            };
        }

        // Calculate market shares (as percentages)
        const shares = holdings.map(h => (h.value / totalValue) * 100);

        // Sort for top holdings
        const sortedShares = [...shares].sort((a, b) => b - a);

        // Calculate Herfindahl-Hirschman Index
        const herfindahlIndex = shares.reduce((sum, share) => sum + share * share, 0);

        // Calculate top N%
        const topHoldingPercent = sortedShares[0] || 0;
        const top3Percent =
            sortedShares.slice(0, 3).reduce((sum, share) => sum + share, 0) / Math.min(3, sortedShares.length) *
                Math.min(3, sortedShares.length) || 0;
        const top5Percent =
            sortedShares.slice(0, 5).reduce((sum, share) => sum + share, 0) / Math.min(5, sortedShares.length) *
                Math.min(5, sortedShares.length) || 0;

        // Determine risk level
        let riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
        if (herfindahlIndex < 1500) riskLevel = 'low';
        else if (herfindahlIndex < 2500) riskLevel = 'moderate';
        else if (herfindahlIndex < 5000) riskLevel = 'high';
        else riskLevel = 'extreme';

        // Calculate effective diversification
        const effectiveDiversification = Math.max(0, (1 - herfindahlIndex / 10000) * 100);

        return {
            herfindahlIndex,
            riskLevel,
            topHoldingPercent,
            top3Percent,
            top5Percent,
            stockCount: holdings.length,
            effectiveDiversification
        };
    }

    /**
     * Get sector exposure breakdown
     */
    static async getSectorExposure(
        holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>
    ): Promise<SectorExposure[]> {
        const sectorMap = new Map<string, { value: number; tickers: Set<string> }>();

        // Calculate total portfolio value
        const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);

        // Group by sector
        for (const holding of holdings) {
            const company = await db.companies
                .where('ticker')
                .equals(holding.ticker)
                .first();

            if (company) {
                const holdingValue = holding.quantity * holding.currentPrice;
                const current = sectorMap.get(company.sector) || { value: 0, tickers: new Set() };

                sectorMap.set(company.sector, {
                    value: current.value + holdingValue,
                    tickers: new Set([...current.tickers, holding.ticker])
                });
            }
        }

        // Convert to array and calculate percentages
        const result: SectorExposure[] = Array.from(sectorMap).map(([sector, data]) => ({
            sector,
            percentOfPortfolio: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
            holdingCount: data.tickers.size,
            companies: Array.from(data.tickers).sort()
        }));

        // Sort by percentage (descending)
        result.sort((a, b) => b.percentOfPortfolio - a.percentOfPortfolio);

        return result;
    }

    /**
     * Get ownership overlap analysis
     */
    static async getOwnershipOverlap(
        holdings: Array<{ ticker: string }>
    ): Promise<OwnershipOverlap[]> {
        const shareholderMap = new Map<string, { percentage: number; tickers: Set<string> }>();

        // Collect all shareholders for each holding
        for (const holding of holdings) {
            const shareholders = (await db.shareholders
                .where('ticker')
                .equals(holding.ticker)
                .toArray())
                .filter(s => s.name && !s.name.toUpperCase().includes('DIVERS ACTIONNAIRES'));


            // Only consider top shareholders (> 2%)
            const topShareholders = shareholders.filter(s => s.percentage && s.percentage > 2);

            for (const shareholder of topShareholders) {
                const name = shareholder.name;
                const current = shareholderMap.get(name) || { percentage: shareholder.percentage || 0, tickers: new Set() };

                shareholderMap.set(name, {
                    percentage: Math.max(current.percentage, shareholder.percentage || 0),
                    tickers: new Set([...current.tickers, holding.ticker])
                });
            }
        }

        // Filter for shareholders appearing in multiple holdings
        const overlaps: OwnershipOverlap[] = Array.from(shareholderMap)
            .filter(([_, data]) => data.tickers.size > 1)
            .map(([name, data]) => ({
                majorShareholder: name,
                percentage: data.percentage,
                affectedHoldings: Array.from(data.tickers).sort(),
                overlapLevel:
                    data.tickers.size >= 5
                        ? 'high'
                        : data.tickers.size >= 3
                            ? 'medium'
                            : 'low',
                riskNote: `${name} is a major shareholder in ${data.tickers.size} holdings (${data.percentage.toFixed(1)}%)`
            }));

        // Sort by number of affected holdings
        overlaps.sort((a, b) => b.affectedHoldings.length - a.affectedHoldings.length);

        return overlaps;
    }

    /**
     * Generate risk warnings
     */
    static async getRiskWarnings(
        holdings: Array<{ ticker: string; value: number; quantity: number; currentPrice: number }>
    ): Promise<string[]> {
        const warnings: string[] = [];

        if (holdings.length === 0) return warnings;

        // Concentration warnings
        const concentration = await this.getConcentrationMetrics(
            holdings.map(h => ({ ticker: h.ticker, value: h.value }))
        );

        if (concentration.riskLevel === 'extreme') {
            warnings.push(`?? EXTREME concentration risk: ${concentration.topHoldingPercent.toFixed(1)}% in top holding`);
        } else if (concentration.riskLevel === 'high') {
            warnings.push(`?? HIGH concentration risk: Top 3 holdings = ${concentration.top3Percent.toFixed(1)}%`);
        } else if (concentration.riskLevel === 'moderate') {
            warnings.push(`?? Moderate concentration: Top holding = ${concentration.topHoldingPercent.toFixed(1)}%`);
        }

        // Sector imbalance warnings
        const sectorExposure = await this.getSectorExposure(holdings);

        if (sectorExposure.length > 0) {
            const topSector = sectorExposure[0];
            if (topSector.percentOfPortfolio > 40) {
                warnings.push(
                    `?? Sector concentration: ${topSector.sector} = ${topSector.percentOfPortfolio.toFixed(1)}% of portfolio`
                );
            }
        }

        // Ownership overlap warnings
        const overlaps = await this.getOwnershipOverlap(holdings.map(h => ({ ticker: h.ticker })));

        for (const overlap of overlaps) {
            if (overlap.overlapLevel === 'high') {
                warnings.push(
                    `?? High ownership overlap: ${overlap.majorShareholder} controls ${overlap.affectedHoldings.length} holdings`
                );
            }
        }

        return warnings;
    }

    /**
     * Get comprehensive risk summary
     */
    static async getRiskSummary(
        holdings: Array<{ ticker: string; value: number; quantity: number; currentPrice: number }>
    ): Promise<{
        concentration: ConcentrationMetrics;
        sectorExposure: SectorExposure[];
        ownershipOverlap: OvershipOverlap[];
        warnings: string[];
        riskScore: number; // 0-100, higher = riskier
    }> {
        const concentration = await this.getConcentrationMetrics(
            holdings.map(h => ({ ticker: h.ticker, value: h.value }))
        );

        const sectorExposure = await this.getSectorExposure(holdings);
        const ownershipOverlap = await this.getOwnershipOverlap(holdings.map(h => ({ ticker: h.ticker })));
        const warnings = await this.getRiskWarnings(holdings);

        // Calculate risk score (0-100)
        let riskScore = 0;

        // Concentration component (0-40 points)
        switch (concentration.riskLevel) {
            case 'low':
                riskScore += 10;
                break;
            case 'moderate':
                riskScore += 25;
                break;
            case 'high':
                riskScore += 35;
                break;
            case 'extreme':
                riskScore += 40;
                break;
        }

        // Sector imbalance component (0-30 points)
        const topSectorPercent = sectorExposure[0]?.percentOfPortfolio || 0;
        if (topSectorPercent > 50) riskScore += 30;
        else if (topSectorPercent > 40) riskScore += 25;
        else if (topSectorPercent > 30) riskScore += 15;
        else riskScore += 5;

        // Ownership overlap component (0-30 points)
        if (ownershipOverlap.length > 3) riskScore += 25;
        else if (ownershipOverlap.length > 1) riskScore += 15;
        else riskScore += 5;

        return {
            concentration,
            sectorExposure,
            ownershipOverlap,
            warnings,
            riskScore: Math.min(100, riskScore)
        };
    }

    /**
     * Get stocks with concentration risk
     */
    static async getHighConcentrationHoldings(
        holdings: Array<{ ticker: string; value: number }>
    ): Promise<Array<{ ticker: string; concentration: number }>> {
        const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

        if (totalValue === 0) return [];

        const result = holdings
            .map(h => ({
                ticker: h.ticker,
                concentration: (h.value / totalValue) * 100
            }))
            .filter(h => h.concentration > 15) // Threshold: > 15% is notable
            .sort((a, b) => b.concentration - a.concentration);

        return result;
    }

    /**
     * Get sector diversification score (0-100)
     */
    static async getSectorDiversificationScore(
        sectorExposure: SectorExposure[]
    ): Promise<number> {
        if (sectorExposure.length === 0) return 0;

        // Calculate Herfindahl index for sectors
        const sectorHHI = sectorExposure.reduce((sum, sector) => {
            const percent = sector.percentOfPortfolio / 100;
            return sum + percent * percent;
        }, 0);

        // Convert to 0-100 score (1 = perfectly diversified)
        return Math.max(0, (1 - sectorHHI) * 100);
    }
}

// Type fix for typo
type OvershipOverlap = OwnershipOverlap;
