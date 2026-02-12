import { getTransactions, deleteTransaction, addTransaction } from '../services/cloudDatabase';
import { Transaction } from '../types';

/**
 * Migration script to convert 0 values to null for fees, tax, and realized_pl
 * This ensures proper fee inference behavior for existing transactions
 */
export const migrateTransactionFees = async (): Promise<void> => {
  console.log('Starting migration of transaction fees...');
  
  try {
    const transactions = await getTransactions();
    console.log(`Found ${transactions.length} transactions to check`);
    
    const toMigrate = transactions.filter(tx => {
      // Migrate buy/sell transactions with 0 fees/tax
      const isTrade = tx.Operation.toLowerCase().includes('achat') || 
                     tx.Operation.toLowerCase().includes('vente') ||
                     tx.Operation.toLowerCase().includes('buy') ||
                     tx.Operation.toLowerCase().includes('sell');
      return isTrade && (tx.Fees === 0 || tx.Tax === 0);
    });
    
    console.log(`Found ${toMigrate.length} transactions that need migration`);
    
    let migratedCount = 0;
    for (const tx of toMigrate) {
      const updated = {
        ...tx,
        Fees: tx.Fees === 0 ? null : tx.Fees,
        Tax: tx.Tax === 0 ? null : tx.Tax,
        RealizedPL: tx.RealizedPL === 0 ? null : tx.RealizedPL
      };
      
      // Delete and re-add the transaction with updated values
      await deleteTransaction(tx.id!);
      await addTransaction(updated);
      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        console.log(`Migrated ${migratedCount}/${toMigrate.length} transactions...`);
      }
    }
    
    console.log(`Migration completed successfully. ${migratedCount} transactions updated.`);
  } catch (error) {
    console.error('Migration failed:', error);
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
    console.error('Failed to check migration status:', error);
    return { total: 0, needMigration: 0, migrated: 0 };
  }
};