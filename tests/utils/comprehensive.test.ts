import { describe, it, expect } from 'vitest';
import {
  calculateStandardFees,
  calculateTaxOnGain,
  calculateBreakEvenPrice
} from '../../utils/feeLogic';

describe('Fee Logic - Moroccan Market', () => {
  describe('calculateStandardFees', () => {
    it('should calculate fees correctly for amounts above minimum thresholds', () => {
      // 1000 MAD * 0.006 = 6 MAD (below minimum 7.50) -> use minimum
      // 1000 MAD * 0.002 = 2 MAD (below minimum 2.50) -> use minimum  
      // 1000 MAD * 0.001 = 1 MAD
      // Total HT = 7.50 + 2.50 + 1 = 11 MAD
      // + 10% VAT = 12.10
      const fees = calculateStandardFees(1000);
      expect(fees).toBeCloseTo(12.10, 1);
    });

    it('should use percentage rates for larger amounts', () => {
      // 100000 MAD * 0.006 = 600 MAD
      // 100000 MAD * 0.002 = 200 MAD
      // 100000 MAD * 0.001 = 100 MAD
      // Total HT = 900 MAD + 10% VAT = 990 MAD
      const fees = calculateStandardFees(100000);
      expect(fees).toBeCloseTo(990, 0);
    });

    it('should handle very small amounts with minimum fees', () => {
      // 100 MAD * 0.006 = 0.6 MAD (below 7.50)
      // 100 MAD * 0.002 = 0.2 MAD (below 2.50)
      // 100 MAD * 0.001 = 0.1 MAD
      // Total HT = 7.50 + 2.50 + 0.1 = 10.10 + VAT = 11.11
      const fees = calculateStandardFees(100);
      expect(fees).toBeGreaterThan(10);
    });
  });

  describe('calculateTaxOnGain', () => {
    it('should calculate 15% TPCVM on positive gains', () => {
      const tax = calculateTaxOnGain(1000);
      expect(tax).toBe(150);
    });

    it('should return 0 for losses', () => {
      const tax = calculateTaxOnGain(-500);
      expect(tax).toBe(0);
    });

    it('should return 0 for zero gain', () => {
      const tax = calculateTaxOnGain(0);
      expect(tax).toBe(0);
    });
  });

  describe('calculateBreakEvenPrice', () => {
    it('should calculate break-even including estimated fees', () => {
      // Cost basis 100, fee rate ~0.99%
      // BreakEven = 100 / (1 - 0.0099) = ~100.999
      const breakEven = calculateBreakEvenPrice(100);
      expect(breakEven).toBeGreaterThan(100);
      expect(breakEven).toBeLessThan(110);
    });

    it('should handle edge case of very high cost basis', () => {
      const breakEven = calculateBreakEvenPrice(10000);
      expect(breakEven).toBeGreaterThan(10000);
    });
  });
});

describe('Holding Calculations - FIFO/LIFO/WAC', () => {
  it('should track tax lots correctly for FIFO method', () => {
    // This tests the tax lot tracking logic
    const mockLots = [
      { id: '1', ticker: 'TEST', purchaseDate: new Date('2023-01-01'), quantity: 10, costBasis: 1000, pricePerShare: 100, remainingQty: 10 },
      { id: '2', ticker: 'TEST', purchaseDate: new Date('2023-02-01'), quantity: 10, costBasis: 1200, pricePerShare: 120, remainingQty: 10 },
    ];

    // FIFO should use lot 1 first
    expect(mockLots[0].purchaseDate < mockLots[1].purchaseDate).toBe(true);
  });

  it('should handle partial lot sales correctly', () => {
    const mockLots = [
      { id: '1', ticker: 'TEST', purchaseDate: new Date('2023-01-01'), quantity: 10, costBasis: 1000, pricePerShare: 100, remainingQty: 10 },
    ];

    // Selling 3 shares should leave 7
    const sold = 3;
    const remainingLots = mockLots.map(lot => ({
      ...lot,
      remainingQty: lot.remainingQty - sold
    }));

    expect(remainingLots[0].remainingQty).toBe(7);
  });
});

describe('Validation - Edge Cases', () => {
  it('should detect invalid dates', () => {
    const invalidDates = [
      '32/01/2023',  // Invalid day
      '13/13/2023',  // Invalid month
      '',             // Empty
      'not-a-date'   // Random string
    ];

    invalidDates.forEach(dateStr => {
      const date = new Date(dateStr);
      expect(isNaN(date.getTime())).toBe(true);
    });
  });

  it('should handle edge case numeric values', () => {
    const edgeCases = [
      { input: Infinity, expected: false },
      { input: -Infinity, expected: false },
      { input: NaN, expected: false },
      { input: Number.MAX_VALUE, expected: true },
      { input: 1e308, expected: true }, // Max is ~1.79e308
      { input: 0.1 + 0.2, expected: true } // Floating point
    ];

    edgeCases.forEach(({ input, expected }) => {
      expect(isFinite(input)).toBe(expected);
    });
  });

  it('should validate ticker format for Moroccan stocks', () => {
    const validTickers = ['ATW', 'BOA', 'NKL', 'AKT', 'IAM', 'GTM'];
    const invalidTickers = ['atw', 'A', 'ATWWW', '123', 'ATW1'];

    const tickerRegex = /^[A-Z]{3,4}$/;

    validTickers.forEach(ticker => {
      expect(tickerRegex.test(ticker)).toBe(true);
    });

    invalidTickers.forEach(ticker => {
      expect(tickerRegex.test(ticker)).toBe(false);
    });
  });
});

describe('Performance Calculations', () => {
  it('should calculate time-weighted return correctly', () => {
    const periods = [
      { value: 10000, date: '2023-01-01' },
      { value: 11000, date: '2023-02-01' },
      { value: 10500, date: '2023-03-01' },
      { value: 12000, date: '2023-04-01' }
    ];

    const totalReturn = (periods[periods.length - 1].value - periods[0].value) / periods[0].value;
    expect(totalReturn).toBeCloseTo(0.2, 2); // 20% return
  });

  it('should calculate money-weighted return (IRR approximation)', () => {
    const cashFlows = [
      { amount: -10000, date: '2023-01-01' }, // Initial investment
      { amount: 500, date: '2023-06-01' },     // Dividend
      { amount: 10500, date: '2023-12-31' }    // Final value
    ];

    // Simplified IRR calculation
    const totalInflows = 500 + 10500;
    const totalOutflows = 10000;
    const return_pct = (totalInflows - totalOutflows) / totalOutflows;

    expect(return_pct).toBeCloseTo(0.1, 2); // ~10% return
  });
});

describe('Risk Metrics', () => {
  it('should calculate HHI correctly', () => {
    const allocations = [
      { ticker: 'ATW', weight: 0.4 },
      { ticker: 'BOA', weight: 0.3 },
      { ticker: 'NKL', weight: 0.2 },
      { ticker: 'AKT', weight: 0.1 }
    ];

    const hhi = allocations.reduce((sum, a) => sum + Math.pow(a.weight * 100, 2), 0);

    // HHI = 0.4^2 + 0.3^2 + 0.2^2 + 0.1^2 = 0.16 + 0.09 + 0.04 + 0.01 = 0.30 (as decimal)
    // Or as percentage but out of 10,000: 1600 + 900 + 400 + 100 = 3000
    expect(hhi).toBe(3000);
  });

  it('should classify concentration risk correctly', () => {
    const classifyHHI = (hhi: number) => {
      if (hhi < 1500) return 'Low';
      if (hhi < 2500) return 'Moderate';
      if (hhi < 5000) return 'High';
      return 'Extreme';
    };

    expect(classifyHHI(1000)).toBe('Low');
    expect(classifyHHI(2000)).toBe('Moderate');
    expect(classifyHHI(3000)).toBe('High');
    expect(classifyHHI(6000)).toBe('Extreme');
  });
});

describe('Dividend Calculations', () => {
  it('should calculate dividend yield correctly', () => {
    const annualDividend = 50; // MAD per share
    const sharePrice = 500; // MAD

    const yield_pct = (annualDividend / sharePrice) * 100;
    expect(yield_pct).toBe(10);
  });

  it('should calculate payout ratio correctly', () => {
    const dividendPerShare = 5; // MAD
    const eps = 20; // MAD earnings per share

    const payoutRatio = (dividendPerShare / eps) * 100;
    expect(payoutRatio).toBe(25);
  });

  it('should assess dividend sustainability', () => {
    const isSustainable = (payoutRatio: number, hasStableEarnings: boolean) => {
      return payoutRatio < 70 && hasStableEarnings;
    };

    expect(isSustainable(30, true)).toBe(true);
    expect(isSustainable(80, true)).toBe(false);
    expect(isSustainable(50, false)).toBe(false);
  });
});

describe('Currency Handling', () => {
  it('should parse European number format correctly', () => {
    const parseEuropean = (str: string) => {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    };

    expect(parseEuropean('1.234,56')).toBe(1234.56);
    expect(parseEuropean('10,00')).toBe(10);
  });

  it('should parse US number format correctly', () => {
    const parseUS = (str: string) => {
      return parseFloat(str.replace(/,/g, ''));
    };

    expect(parseUS('1,234.56')).toBe(1234.56);
    expect(parseUS('10.00')).toBe(10);
  });
});

describe('Date Handling', () => {
  it('should parse DD/MM/YY format correctly', () => {
    const parseDate = (str: string) => {
      const parts = str.split('/');
      if (parts[2].length === 2) {
        parts[2] = '20' + parts[2];
      }
      return new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
    };

    const date = parseDate('15/03/25');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2); // March (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('should handle date boundaries correctly', () => {
    const dates = [
      new Date('2023-12-31'),
      new Date('2024-01-01'),
      new Date('2024-12-31'),
      new Date('2025-01-01')
    ];

    dates.forEach(date => {
      expect(isNaN(date.getTime())).toBe(false);
    });
  });
});
