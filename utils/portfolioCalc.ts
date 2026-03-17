import { Transaction, BankOperation, Holding, PortfolioSummary, FeeRecord, CostMethod } from '../types';
import { TICKER_TO_SECTOR } from '../constants';
import { DateService } from '../services/dateService';
import { roundTo } from './helpers';
import { updateHoldingState, updateHoldingStateWithMethod, HoldingState, createEmptyHoldingState } from './holdingCalc';
import { buildPerformanceHistory } from './historyBuilder';
import { calculateBreakEvenPrice } from './feeLogic';
import { parseNumber } from './validation';
import { logger, logContext } from './logger';

export const splitTransactionsAndBankOps = (transactions: Transaction[]): {
  trades: Transaction[];
  bankOps: BankOperation[];
} => {
  const trades: Transaction[] = [];
  const bankOps: BankOperation[] = [];

  transactions.forEach(tx => {
    const op = tx.Operation.toLowerCase();

    if (op === 'achat' || op === 'buy' || op === 'vente' || op === 'sell') {
      trades.push(tx);
    } else if (op === 'depot' || op === 'retrait' || op === 'frais' || op === 'taxe' || op === 'dividende') {
      let category: BankOperation['Category'] = 'DEPOSIT';
      if (op === 'retrait') category = 'WITHDRAWAL';
      else if (op === 'frais') category = 'BANK_FEE';
      else if (op === 'taxe') category = 'TAX';
      else if (op === 'dividende') category = 'DIVIDEND';

      bankOps.push({
        Date: tx.Date,
        parsedDate: tx.parsedDate,
        Operation: tx.Operation as any,
        Description: tx.Company || '',
        Amount: tx.Total,
        Category: category,
        Reference: ''
      });
    }
  });

  return { trades, bankOps };
};

// --- Helper Functions Moved/Unified ---

// Used imported parseNumber instead of duplicate parseMadNumber

const getSectorForTicker = (ticker: string): string => TICKER_TO_SECTOR[ticker] || 'Unknown';

// --- Parser Logic (Kept here for now) ---

export const parseCSV = (csv: string): { transactions: Transaction[], errors: string[], warnings: string[] } => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return { transactions: [], errors: ['CSV file is empty or has no data rows'], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: Transaction[] = [];

  try {
    const headerLine = lines[0].trim();
    let delimiter = ',';
    if (headerLine.includes('\t')) delimiter = '\t';
    else if (headerLine.includes(';')) delimiter = ';';

    const headers = headerLine.split(delimiter).map(h => h.trim());

    const isOldFormat = headers.includes('Operation') && !headers.includes('Net Amount');
    const isNewFormat = headers.includes('Category') && headers.includes('Amount');
    const isComprehensiveFormat = headers.includes('Net Amount') && headers.includes('Realized P&L');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let values = line.split(delimiter);

      // If we have *more* columns than headers, it's very likely because
      // the last field (typically a MAD amount) contains thousand
      // separators using the same delimiter, e.g. "-1,010.00 MAD".
      // In that case we rebuild the last column by joining all remaining
      // segments so that "Total" keeps the full numeric string.
      if (values.length > headers.length) {
        const fixed: string[] = [];
        const lastHeaderIndex = headers.length - 1;

        for (let hIndex = 0; hIndex < headers.length; hIndex++) {
          if (hIndex < lastHeaderIndex) {
            fixed[hIndex] = values[hIndex];
          } else {
            fixed[hIndex] = values.slice(hIndex).join(delimiter);
            break;
          }
        }

        values = fixed;
      }

      // Strip quotes from values if present
      values = values.map(v => v.replace(/^["']|["']$/g, '').trim());

      if (values.length !== headers.length) {
        warnings.push(`Line ${i + 1}: Column count mismatch`);
        continue;
      }

      const raw: any = {};
      headers.forEach((h, index) => { raw[h] = values[index]?.trim() || ''; });

      try {
        const parsedDate = DateService.parse(raw.Date);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Line ${i + 1}: Invalid date format "${raw.Date}"`);
          continue;
        }

        if (isComprehensiveFormat) {
          const type = (raw.Type || '').toUpperCase();
          let operation = type === 'BUY' ? 'Achat' : type === 'SELL' ? 'Vente' : type;

          let total = parseNumber(raw['Net Amount']) || 0;
          if (operation === 'Achat' && total > 0) total = -total;
          if ((operation === 'Frais' || operation === 'Taxe') && total > 0) total = -total;

          const realizedPL = parseNumber(raw['Realized P&L']) || 0;
          const taxFromCSV = parseNumber(raw['TPCVM']) ?? parseNumber(raw['Tax']) ?? 0;
          const calculatedTax = (operation === 'Vente' || operation === 'Sell') && realizedPL > 0 ? realizedPL * 0.15 : taxFromCSV;

          transactions.push({
            Date: raw.Date,
            Company: raw.Ticker || '',
            ISIN: '',
            Operation: operation,
            Ticker: raw.Ticker || '',
            Qty: parseNumber(raw.Qty) || 0,
            Price: parseNumber(raw.Price) || 0,
            Total: total,
            Fees: parseNumber(raw.Fees),
            Tax: calculatedTax,
            RealizedPL: realizedPL,
            parsedDate
          });
        } else if (isOldFormat) {
          let total = parseNumber(raw.Total) || 0;
          const operation = raw.Operation || '';
          const op = operation.toLowerCase();
          // Convert positive fees/taxes to negative (money OUT)
          if ((op.includes('frais') || op.includes('taxe') || op.includes('cus')) && total > 0) {
            total = -total;
          }
          transactions.push({
            Date: raw.Date,
            Company: raw.Company || '',
            ISIN: raw.ISIN || '',
            Operation: raw.Operation,
            Ticker: raw.Ticker || '',
            Qty: parseNumber(raw.Qty) || 0,
            Price: parseNumber(raw.Price) || 0,
            Total: total,
            Fees: parseNumber(raw.Fees),
            Tax: parseNumber(raw.Tax),
            parsedDate
          });
        } else if (isNewFormat) {
          let op = raw.Category?.toLowerCase().includes('deposit') ? 'Depot' : 'Unknown';
          transactions.push({
            Date: raw.Date,
            Company: raw.Description || '',
            ISIN: '',
            Operation: op,
            Ticker: raw.Ticker || '',
            Qty: parseNumber(raw.Qty) || 0,
            Price: parseNumber(raw.Price) || 0,
            Total: parseNumber(raw.Amount) || 0,
            parsedDate
          });
        }
      } catch (lineError) {
        errors.push(`Line ${i + 1}: Error - ${(lineError as Error).message}`);
      }
    }

    return {
      transactions: transactions.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()),
      errors,
      warnings
    };
  } catch (error) {
    return { transactions: [], errors: [(error as Error).message], warnings: [] };
  }
};

// --- Main Portfolio Calculation ---

export const calculatePortfolio = (
  transactions: Transaction[],
  currentPrices: Record<string, number> = {},
  fees: FeeRecord[] = [],
  bankOperations: BankOperation[] = [],
  costMethod: CostMethod = 'WAC'
): PortfolioSummary => {
  const holdingsMap = new Map<string, HoldingState>();

  let cashBalance = 0;
  let totalRealizedPL = 0;
  let totalDividends = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalTaxRefunds = 0;
  let totalTradingFees = 0;
  let totalCustodyFees = 0;
  let totalSubscriptionFees = 0;
  let totalBankFees = 0;
  let netTaxImpact = 0;
  const enrichedTransactions: Transaction[] = [];

  // Ensure transactions are processed in strict chronological and logical order
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
    if (timeDiff !== 0) return timeDiff;

    // Same-day priority: Depot > Achat > (Others like Dividende) > Vente
    const getPriority = (op: string) => {
      const o = op.toLowerCase();
      if (o === 'depot') return 0;
      if (o === 'achat' || o === 'buy') return 1;
      if (o === 'vente' || o === 'sell') return 3;
      return 2;
    };
    return getPriority(a.Operation) - getPriority(b.Operation);
  });

  // Process transactions chronologically
  sortedTransactions.forEach(tx => {
    const ticker = tx.Ticker;
    const op = tx.Operation.toLowerCase();

    if (op === 'achat' || op === 'buy' || op === 'vente' || op === 'sell') {
      if (!holdingsMap.has(ticker)) {
        holdingsMap.set(ticker, createEmptyHoldingState(ticker, tx.Company));
      }

      const { realizedPL, fees, tax } = updateHoldingStateWithMethod(holdingsMap.get(ticker)!, tx, { costMethod });

      totalRealizedPL += realizedPL;
      totalTradingFees += fees;
      netTaxImpact += tax; // Accrue as positive cost

      // Handle Buy/Sell cash flow direction (transactions stored as positive)
      const isBuy = op === 'achat' || op === 'buy';
      const isSell = op === 'vente' || op === 'sell';
      if (isBuy) {
        cashBalance -= Math.abs(tx.Total); // Money OUT
      } else if (isSell) {
        cashBalance += Math.abs(tx.Total); // Money IN
      }

      // Add enriched transaction
      enrichedTransactions.push({
        ...tx,
        Fees: tx.Fees !== undefined ? tx.Fees : fees,
        Tax: tx.Tax !== undefined ? tx.Tax : tax,
        RealizedPL: realizedPL
      });
    } else {
      // Non-Trade Transactions (Depot, Retrait, Dividende, Frais, Taxe, etc.)
      // Skip if these have been migrated to separate tables (bank_operations/fees)
      // to avoid double counting
      const normalizedOp = op.replace(/\s+/g, ' ').trim();
      const isCashOp =
        normalizedOp.includes('depot') ||
        normalizedOp.includes('retrait') ||
        normalizedOp.includes('dividende') ||
        normalizedOp.includes('frais') ||
        normalizedOp.includes('taxe');

      // Only skip if bankOperations covers this category, to avoid double counting
      const hasBankOps = bankOperations && bankOperations.length > 0;

      if (isCashOp && hasBankOps) {
        // Check if this specific type has entries in bankOperations
        // If bank_operations has entries for deposits/withdrawals/dividends/fees/taxes,
        // we assume those tables are the source of truth and skip duplicates from transactions
        const hasBankDeposits = bankOperations.some(bo => bo.Category === 'DEPOSIT');
        const hasBankWithdrawals = bankOperations.some(bo => bo.Category === 'WITHDRAWAL');
        const hasBankDividends = bankOperations.some(bo => bo.Category === 'DIVIDEND');
        const hasBankFees = bankOperations.some(bo =>
          bo.Category === 'BANK_FEE' ||
          bo.Category === 'TAX' ||
          bo.Category === 'CUSTODY' ||
          bo.Category === 'SUBSCRIPTION'
        );

        const shouldSkip =
          (normalizedOp.includes('depot') && hasBankDeposits) ||
          (normalizedOp.includes('retrait') && hasBankWithdrawals) ||
          (normalizedOp.includes('dividende') && hasBankDividends) ||
          ((normalizedOp.includes('frais') || normalizedOp.includes('taxe') || normalizedOp.includes('cus') || normalizedOp.includes('sub')) && hasBankFees);

        if (shouldSkip) {
          return; // Skip — bank_operations table handles these
        }
      }

      // Process from transactions (either no bankOps or category not migrated)
      if (normalizedOp.includes('depot')) {
        cashBalance += Math.abs(tx.Total);
        totalDeposits += Math.abs(tx.Total);
      } else if (normalizedOp.includes('retrait')) {
        cashBalance -= Math.abs(tx.Total);
        totalWithdrawals += Math.abs(tx.Total);
      } else if (normalizedOp.includes('dividende')) {
        cashBalance += Math.abs(tx.Total);
        totalDividends += Math.abs(tx.Total);
      } else {
        // Fees/taxes/other: use existing classification logic
        const tickerLower = (tx.Ticker || '').toLowerCase().trim();
        const companyLower = (tx.Company || '').toLowerCase().trim();

        const isSubscription = tickerLower.includes('sub') || normalizedOp.includes('sub');
        const isBankFee = !isSubscription && (
          normalizedOp.includes('frais') &&
          (tickerLower === 'bank' || tickerLower === 'cus' || tickerLower.includes('bank') || companyLower.includes('bank'))
        );
        const isTax = !isSubscription && (normalizedOp.includes('taxe') || normalizedOp.includes('tpcvm'));

        cashBalance += tx.Total;

        if (isBankFee) {
          totalCustodyFees += Math.abs(tx.Total);
        } else if (isTax) {
          netTaxImpact += Math.abs(tx.Total);
        }
      }

      enrichedTransactions.push({
        ...tx,
        Fees: tx.Fees || 0,
        Tax: tx.Tax || 0,
        RealizedPL: 0
      });
    }
  });

  // --- Process Separate Fees (CUS / SUB) ---
  fees.forEach(fee => {
    // Reduce cash balance (fees are outflows)
    cashBalance -= fee.amount;

    if (fee.type === 'CUS') {
      totalCustodyFees += fee.amount;
    } else if (fee.type === 'SUB') {
      totalSubscriptionFees += fee.amount;
    }
  });

  // --- Process Bank Operations (Depot/Retrait/Frais/Taxe/Dividende) ---

  bankOperations.forEach(op => {
    const category = op.Category as string;
    // Handle cash flow direction based on category
    switch (category) {
      case 'DEPOSIT':
        totalDeposits += Math.abs(op.Amount);
        cashBalance += Math.abs(op.Amount); // Money IN
        break;
      case 'WITHDRAWAL':
        totalWithdrawals += Math.abs(op.Amount);
        cashBalance -= Math.abs(op.Amount); // Money OUT
        break;
      case 'DIVIDEND':
        totalDividends += Math.abs(op.Amount);
        cashBalance += Math.abs(op.Amount); // Money IN
        break;
      case 'TAX':
        netTaxImpact -= op.Amount;
        // TAX can be negative (payment/refund from tax authority) or positive (refund received)
        // Negative amount = money OUT (tax paid), Positive = money IN (refund received)
        if (op.Amount > 0) {
          totalTaxRefunds += op.Amount;
        }
        cashBalance += op.Amount;
        break;
      case 'CUSTODY':
      case 'BANK_FEE': // Added CUSTODY/SUBSCRIPTION here for correctness if they appear in bankOperations
        totalBankFees += Math.abs(op.Amount);
        cashBalance -= Math.abs(op.Amount); // Money OUT (fee paid)
        break;
      case 'SUBSCRIPTION':
        totalSubscriptionFees += Math.abs(op.Amount);
        cashBalance -= Math.abs(op.Amount); // Money OUT (subscription fee paid)
        break;
    }
  });

  // Debug logging for cash flow components (dev only)
  logger.debug(logContext.PORTFOLIO, 'Calculation summary', {
    totalDeposits,
    totalWithdrawals,
    totalDividends,
    netTaxImpact,
    totalBankFees,
    totalCustodyFees,
    totalSubscriptionFees,
    finalCashBalance: cashBalance
  });

  // Calculate History using dedicated builder
  const history = buildPerformanceHistory(transactions, currentPrices, bankOperations, fees, costMethod);

  // Final Results Construction
  const holdings: Holding[] = [];
  let totalValue = 0;
  let totalCost = 0;

  holdingsMap.forEach((data, ticker) => {
    if (data.qty > 0.001) {
      const price = currentPrices[ticker] !== undefined ? currentPrices[ticker] : data.lastPrice;
      const marketValue = roundTo(data.qty * price, 2);
      const totalHoldCost = roundTo(data.qty * data.costBasis, 2);
      const unrealizedPL = roundTo(marketValue - totalHoldCost, 2);

      totalValue += marketValue;
      totalCost += totalHoldCost;

      holdings.push({
        ticker,
        company: data.company,
        sector: getSectorForTicker(ticker),
        quantity: data.qty,
        averageCost: data.costBasis,
        averagePrice: data.avgPrice,
        currentPrice: price,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent: totalHoldCost > 0 ? (unrealizedPL / totalHoldCost) * 100 : 0,
        allocation: 0,
        transactionCount: data.txCount,
        breakEvenPrice: calculateBreakEvenPrice(data.costBasis),
        buyVWAP: data.totalBuyQty > 0 ? roundTo(data.totalBuyCost / data.totalBuyQty, 2) : 0,
        buyVolume: data.totalBuyQty,
        sellVWAP: data.totalSellQty > 0 ? roundTo(data.totalSellProceeds / data.totalSellQty, 2) : 0,
        sellVolume: data.totalSellQty
      });
    }
  });

  // Calculate allocations
  holdings.forEach(h => {
    h.allocation = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
  });

  holdings.sort((a, b) => b.allocation - a.allocation);

  return {
    totalValue: roundTo(totalValue, 2),
    totalCost: roundTo(totalCost, 2),
    totalRealizedPL: roundTo(totalRealizedPL, 2),
    totalUnrealizedPL: roundTo(totalValue - totalCost, 2),
    totalDividends: roundTo(totalDividends, 2),
    totalDeposits: roundTo(totalDeposits, 2),
    totalWithdrawals: roundTo(totalWithdrawals, 2),
    totalTaxRefunds: roundTo(totalTaxRefunds, 2),
    totalTradingFees: roundTo(totalTradingFees, 2),
    totalCustodyFees: roundTo(totalCustodyFees, 2),
    totalSubscriptionFees: roundTo(totalSubscriptionFees, 2),
    totalBankFees: roundTo(totalBankFees, 2),
    netTaxImpact: roundTo(netTaxImpact, 2),
    holdings,
    cashBalance: roundTo(cashBalance, 2),
    history,
    enrichedTransactions,
    bankOperations
  };
};
