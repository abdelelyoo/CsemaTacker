
import { Transaction, Holding, TransactionType } from '../types';
import { calculateStandardFees, calculateTaxOnGain } from './feeLogic';
import { roundTo } from './helpers';

export interface HoldingState {
    qty: number;
    costBasis: number;    // Net Cost (Price + Fees)
    avgPrice: number;     // Gross Price (Excludes Fees, for Tax Calc)
    lastPrice: number;
    company: string;
    txCount: number;
    // VWAP Tracking (Cumulative)
    totalBuyCost: number;
    totalBuyQty: number;
    totalSellProceeds: number;
    totalSellQty: number;
}

/**
 * Updates the state of a single holding based on a new transaction.
 */
export const updateHoldingState = (
    state: HoldingState,
    tx: Transaction
): { newState: HoldingState; realizedPL: number; fees: number; tax: number } => {
    const op = tx.Operation.toLowerCase();
    const isBuy = op === 'achat' || op === 'buy';
    const isSell = op === 'vente' || op === 'sell';

    let realizedPL = 0;
    let fees = tx.Fees || 0;
    let tax = tx.Tax || 0;

    const qty = Math.abs(tx.Qty);
    const grossAmount = qty * tx.Price;

    if (isBuy) {
        // 1. Fee Inference if missing (Buy: Total = -(Gross + Fees))
        if (tx.Fees == null) {
            const totalAbs = Math.abs(tx.Total);
            const diff = totalAbs - grossAmount;
            const stdFees = calculateStandardFees(grossAmount);
            // If diff is roughly standard fees (within 5 MAD tolerance) or very small, use standard fee calc
            // 5 MAD tolerance accounts for rounding differences and minor broker variations
            if (Math.abs(diff - stdFees) < 5 || Math.abs(diff) < 0.01) {
                fees = stdFees;
            } else {
                fees = Math.max(0, diff);
            }
        }

        // Add validation for high fees
        if (fees > grossAmount * 0.05) {
            console.warn(`High fee detected: ${fees} MAD on ${grossAmount} MAD (${((fees/grossAmount)*100).toFixed(2)}%)`);
        }

        // 2. Update Weighted Averages
        const newQty = state.qty + qty;

        if (newQty > 0) {
            const addedCost = grossAmount + fees;
            // Guard against division by zero if qty is 0 (though buy qty should be > 0)
            if (qty > 0) {
                // If we were at 0 or negative (short), the new cost basis is just the current purchase
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
        }
        state.qty = newQty;
        state.totalBuyCost = roundTo(state.totalBuyCost + grossAmount, 4);
        state.totalBuyQty = roundTo(state.totalBuyQty + qty, 4);

    } else if (isSell) {
        // 1. Fee/Tax Inference if missing (Sell: Total = Gross - Fees - Tax)
        // Handle cases where fees or tax may be partially provided
        const hasFees = tx.Fees != null;
        const hasTax = tx.Tax != null;
        
        if (!hasFees || !hasTax) {
            const proceeds = tx.Total;
            const diff = grossAmount - proceeds;
            const stdFees = calculateStandardFees(grossAmount);
            const gain = (tx.Price - state.avgPrice) * qty;
            const estTax = calculateTaxOnGain(gain);

            if (!hasFees && !hasTax) {
                // Neither provided - infer both
                // Use 5 MAD tolerance for better handling of rounding and broker variations
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
                // Only tax provided - infer fees
                const remaining = diff - tax;
                if (Math.abs(remaining - stdFees) < 5 || remaining < 0) {
                    fees = stdFees;
                } else {
                    fees = Math.max(0, remaining);
                }
            } else if (hasFees && !hasTax) {
                // Only fees provided - infer tax
                const remaining = diff - fees;
                if (remaining > 0.01) {
                    tax = remaining;
                } else {
                    tax = 0;
                }
            }
        }

        // Add validation for high fees
        if (fees > grossAmount * 0.05) {
            console.warn(`High fee detected: ${fees} MAD on ${grossAmount} MAD (${((fees/grossAmount)*100).toFixed(2)}%)`);
        }

        // 2. Calculate P&L
        // Realized P&L = Net Proceeds - (Qty * Net Cost Basis)
        const netProceeds = tx.Total;
        const costOfSoldShares = qty * state.costBasis;
        realizedPL = roundTo(netProceeds - costOfSoldShares, 2);

        state.qty = roundTo(state.qty - qty, 4);
        state.totalSellProceeds = roundTo(state.totalSellProceeds + grossAmount, 4);
        state.totalSellQty = roundTo(state.totalSellQty + qty, 4);
    }

    state.lastPrice = tx.Price;
    state.txCount += 1;

    return { newState: state, realizedPL, fees, tax };
};
