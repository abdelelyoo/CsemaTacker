import { z } from 'zod';

export const RawTransactionSchema = z.object({
  Date: z.string().min(1, 'Date is required'),
  Company: z.string().optional(),
  ISIN: z.string().optional(),
  Operation: z.string().min(1, 'Operation is required'),
  Ticker: z.string().optional(),
  Qty: z.union([z.number(), z.string()]).optional(),
  Price: z.union([z.number(), z.string()]).optional(),
  Total: z.union([z.number(), z.string()]).optional(),
  Fees: z.union([z.number(), z.string()]).optional(),
  Tax: z.union([z.number(), z.string()]).optional(),
  RealizedPL: z.union([z.number(), z.string()]).optional()
});

export const TransactionSchema = z.object({
  Date: z.string(),
  Company: z.string().default(''),
  ISIN: z.string().default(''),
  // H7 fix: expand allowed operations in validator to match parser
  Operation: z.enum([
    'Achat', 'Vente', 'Buy', 'Sell', 'BUY', 'SELL', 'ACHAT', 'VENTE',
    'Depot', 'Retrait', 'Dividende', 'Frais', 'Taxe', 'CUS', 'SUB', 'Abonnement'
  ]),
  Ticker: z.string().default(''),
  Qty: z.number().finite().safe(),
  Price: z.number().finite().safe(),
  Total: z.number().finite().safe(),
  Fees: z.number().optional(),
  Tax: z.number().optional(),
  RealizedPL: z.number().optional()
});

export const BankOperationSchema = z.object({
  Date: z.string(),
  Operation: z.enum(['Depot', 'Retrait', 'Dividende', 'Frais', 'Taxe', 'Abonnement', 'Garde']),
  Description: z.string().optional(),
  Amount: z.number().finite().safe(),
  // H6 fix: added TAX_REFUND and CUSTODY
  Category: z.enum(['DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'TAX', 'TAX_REFUND', 'BANK_FEE', 'CUSTODY', 'SUBSCRIPTION']),
  Reference: z.string().optional()
});

export const FeeRecordSchema = z.object({
  date: z.date(),
  type: z.enum(['CUS', 'SUB']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
});

export const CapitalEventSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required'),
  date: z.date(),
  event_type: z.enum(['capital_increase', 'threshold_crossing', 'stock_split', 'reverse_split', 'merger', 'spin_off']),
  description: z.string(),
  shares_variation: z.number().optional(),
  nature: z.string().optional(),
  threshold_percent: z.number().optional(),
  declarant: z.string().optional(),
  direction: z.enum(['Hausse', 'Baisse']).optional(),
  split_ratio_from: z.number().optional(),
  split_ratio_to: z.number().optional(),
  applied_to_transactions: z.boolean().optional()
});

export const UserSettingsSchema = z.object({
  costMethod: z.enum(['FIFO', 'LIFO', 'WAC']).default('WAC'),
  currency: z.enum(['MAD', 'EUR', 'USD']).default('MAD'),
  darkMode: z.boolean().default(false),
  dateFormat: z.string().default('DD/MM/YYYY')
});

export const parseNumber = (val: any, fallback: number = 0): number => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isFinite(val) ? val : fallback;
  if (typeof val !== 'string') val = String(val);

  let clean = val.trim().replace(/\"/g, '').replace(/\s?MAD/gi, '').trim();
  if (clean === '' || clean === '-') return fallback;

  const lastComma = clean.lastIndexOf(',');
  const lastPeriod = clean.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (lastPeriod > lastComma) {
    clean = clean.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const parts = clean.split(',');
    if (parts[1].length === 3 && parts[0].length >= 1) {
      clean = clean.replace(',', '');
    } else {
      clean = clean.replace(',', '.');
    }
  }

  clean = clean.replace(/[^0-9.-]/g, '');
  const result = parseFloat(clean);
  return isFinite(result) ? result : fallback;
};

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  row?: number;
}

// Backward compatibility - re-exported from original validation logic
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTransaction(transaction: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!transaction.Date || typeof transaction.Date !== 'string' || transaction.Date.trim() === '') {
    errors.push('Date is required and must be a non-empty string');
  }

  if (!transaction.Operation || typeof transaction.Operation !== 'string' || transaction.Operation.trim() === '') {
    errors.push('Operation type is required and must be a non-empty string');
  }

  if (!transaction.Ticker || typeof transaction.Ticker !== 'string' || transaction.Ticker.trim() === '') {
    errors.push('Ticker is required and must be a non-empty string');
  } else {
    const tickerRegex = /^[A-Z]{3,4}$/;
    if (!tickerRegex.test(transaction.Ticker.trim())) {
      warnings.push(`Ticker "${transaction.Ticker}" doesn't match expected format (3-4 uppercase letters)`);
    }
  }

  if (transaction.Qty === undefined || transaction.Qty === null || isNaN(parseFloat(transaction.Qty))) {
    errors.push('Quantity must be a valid number');
  }

  if (transaction.Price === undefined || transaction.Price === null || isNaN(parseFloat(transaction.Price))) {
    errors.push('Price must be a valid number');
  } else {
    const price = parseFloat(transaction.Price);
    if (price <= 0) {
      errors.push('Price must be positive');
    } else if (price > 10000) {
      warnings.push('Price is very high - please verify this is correct');
    }
  }

  if (transaction.Total === undefined || transaction.Total === null || isNaN(parseFloat(transaction.Total))) {
    errors.push('Total amount must be a valid number');
  }

  const validOperations = ['Achat', 'Vente', 'Depot', 'Retrait', 'Dividende', 'Frais', 'Taxe'];
  if (transaction.Operation && !validOperations.includes(transaction.Operation)) {
    errors.push(`Invalid operation type: "${transaction.Operation}". Valid types are: ${validOperations.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateTransactionBatch(transactions: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  transactions.forEach((transaction, index) => {
    const result = validateTransaction(transaction);

    if (!result.valid) {
      errors.push(`Transaction ${index + 1}: ${result.errors.join(', ')}`);
    } else {
      validCount++;
    }

    if (result.warnings.length > 0) {
      warnings.push(`Transaction ${index + 1}: ${result.warnings.join(', ')}`);
    }
  });

  return {
    valid: validCount === transactions.length,
    errors,
    warnings
  };
}

export function validateCSVStructure(csv: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const lines = csv.trim().split('\n');

    if (lines.length < 2) {
      errors.push('CSV file must have at least one data row');
      return { valid: false, errors, warnings };
    }

    const headerLine = lines[0].trim();
    let delimiter = ',';
    if (headerLine.includes('\t')) delimiter = '\t';
    else if (headerLine.includes(';')) delimiter = ';';

    const headers = headerLine.split(delimiter).map(h => h.trim());

    if (headers.length === 0) {
      errors.push('No valid headers found in CSV file');
      return { valid: false, errors, warnings };
    }

    const requiredHeaders = ['Date', 'Operation', 'Ticker', 'Qty', 'Price', 'Total'];
    const missingHeaders = requiredHeaders.filter(header =>
      !headers.some(h => h.toLowerCase() === header.toLowerCase())
    );

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

  } catch (error: any) {
    errors.push(`Error validating CSV structure: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePortfolioData(portfolio: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!portfolio || typeof portfolio !== 'object') {
    errors.push('Portfolio data must be an object');
    return { valid: false, errors, warnings };
  }

  const requiredFields = [
    'totalValue', 'totalCost', 'totalRealizedPL', 'totalUnrealizedPL',
    'totalDividends', 'totalDeposits', 'holdings', 'cashBalance'
  ];

  requiredFields.forEach(field => {
    if (portfolio[field] === undefined) {
      errors.push(`Missing required portfolio field: ${field}`);
    }
  });

  if (Array.isArray(portfolio.holdings)) {
    portfolio.holdings.forEach((holding: any, index: number) => {
      if (!holding.ticker) {
        errors.push(`Holding ${index + 1}: Missing ticker`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}