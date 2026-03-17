import { getTransactions, deleteTransaction, addTransaction } from '../services/cloudDatabase';
import { Transaction } from '../types';
import { logger, logContext } from './logger';

/**
 * Migration script to convert 0 values to null for fees, tax, and realized_pl
 * This ensures proper fee inference behavior for existing transactions
 */
export const migrateTransactionFees = async (): Promise<void> => {
  logger.info(logContext.DB, 'Starting migration of transaction fees...');
  
  try {
    const transactions = await getTransactions();
    logger.debug(logContext.DB, `Found ${transactions.length} transactions to check`);
    
    const toMigrate = transactions.filter(tx => {
      // Migrate buy/sell transactions with 0 fees/tax
      const isTrade = tx.Operation.toLowerCase().includes('achat') || 
                     tx.Operation.toLowerCase().includes('vente') ||
                     tx.Operation.toLowerCase().includes('buy') ||
                     tx.Operation.toLowerCase().includes('sell');
      return isTrade && (tx.Fees === 0 || tx.Tax === 0);
    });
    
    logger.debug(logContext.DB, `Found ${toMigrate.length} transactions that need migration`);
    
    let migratedCount = 0;
    for (const tx of toMigrate) {
      const updated = {
        ...tx,
        Fees: tx.Fees === 0 ? undefined : tx.Fees,
        Tax: tx.Tax === 0 ? undefined : tx.Tax,
        RealizedPL: tx.RealizedPL === 0 ? undefined : tx.RealizedPL
      };
      
      // Delete and re-add the transaction with updated values
      await deleteTransaction(tx.id!);
      await addTransaction(updated);
      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        logger.debug(logContext.DB, `Migrated ${migratedCount}/${toMigrate.length} transactions...`);
      }
    }
    
    logger.info(logContext.DB, `Migration completed successfully. ${migratedCount} transactions updated.`);
  } catch (error) {
    logger.error(logContext.DB, 'Migration failed:', error);
    throw error;
  }
};

/**
 * Utility function to check migration status
 */
export const checkMigrationStatus = async (): Promise<{ total: number; needMigration: number; migrated: number }> => {
  try {
    const transactions = await getTransactions();
    const total = transactions.length;
    const needMigration = transactions.filter(tx => {
      const isTrade = tx.Operation.toLowerCase().includes('achat') || 
                     tx.Operation.toLowerCase().includes('vente') ||
                     tx.Operation.toLowerCase().includes('buy') ||
                     tx.Operation.toLowerCase().includes('sell');
      return isTrade && (tx.Fees === 0 || tx.Tax === 0);
    }).length;
    const migrated = total - needMigration;
    
    return { total, needMigration, migrated };
  } catch (error) {
    logger.error(logContext.DB, 'Failed to check migration status:', error);
    return { total: 0, needMigration: 0, migrated: 0 };
  }
};