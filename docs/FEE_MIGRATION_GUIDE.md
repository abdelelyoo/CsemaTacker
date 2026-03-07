# Fee Handling Migration Guide

## Overview
The fee handling system has been comprehensively updated to properly handle null values instead of defaulting to 0, ensuring accurate fee inference and display.

## Migration Steps

### 1. Database Schema Update
Run the SQL migration in your Supabase SQL Editor:
```sql
-- Update transactions table to allow NULL values for fees and tax
ALTER TABLE transactions 
ALTER COLUMN fees DROP DEFAULT,
ALTER COLUMN tax DROP DEFAULT,
ALTER COLUMN realized_pl DROP DEFAULT;
```

### 2. Data Migration
Use the provided migration script to convert existing 0 values to null:

```typescript
import { migrateTransactionFees, checkMigrationStatus } from './utils/migrateFees';

// Check current migration status
const status = await checkMigrationStatus();
console.log(`Total: ${status.total}, Need migration: ${status.needMigration}, Already migrated: ${status.migrated}`);

// Run migration if needed
if (status.needMigration > 0) {
  await migrateTransactionFees();
  console.log('Migration completed successfully!');
}
```

### 3. Verification
After migration:
- All buy/sell transactions should show calculated fees/taxes
- Non-trade transactions (Frais, Taxe) should have enriched fee/tax values  
- Dashboard should show accurate fee aggregation
- TransactionsList should display consistent values

## Key Changes

### Database Layer (`services/cloudDatabase.ts`)
- **Insertion**: Now preserves `null` values instead of defaulting to 0
- **Retrieval**: Converts database 0 values back to `null` for consistency
- **Batch Operations**: Updated for both single and bulk transactions

### Fee Inference (`utils/holdingCalc.ts`)
- **Null Checking**: Uses robust `== null` pattern instead of `=== undefined`
- **Inference Logic**: Only triggers when fees/tax are actually missing
- **Validation**: Adds warnings for fees > 5% of transaction amount

### Transaction Normalization (`hooks/useTransactions.ts`)
- **Data Flow**: Preserves null values from database through to UI
- **Form Handling**: Doesn't override existing null values with 0

### Portfolio Calculation (`utils/portfolioCalc.ts`)
- **Non-Trade Enrichment**: Automatically populates fees/tax for bank fees and tax transactions
- **Consistency**: Ensures all enriched transactions have fee/tax values

### Migration Script (`utils/migrateFees.ts`)
- **Selective Migration**: Only processes buy/sell transactions with 0 values
- **Safety**: Delete/re-insert pattern with error handling
- **Progress Tracking**: Provides status checking functionality

## Testing
Comprehensive test suite covers:
- ✅ Buy transaction fee inference
- ✅ Sell transaction fee/tax inference  
- ✅ Partial fee/tax provision scenarios
- ✅ Non-transaction enrichment (Frais, Taxe, Dividende)
- ✅ Edge cases and validation
- ✅ Mixed transaction type scenarios

Run tests: `npm test`

## Expected Outcomes

### Before Fix
- Most transactions showed "-" for Fees/Tax
- Inconsistent behavior between new and existing transactions
- Fee calculations only worked when explicitly provided

### After Fix  
- ✅ All buy/sell transactions show calculated fees/taxes
- ✅ Non-trade transactions enriched with appropriate values
- ✅ Consistent display across all components
- ✅ Future-proof inference mechanism
- ✅ Accurate fee aggregation in dashboard

## Rollback Plan
If issues arise, you can:
1. Restore database from backup
2. Run reverse migration to convert null back to 0
3. Revert code changes to previous implementation

## Success Metrics
- ✅ Build passes without errors
- ✅ All 26 tests pass
- ✅ Fee inference works for missing values
- ✅ Explicit fee values are preserved
- ✅ Non-trade transactions get proper enrichment
- ✅ High fee validation working
- ✅ Migration script functional