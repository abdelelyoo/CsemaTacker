import {
  BROKERAGE_RATE_HT,
  BROKERAGE_MIN_HT,
  SETTLEMENT_RATE_HT,
  SETTLEMENT_MIN_HT,
  SBVC_RATE_HT,
  VAT_RATE,
  TPCVM_RATE,
  DIVIDEND_TAX_RATE,
  ESTIMATED_TOTAL_FEE_RATE
} from '../constants';
import { roundTo } from './helpers';

export interface FeeBreakdown {
  brokerage: number;
  settlement: number;
  sbvc: number;
  vat: number;
  total: number;
}

export interface TaxBreakdown {
  grossGain: number;
  taxRate: number;
  taxAmount: number;
}

export interface DividendTaxBreakdown {
  grossDividend: number;
  withholdingTax: number;
  netDividend: number;
  effectiveRate: number;
}

export interface FeeCalculationOptions {
  amount: number;
  isBuy?: boolean;
  isSell?: boolean;
  isDividend?: boolean;
  customBrokerageRate?: number;
  customSettlementRate?: number;
  customSBVCRate?: number;
}

export const calculateBrokerageFee = (amount: number, customRate?: number): number => {
  const rate = customRate || BROKERAGE_RATE_HT;
  return Math.max(amount * rate, BROKERAGE_MIN_HT);
};

export const calculateSettlementFee = (amount: number, customRate?: number): number => {
  const rate = customRate || SETTLEMENT_RATE_HT;
  return Math.max(amount * rate, SETTLEMENT_MIN_HT);
};

export const calculateSBVCFee = (amount: number, customRate?: number): number => {
  const rate = customRate || SBVC_RATE_HT;
  return amount * rate;
};

export const calculateVAT = (amount: number): number => {
  return amount * VAT_RATE;
};

export const calculateTradingFees = (
  grossAmount: number,
  options: Pick<FeeCalculationOptions, 'customBrokerageRate' | 'customSettlementRate' | 'customSBVCRate'> = {}
): FeeBreakdown => {
  const brokerage = calculateBrokerageFee(grossAmount, options.customBrokerageRate);
  const settlement = calculateSettlementFee(grossAmount, options.customSettlementRate);
  const sbvc = calculateSBVCFee(grossAmount, options.customSBVCRate);
  
  const subtotal = brokerage + settlement + sbvc;
  const vat = calculateVAT(subtotal);
  const total = subtotal + vat;

  return {
    brokerage: roundTo(brokerage, 2),
    settlement: roundTo(settlement, 2),
    sbvc: roundTo(sbvc, 2),
    vat: roundTo(vat, 2),
    total: roundTo(total, 2)
  };
};

export const calculateCapitalGainsTax = (gain: number): TaxBreakdown => {
  if (gain <= 0) {
    return {
      grossGain: gain,
      taxRate: 0,
      taxAmount: 0
    };
  }

  const taxAmount = gain * TPCVM_RATE;

  return {
    grossGain: roundTo(gain, 2),
    taxRate: TPCVM_RATE,
    taxAmount: roundTo(taxAmount, 2)
  };
};

export const calculateDividendTax = (dividendAmount: number): DividendTaxBreakdown => {
  const withholdingTax = dividendAmount * DIVIDEND_TAX_RATE;
  const netDividend = dividendAmount - withholdingTax;

  return {
    grossDividend: roundTo(dividendAmount, 2),
    withholdingTax: roundTo(withholdingTax, 2),
    netDividend: roundTo(netDividend, 2),
    effectiveRate: DIVIDEND_TAX_RATE
  };
};

export const calculateTotalTransactionCost = (
  grossAmount: number,
  isSell: boolean,
  gain?: number
): { fees: FeeBreakdown; tax?: TaxBreakdown; total: number } => {
  const fees = calculateTradingFees(grossAmount);
  
  let total = fees.total;
  let tax: TaxBreakdown | undefined;

  if (isSell && gain !== undefined) {
    tax = calculateCapitalGainsTax(gain);
    total += tax.taxAmount;
  }

  return {
    fees,
    tax,
    total: roundTo(total, 2)
  };
};

export const calculateNetProceeds = (
  quantity: number,
  pricePerShare: number,
  includeTax: boolean = false
): { grossProceeds: number; fees: number; tax: number; netProceeds: number } => {
  const grossProceeds = quantity * pricePerShare;
  const { fees, tax } = calculateTotalTransactionCost(grossProceeds, true);
  
  const netProceeds = includeTax && tax
    ? grossProceeds - fees.total - tax.taxAmount
    : grossProceeds - fees.total;

  return {
    grossProceeds: roundTo(grossProceeds, 2),
    fees: fees.total,
    tax: tax?.taxAmount || 0,
    netProceeds: roundTo(netProceeds, 2)
  };
};

export const calculateCostBasis = (
  quantity: number,
  pricePerShare: number,
  includeFees: boolean = true
): { grossCost: number; fees: number; totalCost: number } => {
  const grossCost = quantity * pricePerShare;
  const fees = includeFees ? calculateTradingFees(grossCost).total : 0;

  return {
    grossCost: roundTo(grossCost, 2),
    fees: roundTo(fees, 2),
    totalCost: roundTo(grossCost + fees, 2)
  };
};

export const calculateAllFees = (
  transactions: Array<{ type: 'buy' | 'sell' | 'dividend'; amount: number; gain?: number }>
): { totalTradingFees: number; totalTax: number; totalDividendTax: number } => {
  let totalTradingFees = 0;
  let totalTax = 0;
  let totalDividendTax = 0;

  for (const tx of transactions) {
    if (tx.type === 'dividend') {
      totalDividendTax += calculateDividendTax(tx.amount).withholdingTax;
    } else {
      const { fees, tax } = calculateTotalTransactionCost(tx.amount, tx.type === 'sell', tx.gain);
      totalTradingFees += fees.total;
      totalTax += tax?.taxAmount || 0;
    }
  }

  return {
    totalTradingFees: roundTo(totalTradingFees, 2),
    totalTax: roundTo(totalTax, 2),
    totalDividendTax: roundTo(totalDividendTax, 2)
  };
};

export const formatFee = (amount: number): string => {
  return `${amount.toFixed(2)} MAD`;
};

export const formatFeePercentage = (rate: number): string => {
  return `${(rate * 100).toFixed(2)}%`;
};
