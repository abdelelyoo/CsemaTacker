import { Transaction, Holding, TransactionType, CostMethod, TaxLot, CapitalEvent } from '../types';
import { calculateStandardFees, calculateTaxOnGain } from './feeLogic';
import { roundTo } from './helpers';

export interface HoldingState {
  qty: number;
  costBasis: number;
  avgPrice: number;
  lastPrice: number;
  company: string;
  txCount: number;
  totalBuyCost: number;
  totalBuyQty: number;
  totalSellProceeds: number;
  totalSellQty: number;
  taxLots: TaxLot[];
}

export const createEmptyHoldingState = (ticker: string, company: string): HoldingState => ({
  qty: 0,
  costBasis: 0,
  avgPrice: 0,
  lastPrice: 0,
  company,
  txCount: 0,
  totalBuyCost: 0,
  totalBuyQty: 0,
  totalSellProceeds: 0,
  totalSellQty: 0,
  taxLots: []
});

export interface HoldingCalculationOptions {
  costMethod?: CostMethod;
  capitalEvents?: CapitalEvent[];
}

const generateLotId = (): string => {
  return `lot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const applyStockSplit = (lot: TaxLot, splitEvent: CapitalEvent): TaxLot => {
  if (!splitEvent.split_ratio_from || !splitEvent.split_ratio_to) return lot;

  const ratio = splitEvent.split_ratio_to / splitEvent.split_ratio_from;
  const newRemainingQty = lot.remainingQty * ratio;
  const newQuantity = lot.quantity * ratio;
  const newCostBasis = lot.costBasis / ratio;
  const newPricePerShare = lot.pricePerShare / ratio;

  return {
    ...lot,
    quantity: newQuantity,
    remainingQty: newRemainingQty,
    costBasis: newCostBasis,
    pricePerShare: newPricePerShare
  };
};

const applyStockSplitToState = (state: HoldingState, splitEvent: CapitalEvent): HoldingState => {
  const ratio = (splitEvent.split_ratio_to || 1) / (splitEvent.split_ratio_from || 1);

  return {
    ...state,
    qty: roundTo(state.qty * ratio, 4),
    costBasis: roundTo(state.costBasis / ratio, 4),
    avgPrice: roundTo(state.avgPrice / ratio, 4),
    lastPrice: roundTo(state.lastPrice / ratio, 4),
    taxLots: state.taxLots.map(lot => applyStockSplit(lot, splitEvent))
  };
};

export const getCostFromLots = (
  lots: TaxLot[],
  quantity: number,
  method: CostMethod,
  saleDate: Date
): { costBasis: number; remainingLots: TaxLot[] } => {
  if (lots.length === 0 || quantity <= 0) {
    return { costBasis: 0, remainingLots: [] };
  }

  let remainingQty = quantity;
  let totalCost = 0;
  const sortedLots = [...lots].sort((a, b) => {
    const dateA = new Date(a.purchaseDate).getTime();
    const dateB = new Date(b.purchaseDate).getTime();
    return method === 'FIFO' ? dateA - dateB : dateB - dateA;
  });

  const remainingLots: TaxLot[] = [];

  for (const lot of sortedLots) {
    if (remainingQty <= 0) {
      remainingLots.push(lot);
      continue;
    }

    const availableQty = lot.remainingQty;

    if (availableQty <= remainingQty) {
      // Consume the entire lot — use proportional cost based on remaining shares
      const lotCostPerShare = lot.remainingQty > 0 ? lot.costBasis / lot.remainingQty : 0;
      totalCost += lotCostPerShare * availableQty;
      remainingQty -= availableQty;
    } else {
      const lotCostPerShare = lot.remainingQty > 0 ? lot.costBasis / lot.remainingQty : 0;
      const partialCost = lotCostPerShare * remainingQty;
      totalCost += partialCost;
      remainingLots.push({
        ...lot,
        remainingQty: lot.remainingQty - remainingQty,
        costBasis: lot.costBasis - partialCost
      });
      remainingQty = 0;
    }
  }

  return { costBasis: roundTo(totalCost, 2), remainingLots };
};

export const updateHoldingStateWithMethod = (
  state: HoldingState,
  tx: Transaction,
  options: HoldingCalculationOptions = {}
): { newState: HoldingState; realizedPL: number; fees: number; tax: number } => {
  const { costMethod = 'WAC', capitalEvents = [] } = options;

  const op = tx.Operation.toLowerCase();
  const isBuy = op === 'achat' || op === 'buy';
  const isSell = op === 'vente' || op === 'sell';

  let realizedPL = 0;
  let fees = tx.Fees || 0;
  let tax = tx.Tax || 0;

  const qty = Math.abs(tx.Qty);
  const grossAmount = qty * tx.Price;

  if (isBuy) {
    if (tx.Fees == null) {
      const totalAbs = Math.abs(tx.Total);
      const diff = totalAbs - grossAmount;
      const stdFees = calculateStandardFees(grossAmount);
      if (Math.abs(diff - stdFees) < 5 || Math.abs(diff) < 0.01) {
        fees = stdFees;
      } else {
        fees = Math.max(0, diff);
      }
    }

    if (fees > grossAmount * 0.05) {
      console.warn(`High fee detected: ${fees} MAD on ${grossAmount} MAD (${((fees / grossAmount) * 100).toFixed(2)}%)`);
    }

    const newQty = state.qty + qty;
    const addedCost = grossAmount + fees;

    if (newQty > 0 && qty > 0) {
      if (state.qty <= 0) {
        state.costBasis = roundTo(addedCost / qty, 4);
        state.avgPrice = roundTo(grossAmount / qty, 4);
      } else {
        const currentTotalCost = state.qty * state.costBasis;
        const currentTotalPrice = state.qty * state.avgPrice;
        state.costBasis = roundTo((currentTotalCost + addedCost) / newQty, 4);
        state.avgPrice = roundTo((currentTotalPrice + grossAmount) / newQty, 4);
      }
    }

    if (costMethod !== 'WAC' && qty > 0) {
      const newLot: TaxLot = {
        id: generateLotId(),
        ticker: tx.Ticker,
        purchaseDate: tx.parsedDate,
        quantity: qty,
        costBasis: addedCost,
        pricePerShare: roundTo(grossAmount / qty, 4),
        remainingQty: qty
      };
      state.taxLots.push(newLot);
    }

    state.qty = newQty;
    state.totalBuyCost = roundTo(state.totalBuyCost + grossAmount, 4);
    state.totalBuyQty = roundTo(state.totalBuyQty + qty, 4);

  } else if (isSell) {
    const hasFees = tx.Fees != null;
    const hasTax = tx.Tax != null;

    if (!hasFees || !hasTax) {
      const proceeds = tx.Total;
      const diff = grossAmount - proceeds;
      const stdFees = calculateStandardFees(grossAmount);
      const gain = (tx.Price - state.avgPrice) * qty;
      const estTax = calculateTaxOnGain(gain);

      if (!hasFees && !hasTax) {
        if (Math.abs(diff - (stdFees + estTax)) < 5 || Math.abs(diff) < 0.01) {
          fees = stdFees;
          tax = estTax;
        } else if (diff > stdFees) {
          fees = stdFees;
          tax = Math.max(0, diff - stdFees);
        } else {
          fees = Math.max(0, diff);
          tax = 0;
        }
      } else if (!hasFees && hasTax) {
        const remaining = diff - tax;
        fees = Math.abs(remaining - stdFees) < 5 || remaining < 0 ? stdFees : Math.max(0, remaining);
      } else if (hasFees && !hasTax) {
        const remaining = diff - fees;
        tax = remaining > 0.01 ? remaining : 0;
      }
    }

    if (fees > grossAmount * 0.05) {
      console.warn(`High fee detected: ${fees} MAD on ${grossAmount} MAD (${((fees / grossAmount) * 100).toFixed(2)}%)`);
    }

    let costBasis: number;
    if (costMethod === 'WAC') {
      costBasis = qty * state.costBasis;
    } else {
      const { costBasis: calculatedCost, remainingLots } = getCostFromLots(
        state.taxLots,
        qty,
        costMethod,
        tx.parsedDate
      );
      costBasis = calculatedCost;
      state.taxLots = remainingLots;
    }

    const netProceeds = tx.Total;
    realizedPL = roundTo(netProceeds - costBasis, 2);

    state.qty = roundTo(state.qty - qty, 4);
    // H4 fix: track sell quantity as negative for consistency
    state.totalSellProceeds = roundTo(state.totalSellProceeds + grossAmount, 4);
    state.totalSellQty = roundTo(state.totalSellQty - qty, 4);
  }

  state.lastPrice = tx.Price;
  state.txCount += 1;

  return { newState: state, realizedPL, fees, tax };
};

export const updateHoldingState = (
  state: HoldingState,
  tx: Transaction
): { newState: HoldingState; realizedPL: number; fees: number; tax: number } => {
  return updateHoldingStateWithMethod(state, tx, { costMethod: 'WAC' });
};

export const applyCorporateActions = (
  state: HoldingState,
  events: CapitalEvent[],
  asOfDate: Date,
  ticker?: string
): HoldingState => {
  const holdingTicker = ticker || state.taxLots[0]?.ticker;
  if (!holdingTicker) return state;

  const relevantEvents = events
    .filter(e => e.ticker === holdingTicker)
    .filter(e => new Date(e.date) <= asOfDate)
    .filter(e => e.event_type === 'stock_split' || e.event_type === 'reverse_split');

  let modifiedState = { ...state };

  for (const event of relevantEvents) {
    if (event.event_type === 'stock_split' || event.event_type === 'reverse_split') {
      modifiedState = applyStockSplitToState(modifiedState, event);
    }
  }

  return modifiedState;
};
