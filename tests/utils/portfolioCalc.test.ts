import { describe, it, expect } from 'vitest';
import { parseCSV, calculatePortfolio } from '../../utils/portfolioCalc';
import { Transaction, PortfolioSummary } from '../../types';

describe('portfolioCalc utility functions', () => {
  const csv = `Date,Company,ISIN,Operation,Ticker,Qty,Price,Total
2023-01-01,Test Company,MA123456,Achat,TEST,10,100.00,-1010.00`;

  describe('parseCSV', () => {
    it('should parse standard CSV format correctly', () => {
      const { transactions: result } = parseCSV(csv);
      expect(result.length).toBe(1);
      expect(result[0].Date).toBe('2023-01-01');
      expect(result[0].Company).toBe('Test Company');
      expect(result[0].Operation).toBe('Achat');
      expect(result[0].Ticker).toBe('TEST');
      expect(result[0].Qty).toBe(10);
      expect(result[0].Price).toBe(100.00);
      expect(result[0].Total).toBe(-1010.00);
    });

    it('should handle DD/MM/YY date format', () => {
      const csv = `Date,Company,ISIN,Operation,Ticker,Qty,Price,Total
01/01/23,Test Company,MA123456,Achat,TEST,10,100.00,-1010.00`;

      const { transactions: result } = parseCSV(csv);
      expect(result.length).toBe(1);
      expect(result[0].parsedDate.getFullYear()).toBe(2023);
      expect(result[0].parsedDate.getMonth()).toBe(0); // January
      expect(result[0].parsedDate.getDate()).toBe(1);
    });

    it('should handle MAD currency formatting', () => {
      const csv = `Date,Company,ISIN,Operation,Ticker,Qty,Price,Total
2023-01-01,Test Company,MA123456,Achat,TEST,10,100.00,-1,010.00 MAD`;

      const { transactions: result } = parseCSV(csv);
      expect(result[0].Total).toBe(-1010.00);
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const { transactions: result } = parseCSV(csv);
      expect(result.length).toBe(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'Date,Company,ISIN,Operation,Ticker,Qty,Price,Total';
      const { transactions: result } = parseCSV(csv);
      expect(result.length).toBe(0);
    });

    it('should handle different delimiters', () => {
      const csv = `Date;Company;ISIN;Operation;Ticker;Qty;Price;Total
2023-01-01;Test Company;MA123456;Achat;TEST;10;100.00;-1010.00`;

      const { transactions: result } = parseCSV(csv);
      expect(result.length).toBe(1);
      expect(result[0].Operation).toBe('Achat');
    });
  });

  describe('calculatePortfolio', () => {
    it('should calculate basic portfolio metrics correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1010.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const currentPrices = { TEST: 120.00 };
      const result = calculatePortfolio(transactions, currentPrices);

      expect(result.totalValue).toBe(1200.00);
      expect(result.totalCost).toBe(1010.00);
      expect(result.totalUnrealizedPL).toBe(190.00);
      expect(result.cashBalance).toBeCloseTo(-1010.00);
      expect(result.holdings.length).toBe(1);
      expect(result.holdings[0].ticker).toBe('TEST');
      expect(result.holdings[0].quantity).toBe(10);
      expect(result.holdings[0].marketValue).toBe(1200.00);
    });

    it('should handle buy and sell transactions correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1010.00,
          parsedDate: new Date('2023-01-01')
        },
        {
          Date: '2023-01-02',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Vente',
          Ticker: 'TEST',
          Qty: 5,
          Price: 120.00,
          Total: 590.00,
          parsedDate: new Date('2023-01-02')
        }
      ];

      const currentPrices = { TEST: 120.00 };
      const result = calculatePortfolio(transactions, currentPrices);

      expect(result.holdings[0].quantity).toBe(5);
      expect(result.totalRealizedPL).toBeGreaterThan(0);
      expect(result.cashBalance).toBeCloseTo(-1010 + 590);
    });

    it('should calculate fees correctly for Moroccan market', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1000.00, // No fees specified
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      expect(result.totalTradingFees).toBeGreaterThan(0);
    });

    it('should handle empty transaction list', () => {
      const result = calculatePortfolio([], {});
      expect(result.totalValue).toBe(0);
      expect(result.holdings.length).toBe(0);
      expect(result.history.length).toBe(0);
    });

    it('should calculate break-even prices correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1010.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      const breakEven = result.holdings[0].breakEvenPrice;

      // Break-even should be higher than average cost due to fees
      expect(breakEven).toBeGreaterThan(101.00);
      expect(breakEven).toBeCloseTo(102.0099, 4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle transactions with missing optional fields', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1000.00,
          parsedDate: new Date('2023-01-01')
          // Fees, Tax, RealizedPL are undefined
        }
      ];

      const result = calculatePortfolio(transactions, {});
      expect(result.totalTradingFees).toBeGreaterThan(0);
      expect(result.netTaxImpact).toBe(0);
    });

    it('should handle very large transaction volumes', () => {
      const transactions: Transaction[] = [];
      const startDate = new Date('2023-01-01');

      // Create 1000 transactions
      for (let i = 0; i < 1000; i++) {
        transactions.push({
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 1,
          Price: 100.00,
          Total: -101.00,
          parsedDate: new Date(startDate.getTime() + i * 86400000) // Different dates
        });
      }

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      expect(result.holdings[0].quantity).toBe(1000);
      expect(result.history.length).toBeGreaterThan(0);
    });
  });
});