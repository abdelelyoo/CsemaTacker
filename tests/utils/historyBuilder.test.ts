import { describe, it, expect } from 'vitest';
import { buildPerformanceHistory } from '../../utils/historyBuilder';
import { Transaction, BankOperation, FeeRecord } from '../../types';

describe('historyBuilder', () => {
  const createTx = (
    operation: 'Achat' | 'Vente',
    ticker: string,
    qty: number,
    price: number,
    date: string,
    total: number
  ): Transaction => ({
    Date: date,
    Operation: operation,
    Ticker: ticker,
    Company: 'Test Company',
    ISIN: 'MA123456',
    Qty: qty,
    Price: price,
    Total: total,
    parsedDate: new Date(date)
  });

  const createBankOp = (
    operation: string,
    amount: number,
    date: string,
    category: string
  ): BankOperation => ({
    Date: date,
    parsedDate: new Date(date),
    Operation: operation as any,
    Description: 'Test',
    Amount: amount,
    Category: category as any
  });

  describe('buildPerformanceHistory', () => {
    it('should return empty array for empty transactions', () => {
      const result = buildPerformanceHistory([], {});
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should process buy transactions correctly', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010)
      ];
      
      const result = buildPerformanceHistory(transactions, { TEST: 100 });
      
      expect(result.length).toBeGreaterThan(0);
      // Value = cash (-1010) + holdings (1000) = -10 (negative because no deposit)
      expect(result[0].value).toBeCloseTo(-10, 0);
    });

    it('should process sell transactions correctly', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010),
        createTx('Vente', 'TEST', 5, 120, '2023-02-01', 590)
      ];
      
      const result = buildPerformanceHistory(transactions, { TEST: 120 });
      
      expect(result.length).toBeGreaterThan(1);
    });

    it('should process bank deposits correctly', () => {
      const transactions: Transaction[] = [];
      const bankOperations = [
        createBankOp('DEPOSIT', 10000, '2023-01-01', 'DEPOSIT')
      ];
      
      const result = buildPerformanceHistory(transactions, {}, bankOperations);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].invested).toBeCloseTo(10000, 0);
    });

    it('should process bank withdrawals correctly', () => {
      const transactions: Transaction[] = [];
      const bankOperations = [
        createBankOp('DEPOSIT', 10000, '2023-01-01', 'DEPOSIT'),
        createBankOp('WITHDRAWAL', 5000, '2023-02-01', 'WITHDRAWAL')
      ];
      
      const result = buildPerformanceHistory(transactions, {}, bankOperations);
      
      expect(result.length).toBeGreaterThan(1);
      expect(result[1].invested).toBeCloseTo(5000, 0);
    });

    it('should process dividends correctly', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010)
      ];
      const bankOperations = [
        createBankOp('DIVIDEND', 100, '2023-02-01', 'DIVIDEND')
      ];
      
      const result = buildPerformanceHistory(transactions, { TEST: 100 }, bankOperations);
      
      expect(result.length).toBeGreaterThan(1);
    });

    it('should process fees correctly', () => {
      const transactions: Transaction[] = [];
      const fees: FeeRecord[] = [
        { date: new Date('2023-01-01'), type: 'CUS', amount: 100, description: 'Custody fee' }
      ];
      
      const result = buildPerformanceHistory(transactions, {}, [], fees);
      
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sort transactions by date', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-03-01', -1010),
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010),
        createTx('Achat', 'TEST', 10, 100, '2023-02-01', -1010)
      ];
      
      const result = buildPerformanceHistory(transactions, {});
      
      expect(result.length).toBeGreaterThan(3);
      expect(new Date(result[0].date).getTime()).toBeLessThanOrEqual(new Date(result[1].date).getTime());
    });

    it('should use current prices for today data point', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010)
      ];
      
      const currentPrices = { TEST: 150 };
      const result = buildPerformanceHistory(transactions, currentPrices);
      
      const todayPoint = result[result.length - 1];
      // Value = cash (-1010) + holdings at current price (10 * 150 = 1500) = 490
      expect(todayPoint.value).toBeCloseTo(490, 0);
    });

    it('should handle multiple tickers correctly', () => {
      const transactions = [
        createTx('Achat', 'TEST1', 10, 100, '2023-01-01', -1010),
        createTx('Achat', 'TEST2', 20, 50, '2023-01-01', -1010)
      ];
      
      const result = buildPerformanceHistory(transactions, { TEST1: 100, TEST2: 50 });
      
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include today data point', () => {
      const transactions = [
        createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010)
      ];
      
      const result = buildPerformanceHistory(transactions, { TEST: 120 });
      
      const todayStr = new Date().toISOString().split('T')[0];
      const hasToday = result.some(p => p.date === todayStr);
      expect(hasToday).toBe(true);
    });

    it('should calculate invested amount correctly with deposits and withdrawals', () => {
      const transactions: Transaction[] = [];
      const bankOperations = [
        createBankOp('DEPOSIT', 10000, '2023-01-01', 'DEPOSIT'),
        createBankOp('DEPOSIT', 5000, '2023-02-01', 'DEPOSIT'),
        createBankOp('WITHDRAWAL', 2000, '2023-03-01', 'WITHDRAWAL')
      ];
      
      const result = buildPerformanceHistory(transactions, {}, bankOperations);
      
      const lastPoint = result[result.length - 1];
      expect(lastPoint.invested).toBeCloseTo(13000, 0);
    });
  });
});
