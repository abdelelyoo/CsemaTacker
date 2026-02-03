// Common helper functions to reduce code duplication

export function formatCurrency(value: number, currency: string = 'MAD', locale: string = 'fr-MA'): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Rounds a number to a specific precision to avoid floating-point drift.
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function getTransactionTypeIcon(type: string) {
  const typeMap: Record<string, string> = {
    'Achat': 'arrow-up-circle',
    'Vente': 'arrow-down-circle',
    'Depot': 'plus-circle',
    'Retrait': 'minus-circle',
    'Dividende': 'gift',
    'Frais': 'receipt',
    'Taxe': 'file-text'
  };

  return typeMap[type] || 'help-circle';
}

export function getTransactionTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'Achat': 'text-blue-600',
    'Vente': 'text-green-600',
    'Depot': 'text-emerald-600',
    'Retrait': 'text-rose-600',
    'Dividende': 'text-purple-600',
    'Frais': 'text-amber-600',
    'Taxe': 'text-gray-600'
  };

  return colorMap[type] || 'text-slate-500';
}

export function calculateFeeDrag(totalFees: number, portfolioValue: number): number {
  if (portfolioValue <= 0) return 0;
  return (totalFees / portfolioValue) * 100;
}

export function calculateHHI(holdings: { allocation: number }[]): number {
  return holdings.reduce((sum, holding) => {
    return sum + (holding.allocation * holding.allocation);
  }, 0);
}

export function getHHIStatus(hhiScore: number): string {
  if (hhiScore < 1500) return 'Diversified';
  if (hhiScore < 2500) return 'Moderate Concentration';
  return 'Highly Concentrated';
}

export function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function isValidTicker(ticker: string): boolean {
  // Basic validation for Moroccan stock tickers (3-4 uppercase letters)
  return /^[A-Z]{3,4}$/.test(ticker.trim());
}

export function isValidISIN(isin: string): boolean {
  // Basic ISIN validation (MA followed by 10 digits)
  return /^MA\d{10}$/.test(isin.trim());
}

export function validateTransactionData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.date || !data.date.trim()) {
    errors.push('Date is required');
  }

  if (!data.ticker || !data.ticker.trim()) {
    errors.push('Ticker is required');
  } else if (!isValidTicker(data.ticker)) {
    errors.push('Invalid ticker format (expected 3-4 uppercase letters)');
  }

  if (!data.operation || !data.operation.trim()) {
    errors.push('Operation type is required');
  }

  if (data.qty === undefined || data.qty === null || isNaN(parseFloat(data.qty))) {
    errors.push('Quantity must be a valid number');
  } else if (parseFloat(data.qty) <= 0) {
    errors.push('Quantity must be positive');
  }

  if (data.price === undefined || data.price === null || isNaN(parseFloat(data.price))) {
    errors.push('Price must be a valid number');
  } else if (parseFloat(data.price) <= 0) {
    errors.push('Price must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function getDateRangeDescription(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };

  const start = startDate.toLocaleDateString('fr-MA', options);
  const end = endDate.toLocaleDateString('fr-MA', options);

  return `${start} - ${end}`;
}

export function formatDateForDisplay(date: Date | string): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function parseDateFromInput(dateString: string): Date | null {
  if (!dateString) return null;

  // Try YYYY-MM-DD format first
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}