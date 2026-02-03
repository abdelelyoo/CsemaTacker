
import {
    BROKERAGE_RATE_HT,
    BROKERAGE_MIN_HT,
    SETTLEMENT_RATE_HT,
    SETTLEMENT_MIN_HT,
    SBVC_RATE_HT,
    VAT_RATE,
    TPCVM_RATE,
    ESTIMATED_TOTAL_FEE_RATE
} from '../constants';

/**
 * Calculates standard transaction fees for the Moroccan Market.
 * Includes Brokerage, Settlement, SBVC fees and VAT.
 */
export const calculateStandardFees = (grossAmount: number): number => {
    const brokerage = Math.max(grossAmount * BROKERAGE_RATE_HT, BROKERAGE_MIN_HT);
    const settlement = Math.max(grossAmount * SETTLEMENT_RATE_HT, SETTLEMENT_MIN_HT);
    const sbvc = grossAmount * SBVC_RATE_HT;

    const totalHT = brokerage + settlement + sbvc;
    return totalHT * (1 + VAT_RATE);
};

/**
 * Calculates TPCVM (Capital Gains Tax) for Moroccan stocks.
 * Currently 15% on the gain.
 */
export const calculateTaxOnGain = (gain: number): number => {
    if (gain <= 0) return 0;
    return gain * TPCVM_RATE;
};

/**
 * Calculates the break-even price for a holding.
 * Price where (Price * (1 - fee_rate)) = Cost Basis
 */
export const calculateBreakEvenPrice = (costBasis: number): number => {
    const denominator = 1 - ESTIMATED_TOTAL_FEE_RATE;
    if (denominator <= 0) return costBasis; // Guard against 100%+ fee rate
    return costBasis / denominator;
};
