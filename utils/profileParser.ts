import * as yaml from 'js-yaml';
import { TICKER_TO_SECTOR } from '../constants';
import {
    CompanyProfile,
    ManagementMember,
    FinancialFigure,
    FinancialRatio,
    DividendRecord,
    Shareholder,
    CapitalEvent
} from '../types';

interface RawProfileData {
    company_information?: {
        name?: string;
        headquarters?: string;
        website?: string;
        phone?: string;
        fax?: string;
        auditors?: string[];
        date_of_incorporation?: string;
        introduction_date_bourse?: string;
        fiscal_year_duration_months?: number;
    };
    management_team?: Array<{
        role?: string;
        name?: string;
    }>;
    shareholders?: {
        as_of_date?: string;
        ownership_structure?: Array<{
            name?: string;
            percentage?: number;
        }>;
    };
    financial_figures?: Array<{
        year?: number;
        consolidated_accounts?: boolean;
        capital_social?: number;
        shareholders_equity?: number;
        shares_outstanding?: number;
        revenue?: number;
        operating_income?: number;
        net_income_group_share?: number;
    }>;
    financial_ratios?: Array<{
        year?: number;
        eps_bpa?: number;
        roe_percent?: number;
        payout_percent?: number;
        dividend_yield_percent?: number;
        per?: number;
        pbr?: number;
    }>;
    financial_operations?: {
        capital_increases?: Array<{
            date?: string;
            nature?: string;
            shares_variation?: string | number;
            type?: string;
        }>;
        dividends_paid?: Array<{
            year?: number;
            amount?: number;
            amount_per_share?: number;
            type?: string;
            ex_date?: string;
            detachment_date?: string;
            payment_date?: string;
        }>;
    };
    threshold_crossings?: Array<{
        date?: string;
        declarant?: string;
        threshold_percent?: number;
        direction?: 'Hausse' | 'Baisse';
    }>;
    investor_relations_contact?: {
        person?: string;
        email?: string;
        phone?: string;
        fax?: string;
    };
}

export interface ParsedProfileData {
    company: CompanyProfile;
    management: ManagementMember[];
    financialFigures: FinancialFigure[];
    financialRatios: FinancialRatio[];
    dividends: DividendRecord[];
    shareholders: Shareholder[];
    capitalEvents: CapitalEvent[];
}

/**
 * Parse a date string in DD/MM/YYYY format to a Date object
 */
function parseDate(dateStr: string | null | undefined): Date | undefined {
    if (!dateStr || dateStr === 'null') return undefined;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined;

    return new Date(year, month, day);
}

/**
 * Parse shares variation which might be a string with spaces or a number
 */
function parseSharesVariation(value: string | number | undefined): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove spaces and parse
        const cleaned = value.replace(/\s/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}

/**
 * Parse a single profile YAML file content
 */
export function parseProfile(ticker: string, yamlContent: string): ParsedProfileData {
    const data = yaml.load(yamlContent) as RawProfileData;

    const sector = TICKER_TO_SECTOR[ticker] || 'Unknown';

    // Parse company information
    const company: CompanyProfile = {
        ticker,
        name: data.company_information?.name || ticker,
        sector,
        headquarters: data.company_information?.headquarters,
        website: data.company_information?.website,
        phone: data.company_information?.phone,
        fax: data.company_information?.fax,
        auditors: data.company_information?.auditors?.filter(a => a && a !== 'null') || [],
        date_of_incorporation: data.company_information?.date_of_incorporation,
        introduction_date_bourse: data.company_information?.introduction_date_bourse,
        fiscal_year_duration_months: data.company_information?.fiscal_year_duration_months,
        investor_relations_person: data.investor_relations_contact?.person,
        investor_relations_email: data.investor_relations_contact?.email,
        investor_relations_phone: data.investor_relations_contact?.phone
    };

    // Parse management team
    const management: ManagementMember[] = (data.management_team || [])
        .filter(m => m.name && m.role)
        .map(m => ({
            ticker,
            role: m.role!,
            name: m.name!
        }));

    // Parse financial figures
    const financialFigures: FinancialFigure[] = (data.financial_figures || [])
        .filter(f => f.year)
        .map(f => ({
            ticker,
            year: f.year!,
            consolidated_accounts: f.consolidated_accounts,
            revenue: f.revenue,
            operating_income: f.operating_income,
            net_income_group_share: f.net_income_group_share,
            shareholders_equity: f.shareholders_equity,
            shares_outstanding: f.shares_outstanding,
            capital_social: f.capital_social
        }));

    // Parse financial ratios
    const financialRatios: FinancialRatio[] = (data.financial_ratios || [])
        .filter(r => r.year)
        .map(r => ({
            ticker,
            year: r.year!,
            eps_bpa: r.eps_bpa,
            roe_percent: r.roe_percent,
            per: r.per,
            pbr: r.pbr,
            payout_percent: r.payout_percent,
            dividend_yield_percent: r.dividend_yield_percent
        }));

    // Parse dividends - handle both 'amount' and 'amount_per_share'
    const dividends: DividendRecord[] = (data.financial_operations?.dividends_paid || [])
        .filter(d => d.year)
        .map(d => {
            const amount = d.amount_per_share || d.amount || 0;
            return {
                ticker,
                year: d.year!,
                amount,
                type: d.type,
                ex_date: parseDate(d.ex_date),
                detachment_date: parseDate(d.detachment_date),
                payment_date: parseDate(d.payment_date)
            };
        });

    // Parse shareholders and extract flottant
    const shareholdersDate = parseDate(data.shareholders?.as_of_date);
    let flottant: number | undefined = undefined;
    const shareholders: Shareholder[] = (data.shareholders?.ownership_structure || [])
        .filter(s => {
            if (s.name && s.name.toUpperCase().includes('DIVERS ACTIONNAIRES')) {
                flottant = s.percentage;
                return false; // Exclude from shareholders list
            }
            return s.name && s.percentage;
        })
        .map(s => ({
            ticker,
            name: s.name!,
            percentage: s.percentage!,
            as_of_date: shareholdersDate
        }));

    // Add flottant to company profile
    company.flottant = flottant;

    // Parse capital events
    const capitalEvents: CapitalEvent[] = [];

    // Add capital increases
    (data.financial_operations?.capital_increases || [])
        .filter(c => c.date && c.date !== 'null')
        .forEach(c => {
            const date = parseDate(c.date);
            if (date) {
                capitalEvents.push({
                    ticker,
                    date,
                    event_type: 'capital_increase',
                    description: c.nature || c.type || 'Capital increase',
                    shares_variation: parseSharesVariation(c.shares_variation),
                    nature: c.nature
                });
            }
        });

    // Add threshold crossings
    (data.threshold_crossings || [])
        .filter(t => t.date && t.declarant)
        .forEach(t => {
            const date = parseDate(t.date);
            if (date) {
                capitalEvents.push({
                    ticker,
                    date,
                    event_type: 'threshold_crossing',
                    description: `${t.declarant} - ${t.threshold_percent}% (${t.direction})`,
                    threshold_percent: t.threshold_percent,
                    declarant: t.declarant,
                    direction: t.direction
                });
            }
        });

    return {
        company,
        management,
        financialFigures,
        financialRatios,
        dividends,
        shareholders,
        capitalEvents
    };
}

/**
 * Parse multiple profile files
 */
export async function parseProfileFiles(
    files: { ticker: string; content: string }[]
): Promise<{ success: ParsedProfileData[]; failed: { ticker: string; error: string }[] }> {
    const success: ParsedProfileData[] = [];
    const failed: { ticker: string; error: string }[] = [];

    for (const file of files) {
        try {
            const parsed = parseProfile(file.ticker, file.content);
            success.push(parsed);
        } catch (error) {
            failed.push({
                ticker: file.ticker,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return { success, failed };
}
