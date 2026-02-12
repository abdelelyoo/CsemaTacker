import { db } from '../db';
import {
  getTransactions,
  addTransactions,
  getFees,
  addFees,
  getCompanies,
  addCompany,
  getManagementByTicker,
  addManagement,
  getFinancialFiguresByTicker,
  addFinancialFigures,
  getFinancialRatiosByTicker,
  addFinancialRatios,
  getAllDividends,
  addDividends,
  getShareholdersByTicker,
  addShareholders,
  getCapitalEventsByTicker,
  addCapitalEvents
} from './cloudDatabase';

export interface MigrationProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

export type MigrationCallback = (progress: MigrationProgress) => void;

export const migrateLocalDataToCloud = async (
  onProgress?: MigrationCallback
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if there's any local data
    const localTransactions = await db.transactions.toArray();
    const localFees = await db.fees.toArray();
    const localCompanies = await db.companies.toArray();
    const localDividends = await db.dividends.toArray();

    const totalItems = 
      localTransactions.length + 
      localFees.length + 
      localCompanies.length + 
      localDividends.length;

    if (totalItems === 0) {
      return { success: true, message: 'No local data to migrate' };
    }

    let migratedCount = 0;

    // Migrate transactions
    if (localTransactions.length > 0) {
      onProgress?.({
        stage: 'transactions',
        current: 0,
        total: localTransactions.length,
        message: `Migrating ${localTransactions.length} transactions...`
      });

      await addTransactions(localTransactions);
      migratedCount += localTransactions.length;

      onProgress?.({
        stage: 'transactions',
        current: localTransactions.length,
        total: localTransactions.length,
        message: `✓ Migrated ${localTransactions.length} transactions`
      });
    }

    // Migrate fees
    if (localFees.length > 0) {
      onProgress?.({
        stage: 'fees',
        current: 0,
        total: localFees.length,
        message: `Migrating ${localFees.length} fees...`
      });

      await addFees(localFees);
      migratedCount += localFees.length;

      onProgress?.({
        stage: 'fees',
        current: localFees.length,
        total: localFees.length,
        message: `✓ Migrated ${localFees.length} fees`
      });
    }

    // Migrate companies
    if (localCompanies.length > 0) {
      onProgress?.({
        stage: 'companies',
        current: 0,
        total: localCompanies.length,
        message: `Migrating ${localCompanies.length} companies...`
      });

      for (const company of localCompanies) {
        await addCompany(company);
        migratedCount++;
      }

      onProgress?.({
        stage: 'companies',
        current: localCompanies.length,
        total: localCompanies.length,
        message: `✓ Migrated ${localCompanies.length} companies`
      });

      // Migrate related data for each company
      for (const company of localCompanies) {
        const ticker = company.ticker;

        // Management
        const management = await db.management.where('ticker').equals(ticker).toArray();
        if (management.length > 0) {
          await addManagement(management);
        }

        // Financial figures
        const figures = await db.financialFigures.where('ticker').equals(ticker).toArray();
        if (figures.length > 0) {
          await addFinancialFigures(figures);
        }

        // Financial ratios
        const ratios = await db.financialRatios.where('ticker').equals(ticker).toArray();
        if (ratios.length > 0) {
          await addFinancialRatios(ratios);
        }

        // Shareholders
        const shareholders = await db.shareholders.where('ticker').equals(ticker).toArray();
        if (shareholders.length > 0) {
          await addShareholders(shareholders);
        }

        // Capital events
        const events = await db.capitalEvents.where('ticker').equals(ticker).toArray();
        if (events.length > 0) {
          await addCapitalEvents(events);
        }
      }
    }

    // Migrate dividends
    if (localDividends.length > 0) {
      onProgress?.({
        stage: 'dividends',
        current: 0,
        total: localDividends.length,
        message: `Migrating ${localDividends.length} dividends...`
      });

      await addDividends(localDividends);
      migratedCount += localDividends.length;

      onProgress?.({
        stage: 'dividends',
        current: localDividends.length,
        total: localDividends.length,
        message: `✓ Migrated ${localDividends.length} dividends`
      });
    }

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} items to the cloud!`
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const exportLocalData = async (): Promise<string> => {
  const data = {
    transactions: await db.transactions.toArray(),
    fees: await db.fees.toArray(),
    companies: await db.companies.toArray(),
    management: await db.management.toArray(),
    financialFigures: await db.financialFigures.toArray(),
    financialRatios: await db.financialRatios.toArray(),
    dividends: await db.dividends.toArray(),
    shareholders: await db.shareholders.toArray(),
    capitalEvents: await db.capitalEvents.toArray()
  };

  return JSON.stringify(data, null, 2);
};

export const downloadLocalData = async (): Promise<void> => {
  const data = await exportLocalData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
