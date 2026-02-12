import { describe, it, expect } from 'vitest';
import { calculatePortfolio } from '../../utils/portfolioCalc';
import { Transaction } from '../../types';

describe('Fee Handling - Comprehensive Transaction Types', () => {
  describe('Buy Transactions - Fee Inference', () => {
    it('should infer fees correctly when missing from buy transaction', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1012.10, // Total includes fees
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      // Should infer fees from the difference between total and gross amount
      expect(result.totalTradingFees).toBeGreaterThan(0);
      expect(result.enrichedTransactions[0].Fees).toBeGreaterThan(0);
      expect(result.holdings[0].averageCost).toBeGreaterThan(100.00); // Should include fees
    });

    it('should use provided fees when available', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1015.00,
          Fees: 15.00, // Explicit fee provided
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      expect(result.enrichedTransactions[0].Fees).toBe(15.00);
      expect(result.totalTradingFees).toBe(15.00);
    });

    it('should handle null fees correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1000.00, // No fees in total
          Fees: null, // Explicitly null
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      // Should handle null fees appropriately based on fee inference logic
      expect(result.enrichedTransactions[0].Fees).toBeDefined();
      expect(result.totalTradingFees).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sell Transactions - Fee and Tax Inference', () => {
    it('should infer both fees and tax when missing from sell transaction', () => {
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
        },
        {
          Date: '2023-01-02',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Vente',
          Ticker: 'TEST',
          Qty: 5,
          Price: 120.00, // 20 profit per share = 100 total profit
          Total: 570.00, // Gross 600 - fees - tax
          parsedDate: new Date('2023-01-02')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      expect(result.enrichedTransactions[1].Fees).toBeGreaterThan(0);
      expect(result.enrichedTransactions[1].Tax).toBeGreaterThan(0);
      expect(result.totalTradingFees).toBeGreaterThan(0);
      expect(result.netTaxImpact).toBeGreaterThan(0);
    });

    it('should handle partially provided fees/tax', () => {
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
        },
        {
          Date: '2023-01-02',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Vente',
          Ticker: 'TEST',
          Qty: 5,
          Price: 120.00,
          Total: 580.00,
          Fees: 10.00, // Only fees provided
          Tax: null, // Tax missing
          parsedDate: new Date('2023-01-02')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      expect(result.enrichedTransactions[1].Fees).toBe(10.00); // Should use provided
      expect(Number(result.enrichedTransactions[1].Tax)).toBeGreaterThanOrEqual(0); // Should infer
    });
  });

  describe('Non-Trade Transaction Enrichment', () => {
    it('should enrich bank fee transactions correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Bank',
          ISIN: '',
          Operation: 'Frais',
          Ticker: 'bank',
          Qty: 0,
          Price: 0,
          Total: -50.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      
      expect(result.enrichedTransactions[0].Fees).toBe(50.00);
      expect(result.enrichedTransactions[0].Tax).toBe(0);
      expect(result.totalCustodyFees).toBe(50.00);
    });

    it('should enrich tax transactions correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Tax Authority',
          ISIN: '',
          Operation: 'Taxe',
          Ticker: '',
          Qty: 0,
          Price: 0,
          Total: -25.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      
      expect(result.enrichedTransactions[0].Fees).toBe(0);
      expect(result.enrichedTransactions[0].Tax).toBe(25.00);
      expect(result.netTaxImpact).toBe(25.00);
    });

    it('should handle subscription fees correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Subscription',
          ISIN: '',
          Operation: 'abonnement',
          Ticker: 'sub',
          Qty: 0,
          Price: 0,
          Total: -100.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      
      // Subscription fees should be handled separately in fees table
      expect(result.enrichedTransactions[0].Fees).toBe(0);
      expect(result.enrichedTransactions[0].Tax).toBe(0);
    });

    it('should handle dividend transactions correctly', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: '',
          Operation: 'Dividende',
          Ticker: 'TEST',
          Qty: 0,
          Price: 0,
          Total: 50.00,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      
      expect(result.enrichedTransactions[0].Fees).toBe(0);
      expect(result.enrichedTransactions[0].Tax).toBe(0);
      expect(result.totalDividends).toBe(50.00);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero amount transactions gracefully', () => {
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 0,
          Price: 100.00,
          Total: 0,
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, {});
      
      expect(result.holdings.length).toBe(0);
      expect(result.totalTradingFees).toBe(11); // Should still apply minimum fees
    });

    it('should validate fee amounts and warn for high fees', () => {
      // This test would need to capture console.warn to verify
      const transactions: Transaction[] = [
        {
          Date: '2023-01-01',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Achat',
          Ticker: 'TEST',
          Qty: 10,
          Price: 100.00,
          Total: -1100.00, // 100 MAD fee (10% - should trigger warning)
          parsedDate: new Date('2023-01-01')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      expect(result.enrichedTransactions[0].Fees).toBe(100.00);
      // Warning would be logged to console
    });
  });

  describe('Complex Multi-Transaction Scenarios', () => {
    it('should handle mixed transaction types correctly', () => {
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
        },
        {
          Date: '2023-01-02',
          Company: 'Bank',
          ISIN: '',
          Operation: 'Frais',
          Ticker: 'bank',
          Qty: 0,
          Price: 0,
          Total: -25.00,
          parsedDate: new Date('2023-01-02')
        },
        {
          Date: '2023-01-03',
          Company: 'Test Company',
          ISIN: 'MA123456',
          Operation: 'Vente',
          Ticker: 'TEST',
          Qty: 5,
          Price: 120.00,
          Total: 575.00,
          parsedDate: new Date('2023-01-03')
        },
        {
          Date: '2023-01-04',
          Company: 'Tax Authority',
          ISIN: '',
          Operation: 'Taxe',
          Ticker: '',
          Qty: 0,
          Price: 0,
          Total: -15.00,
          parsedDate: new Date('2023-01-04')
        }
      ];

      const result = calculatePortfolio(transactions, { TEST: 120.00 });
      
      expect(result.totalCustodyFees).toBe(25.00);
      expect(result.netTaxImpact).toBeGreaterThan(15.00); // Should include transaction tax + declared tax
      expect(result.totalTradingFees).toBeGreaterThan(0);
      expect(result.holdings.length).toBe(1);
      expect(result.holdings[0].quantity).toBe(5);
    });
  });
});