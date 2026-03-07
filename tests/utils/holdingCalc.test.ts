import { describe, it, expect } from 'vitest';
import {
  createEmptyHoldingState,
  getCostFromLots,
  updateHoldingStateWithMethod,
  applyCorporateActions
} from '../../utils/holdingCalc';
import { Transaction, TaxLot, CapitalEvent, CostMethod } from '../../types';

describe('holdingCalc - FIFO/LIFO Lot Tracking', () => {
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

  describe('getCostFromLots', () => {
    it('should return 0 for empty lots', () => {
      const result = getCostFromLots([], 10, 'FIFO', new Date());
      expect(result.costBasis).toBe(0);
      expect(result.remainingLots).toHaveLength(0);
    });

    it('should consume lots in FIFO order', () => {
      const lots: TaxLot[] = [
        { id: '1', ticker: 'TEST', purchaseDate: new Date('2023-01-01'), quantity: 10, costBasis: 1000, pricePerShare: 100, remainingQty: 10 },
        { id: '2', ticker: 'TEST', purchaseDate: new Date('2023-02-01'), quantity: 10, costBasis: 1200, pricePerShare: 120, remainingQty: 10 }
      ];

      const result = getCostFromLots(lots, 15, 'FIFO', new Date('2023-03-01'));
      
      expect(result.costBasis).toBeCloseTo(1600, 0);
      expect(result.remainingLots).toHaveLength(1);
      expect(result.remainingLots[0].id).toBe('2');
      expect(result.remainingLots[0].remainingQty).toBe(5);
    });

    it('should consume lots in LIFO order', () => {
      const lots: TaxLot[] = [
        { id: '1', ticker: 'TEST', purchaseDate: new Date('2023-01-01'), quantity: 10, costBasis: 1000, pricePerShare: 100, remainingQty: 10 },
        { id: '2', ticker: 'TEST', purchaseDate: new Date('2023-02-01'), quantity: 10, costBasis: 1200, pricePerShare: 120, remainingQty: 10 }
      ];

      const result = getCostFromLots(lots, 15, 'LIFO', new Date('2023-03-01'));
      
      expect(result.costBasis).toBeCloseTo(1700, 0);
      expect(result.remainingLots).toHaveLength(1);
      expect(result.remainingLots[0].id).toBe('1');
      expect(result.remainingLots[0].remainingQty).toBe(5);
    });

    it('should handle partial lot consumption correctly', () => {
      const lots: TaxLot[] = [
        { id: '1', ticker: 'TEST', purchaseDate: new Date('2023-01-01'), quantity: 10, costBasis: 1000, pricePerShare: 100, remainingQty: 10 }
      ];

      const result = getCostFromLots(lots, 3, 'FIFO', new Date());
      
      expect(result.costBasis).toBeCloseTo(300, 2);
      expect(result.remainingLots).toHaveLength(1);
      expect(result.remainingLots[0].remainingQty).toBe(7);
      expect(result.remainingLots[0].costBasis).toBeCloseTo(700, 2);
    });
  });

  describe('updateHoldingStateWithMethod - FIFO', () => {
    it('should track tax lots correctly for FIFO method', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      const result1 = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' });
      
      expect(result1.newState.taxLots).toHaveLength(1);
      expect(result1.newState.taxLots[0].quantity).toBe(10);
      expect(result1.newState.taxLots[0].remainingQty).toBe(10);
      
      const tx2 = createTx('Achat', 'TEST', 10, 120, '2023-02-01', -1212);
      const result2 = updateHoldingStateWithMethod(result1.newState, tx2, { costMethod: 'FIFO' });
      
      expect(result2.newState.taxLots).toHaveLength(2);
      expect(result2.newState.qty).toBe(20);
    });

    it('should consume oldest lots first when selling with FIFO', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      const tx2 = createTx('Achat', 'TEST', 10, 120, '2023-02-01', -1212);
      state = updateHoldingStateWithMethod(state, tx2, { costMethod: 'FIFO' }).newState;
      
      expect(state.taxLots).toHaveLength(2);
      expect(state.qty).toBe(20);
      
      const tx3 = createTx('Vente', 'TEST', 15, 110, '2023-03-01', 1635);
      const result = updateHoldingStateWithMethod(state, tx3, { costMethod: 'FIFO' });
      
      expect(result.newState.qty).toBe(5);
      expect(result.realizedPL).toBeCloseTo(16.74, 0);
      expect(result.newState.taxLots).toHaveLength(1);
      expect(result.newState.taxLots[0].remainingQty).toBe(5);
    });

    it('should consume newest lots first when selling with LIFO', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'LIFO' }).newState;
      
      const tx2 = createTx('Achat', 'TEST', 10, 120, '2023-02-01', -1212);
      state = updateHoldingStateWithMethod(state, tx2, { costMethod: 'LIFO' }).newState;
      
      const tx3 = createTx('Vente', 'TEST', 15, 110, '2023-03-01', 1635);
      const result = updateHoldingStateWithMethod(state, tx3, { costMethod: 'LIFO' });
      
      expect(result.realizedPL).toBeCloseTo(-83.37, 0);
      expect(result.newState.taxLots).toHaveLength(1);
      expect(result.newState.taxLots[0].remainingQty).toBe(5);
    });
  });

  describe('updateHoldingStateWithMethod - WAC', () => {
    it('should use average cost for WAC method', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      const result1 = updateHoldingStateWithMethod(state, tx1, { costMethod: 'WAC' });
      
      expect(result1.newState.avgPrice).toBe(100);
      expect(result1.newState.costBasis).toBeCloseTo(101.21, 1);
      
      const tx2 = createTx('Achat', 'TEST', 10, 120, '2023-02-01', -1212);
      const result2 = updateHoldingStateWithMethod(result1.newState, tx2, { costMethod: 'WAC' });
      
      expect(result2.newState.avgPrice).toBe(110);
      expect(result2.newState.costBasis).toBeCloseTo(111.22, 1);
    });

    it('should not track tax lots for WAC method', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      const result = updateHoldingStateWithMethod(state, tx1, { costMethod: 'WAC' });
      
      expect(result.newState.taxLots).toHaveLength(0);
    });
  });

  describe('Partial Lot Sales', () => {
    it('should correctly calculate cost basis for partial lot sale', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 100, 100, '2023-01-01', -10100);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      const tx2 = createTx('Vente', 'TEST', 30, 110, '2023-02-01', 3267);
      const result = updateHoldingStateWithMethod(state, tx2, { costMethod: 'FIFO' });
      
      expect(result.newState.qty).toBe(70);
      expect(result.realizedPL).toBeCloseTo(237.3, 0);
      expect(result.newState.taxLots[0].remainingQty).toBe(70);
    });
  });

  describe('applyCorporateActions', () => {
    it('should apply stock split to tax lots', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 100, 100, '2023-01-01', -10100);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      expect(state.taxLots[0].quantity).toBe(100);
      expect(state.taxLots[0].costBasis).toBeCloseTo(10099, 0);
      
      const splitEvent: CapitalEvent = {
        ticker: 'TEST',
        date: new Date('2023-02-01'),
        event_type: 'stock_split',
        description: 'Test split',
        split_ratio_from: 1,
        split_ratio_to: 2
      };
      
      const result = applyCorporateActions(state, [splitEvent], new Date('2023-02-15'), 'TEST');
      
      expect(result.taxLots[0].quantity).toBe(200);
      expect(result.taxLots[0].remainingQty).toBe(200);
      expect(result.taxLots[0].costBasis).toBeCloseTo(5049.5, 0);
      expect(result.taxLots[0].pricePerShare).toBe(50);
    });

    it('should only apply corporate actions for matching ticker', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 100, 100, '2023-01-01', -10100);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      const splitEvent: CapitalEvent = {
        ticker: 'OTHER',
        date: new Date('2023-02-01'),
        event_type: 'stock_split',
        description: 'Test split',
        split_ratio_from: 1,
        split_ratio_to: 2
      };
      
      const result = applyCorporateActions(state, [splitEvent], new Date('2023-02-15'), 'TEST');
      
      expect(result.taxLots[0].quantity).toBe(100);
      expect(result.qty).toBe(100);
    });
  });

  describe('Realized P&L Calculation', () => {
    it('should calculate correct realized P&L for profitable FIFO sale', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 100, '2023-01-01', -1010);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      const tx2 = createTx('Vente', 'TEST', 10, 120, '2023-02-01', 1188);
      const result = updateHoldingStateWithMethod(state, tx2, { costMethod: 'FIFO' });
      
      expect(result.realizedPL).toBeCloseTo(175.9, 0);
      expect(result.newState.qty).toBe(0);
    });

    it('should calculate correct realized P&L for loss FIFO sale', () => {
      let state = createEmptyHoldingState('TEST', 'Test Company');
      
      const tx1 = createTx('Achat', 'TEST', 10, 120, '2023-01-01', -1212);
      state = updateHoldingStateWithMethod(state, tx1, { costMethod: 'FIFO' }).newState;
      
      const tx2 = createTx('Vente', 'TEST', 10, 100, '2023-02-01', 990);
      const result = updateHoldingStateWithMethod(state, tx2, { costMethod: 'FIFO' });
      
      expect(result.realizedPL).toBeCloseTo(-222, 0);
    });
  });
});
