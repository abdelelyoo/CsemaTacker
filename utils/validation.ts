// Data validation utilities

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTransaction(transaction: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!transaction.Date || typeof transaction.Date !== 'string' || transaction.Date.trim() === '') {
    errors.push('Date is required and must be a non-empty string');
  }

  if (!transaction.Operation || typeof transaction.Operation !== 'string' || transaction.Operation.trim() === '') {
    errors.push('Operation type is required and must be a non-empty string');
  }

  if (!transaction.Ticker || typeof transaction.Ticker !== 'string' || transaction.Ticker.trim() === '') {
    errors.push('Ticker is required and must be a non-empty string');
  } else {
    // Validate ticker format (3-4 uppercase letters for Moroccan stocks)
    const tickerRegex = /^[A-Z]{3,4}$/;
    if (!tickerRegex.test(transaction.Ticker.trim())) {
      warnings.push(`Ticker "${transaction.Ticker}" doesn't match expected format (3-4 uppercase letters)`);
    }
  }

  // Numeric fields validation
  if (transaction.Qty === undefined || transaction.Qty === null || isNaN(parseFloat(transaction.Qty))) {
    errors.push('Quantity must be a valid number');
  } else {
    const qty = parseFloat(transaction.Qty);
    if (qty === 0) {
      warnings.push('Quantity is zero - this transaction may not affect holdings');
    }
  }

  if (transaction.Price === undefined || transaction.Price === null || isNaN(parseFloat(transaction.Price))) {
    errors.push('Price must be a valid number');
  } else {
    const price = parseFloat(transaction.Price);
    if (price <= 0) {
      errors.push('Price must be positive');
    } else if (price < 0.01) {
      warnings.push('Price is very low - please verify this is correct');
    } else if (price > 10000) {
      warnings.push('Price is very high - please verify this is correct');
    }
  }

  if (transaction.Total === undefined || transaction.Total === null || isNaN(parseFloat(transaction.Total))) {
    errors.push('Total amount must be a valid number');
  }

  // Validate operation types
  const validOperations = ['Achat', 'Vente', 'Depot', 'Retrait', 'Dividende', 'Frais', 'Taxe'];
  if (transaction.Operation && !validOperations.includes(transaction.Operation)) {
    errors.push(`Invalid operation type: "${transaction.Operation}". Valid types are: ${validOperations.join(', ')}`);
  }

  // Validate date format
  if (transaction.Date) {
    const dateStr = transaction.Date.trim();
    const dateRegex = /^(\d{2}\/\d{2}\/\d{2}(?:\d{2})?|\d{4}-\d{2}-\d{2})$/;
    if (!dateRegex.test(dateStr)) {
      errors.push(`Invalid date format: "${dateStr}". Expected DD/MM/YY, DD/MM/YYYY, or YYYY-MM-DD`);
    }
  }

  // Business logic validation
  if (transaction.Operation === 'Achat' && transaction.Total > 0) {
    warnings.push('Buy transaction with positive total - should typically be negative (cash outflow)');
  }

  if (transaction.Operation === 'Vente' && transaction.Total < 0) {
    warnings.push('Sell transaction with negative total - should typically be positive (cash inflow)');
  }

  if (transaction.Operation === 'Depot' && transaction.Total < 0) {
    warnings.push('Deposit transaction with negative total - should typically be positive');
  }

  if ((transaction.Operation === 'Frais' || transaction.Operation === 'Taxe') && transaction.Total > 0) {
    warnings.push('Fee/Tax transaction with positive total - should typically be negative');
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

    // Check for required headers
    const requiredHeaders = ['Date', 'Operation', 'Ticker', 'Qty', 'Price', 'Total'];
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h.toLowerCase() === header.toLowerCase())
    );

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Check data rows have same column count as headers
    for (let i = 1; i < Math.min(lines.length, 11); i++) { // Check first 10 data rows
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter);
      if (values.length !== headers.length) {
        warnings.push(`Line ${i + 1}: Column count (${values.length}) doesn't match header count (${headers.length})`);
      }
    }

  } catch (error) {
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

  // Check required portfolio fields
  const requiredFields = [
    'totalValue', 'totalCost', 'totalRealizedPL', 'totalUnrealizedPL',
    'totalDividends', 'totalDeposits', 'holdings', 'cashBalance',
    'totalTradingFees', 'totalCustodyFees', 'netTaxImpact', 'history'
  ];

  requiredFields.forEach(field => {
    if (portfolio[field] === undefined) {
      errors.push(`Missing required portfolio field: ${field}`);
    }
  });

  // Validate holdings
  if (Array.isArray(portfolio.holdings)) {
    portfolio.holdings.forEach((holding: any, index: number) => {
      if (!holding.ticker) {
        errors.push(`Holding ${index + 1}: Missing ticker`);
      }
      
      if (holding.quantity === undefined || isNaN(holding.quantity)) {
        errors.push(`Holding ${index + 1}: Invalid quantity`);
      }
      
      if (holding.marketValue === undefined || isNaN(holding.marketValue)) {
        errors.push(`Holding ${index + 1}: Invalid market value`);
      }
    });
  } else {
    errors.push('Holdings must be an array');
  }

  // Validate history
  if (Array.isArray(portfolio.history)) {
    portfolio.history.forEach((point: any, index: number) => {
      if (!point.date) {
        errors.push(`History point ${index + 1}: Missing date`);
      }
      
      if (point.value === undefined || isNaN(point.value)) {
        errors.push(`History point ${index + 1}: Invalid value`);
      }
    });
  } else {
    errors.push('History must be an array');
  }

  // Business logic warnings
  if (portfolio.totalValue < 0) {
    warnings.push('Total portfolio value is negative - this may indicate data issues');
  }

  if (Math.abs(portfolio.totalTradingFees) > Math.abs(portfolio.totalValue) * 0.1) {
    warnings.push('Trading fees exceed 10% of portfolio value - this seems unusually high');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}