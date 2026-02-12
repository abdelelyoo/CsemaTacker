import { db } from '../db';
import { parseProfile, ParsedProfileData } from '../utils/profileParser';

export interface ImportResult {
    success: number;
    failed: Array<{ ticker: string; error: string }>;
    totalCompanies: number;
    totalDividends: number;
    totalFinancialRecords: number;
}

export interface ImportStatus {
    companiesLoaded: number;
    lastImportDate: Date | null;
    isImported: boolean;
}

/**
 * Service to import profile data from YAML files into Dexie
 */
export class ProfileImportService {
    /**
     * Import all profile data into the database
     */
    static async importAllProfiles(
        profileFiles: Array<{ ticker: string; content: string }>
    ): Promise<ImportResult> {
        const result: ImportResult = {
            success: 0,
            failed: [],
            totalCompanies: 0,
            totalDividends: 0,
            totalFinancialRecords: 0
        };

        // Clear existing profile data first
        await this.clearProfileData();

        for (const file of profileFiles) {
            try {
                const parsed = parseProfile(file.ticker, file.content);
                await this.importSingleProfile(parsed);

                result.success++;
                result.totalCompanies++;
                result.totalDividends += parsed.dividends.length;
                result.totalFinancialRecords += parsed.financialFigures.length + parsed.financialRatios.length;
            } catch (error) {
                result.failed.push({
                    ticker: file.ticker,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Store import timestamp in localStorage
        if (result.success > 0) {
            localStorage.setItem('profileImportDate', new Date().toISOString());
        }

        return result;
    }

    /**
     * Import a single parsed profile into all relevant tables
     */
    private static async importSingleProfile(data: ParsedProfileData): Promise<void> {
        // Import company
        await db.companies.add(data.company);

        // Import management
        if (data.management.length > 0) {
            await db.management.bulkAdd(data.management);
        }

        // Import financial figures
        if (data.financialFigures.length > 0) {
            await db.financialFigures.bulkAdd(data.financialFigures);
        }

        // Import financial ratios
        if (data.financialRatios.length > 0) {
            await db.financialRatios.bulkAdd(data.financialRatios);
        }

        // Import dividends
        if (data.dividends.length > 0) {
            await db.dividends.bulkAdd(data.dividends);
        }

        // Import shareholders
        if (data.shareholders.length > 0) {
            await db.shareholders.bulkAdd(data.shareholders);
        }

        // Import capital events
        if (data.capitalEvents.length > 0) {
            await db.capitalEvents.bulkAdd(data.capitalEvents);
        }
    }

    /**
     * Clear all profile data from the database
     */
    static async clearProfileData(): Promise<void> {
        await Promise.all([
            db.companies.clear(),
            db.management.clear(),
            db.financialFigures.clear(),
            db.financialRatios.clear(),
            db.dividends.clear(),
            db.shareholders.clear(),
            db.capitalEvents.clear()
        ]);

        localStorage.removeItem('profileImportDate');
    }

    /**
     * Get the current import status
     */
    static async getImportStatus(): Promise<ImportStatus> {
        const companiesLoaded = await db.companies.count();
        const lastImportDateStr = localStorage.getItem('profileImportDate');

        return {
            companiesLoaded,
            lastImportDate: lastImportDateStr ? new Date(lastImportDateStr) : null,
            isImported: companiesLoaded > 0
        };
    }

    /**
     * Load profile files from the profiles directory
     * Note: In a browser environment, we'll need to fetch these files
     */
    static async loadProfileFilesFromServer(): Promise<Array<{ ticker: string; content: string }>> {
        // List of all profile tickers (from the 77 files we saw)
        const tickers = [
            'ADH', 'ADI', 'AFI', 'AFM', 'AGM', 'AKT', 'ALM', 'ARD', 'ATH', 'ATL',
            'ATW', 'BAL', 'BCI', 'BCP', 'BOA', 'CAP', 'CDM', 'CFG', 'CIH', 'CMA',
            'CMG', 'CMT', 'COL', 'CRS', 'CSR', 'CTM', 'DHO', 'DRI', 'DWY', 'DYT',
            'EQD', 'FBR', 'GAZ', 'GTM', 'HPS', 'IAM', 'IBC', 'IMO', 'INV', 'JET',
            'LBV', 'LES', 'LHM', 'M2M', 'MAB', 'MDP', 'MIC', 'MLE', 'MNG', 'MOX',
            'MSA', 'MUT', 'NEJ', 'NKL', 'OUL', 'PRO', 'RDS', 'REB', 'RIS', 'S2M',
            'SAH', 'SBM', 'SID', 'SLF', 'SMI', 'SNA', 'SNP', 'SOT', 'SRM', 'STR',
            'TGC', 'TMA', 'TQM', 'UMR', 'VCN', 'WAA', 'ZDJ'
        ];

        const files: Array<{ ticker: string; content: string }> = [];

        for (const ticker of tickers) {
            try {
                const response = await fetch(`/profiles/${ticker}.txt`);
                if (response.ok) {
                    const content = await response.text();
                    files.push({ ticker, content });
                } else {
                    console.warn(`Failed to load profile for ${ticker}: ${response.status}`);
                }
            } catch (error) {
                console.error(`Error loading profile for ${ticker}:`, error);
            }
        }

        return files;
    }
}
