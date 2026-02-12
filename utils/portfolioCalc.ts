import { Transaction, Holding, PortfolioSummary, FeeRecord } from '../types';
import { TICKER_TO_SECTOR } from '../constants';
import { DateService } from '../services/dateService';
import { roundTo } from './helpers';
import { updateHoldingState, HoldingState } from './holdingCalc';
import { buildPerformanceHistory } from './historyBuilder';
import { calculateBreakEvenPrice } from './feeLogic';

// --- Helper Functions Moved/Unified ---

const parseMadNumber = (str: string | undefined): number | undefined => {
  if (str === undefined || str === null || str === '') return undefined;
  let clean = str.trim().replace(/\s?MAD/gi, '').trim();
  if (clean === '' || clean === '-') return 0;

  // Decision logic for decimal separator:
  const lastComma = clean.lastIndexOf(',');
  const lastPeriod = clean.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // European style: 1.234,56 -> 1234.56
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (lastPeriod > lastComma) {
    // US style: 1,234.56 -> 1234.56
    clean = clean.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Single comma: Could be decimal or thousands.
    // If it's followed by exactly 3 digits (e.g. 1,000), and there's more than 1 digit before it,
    // it's likely a thousands separator.
    const parts = clean.split(',');
    if (parts[1].length === 3 && parts[0].length >= 1) {
      clean = clean.replace(',', '');
    } else {
      clean = clean.replace(',', '.');
    }
  }

  // Remove any remaining non-numeric chars except minus and period
  clean = clean.replace(/[^0-9.-]/g, '');

  const result = parseFloat(clean);
  return isNaN(result) ? undefined : result;
};

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

          let total = parseMadNumber(raw['Net Amount']) || 0;
          if (operation === 'Achat' && total > 0) total = -total;
          if ((operation === 'Frais' || operation === 'Taxe') && total > 0) total = -total;

          transactions.push({
            Date: raw.Date,
            Company: raw.Ticker || '',
            ISIN: '',
            Operation: operation,
            Ticker: raw.Ticker || '',
            Qty: parseMadNumber(raw.Qty) || 0,
            Price: parseMadNumber(raw.Price) || 0,
            Total: total,
            Fees: parseMadNumber(raw.Fees),
            Tax: parseMadNumber(raw.Tax),
            RealizedPL: parseMadNumber(raw['Realized P&L']),
            parsedDate
          });
        } else if (isOldFormat) {
          transactions.push({
            Date: raw.Date,
            Company: raw.Company || '',
            ISIN: raw.ISIN || '',
            Operation: raw.Operation,
            Ticker: raw.Ticker || '',
            Qty: parseMadNumber(raw.Qty) || 0,
            Price: parseMadNumber(raw.Price) || 0,
            Total: parseMadNumber(raw.Total) || 0,
            Fees: parseMadNumber(raw.Fees),
            Tax: parseMadNumber(raw.Tax),
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
            Qty: parseMadNumber(raw.Qty) || 0,
            Price: parseMadNumber(raw.Unit_Price) || 0,
            Total: parseMadNumber(raw.Amount) || 0,
            parsedDate
          });
        }
      } catch (lineError) {
        errors.push(`Line ${i + 1}: Error - ${lineError.message}`);
      }
    }

    return {
      transactions: transactions.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()),
      errors,
      warnings
    };
  } catch (error) {
    return { transactions: [], errors: [error.message], warnings: [] };
  }
};

// --- Main Portfolio Calculation ---

export const calculatePortfolio = (transactions: Transaction[], currentPrices: Record<string, number> = {}, fees: FeeRecord[] = []): PortfolioSummary => {
  const holdingsMap = new Map<string, HoldingState>();

  let cashBalance = 0;
  let totalRealizedPL = 0;
  let totalDividends = 0;
  let totalDeposits = 0;
  let totalTradingFees = 0;
  let totalCustodyFees = 0;
  let totalSubscriptionFees = 0;
  let netTaxImpact = 0;
  const enrichedTransactions: Transaction[] = [];

  // Process transactions chronologically
  transactions.forEach(tx => {
    const ticker = tx.Ticker;
    const op = tx.Operation.toLowerCase();

    if (op === 'achat' || op === 'buy' || op === 'vente' || op === 'sell') {
      if (!holdingsMap.has(ticker)) {
        holdingsMap.set(ticker, {
          qty: 0,
          costBasis: 0,
          avgPrice: 0,
          lastPrice: 0,
          company: tx.Company,
          txCount: 0,
          totalBuyCost: 0,
          totalBuyQty: 0,
          totalSellProceeds: 0,
          totalSellQty: 0
        });
      }

      const { realizedPL, fees, tax } = updateHoldingState(holdingsMap.get(ticker)!, tx);

      totalRealizedPL += realizedPL;
      totalTradingFees += fees;
      netTaxImpact += tax; // Accrue as positive cost
      cashBalance += tx.Total;

      // Add enriched transaction
      enrichedTransactions.push({
        ...tx,
        Fees: tx.Fees !== undefined ? tx.Fees : fees,
        Tax: tx.Tax !== undefined ? tx.Tax : tax,
        RealizedPL: realizedPL
      });
    } else {
      // Non-Trade Transactions (Depot, Retrait, Dividende, Frais, Taxe, etc.)
      const normalizedOp = op.replace(/\s+/g, ' ').trim();
      const tickerLower = (tx.Ticker || '').toLowerCase().trim();
      const companyLower = (tx.Company || '').toLowerCase().trim();

      // 1. Classification
      // Deprecated auto detection for SUB/CUS from transactions if we are moving to separate table,
      // but keeping it for backward compatibility if user mixes methods or for old data.
      // However, user asked for separated table.

      const isSubscription = tickerLower.includes('sub') || normalizedOp.includes('sub');
      const isBankFee = !isSubscription && (
        normalizedOp.includes('frais') &&
        (tickerLower === 'bank' || tickerLower === 'cus' || tickerLower.includes('bank') || companyLower.includes('bank'))
      );
      const isTax = !isSubscription && (normalizedOp.includes('taxe') || normalizedOp.includes('tpcvm'));

      // 2. State Updates
      cashBalance += tx.Total;

      if (isBankFee) {
        totalCustodyFees += Math.abs(tx.Total);
      } else if (isTax) {
        netTaxImpact += Math.abs(tx.Total);
      } else if (normalizedOp.includes('dividende')) {
        totalDividends += tx.Total;
      } else if (normalizedOp.includes('depot') || normalizedOp.includes('retrait')) {
        totalDeposits += tx.Total;
      }

      enrichedTransactions.push(tx);
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

  // Calculate History using dedicated builder
  const history = buildPerformanceHistory(transactions, currentPrices);

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
    totalTradingFees: roundTo(totalTradingFees, 2),
    totalCustodyFees: roundTo(totalCustodyFees, 2),
    totalSubscriptionFees: roundTo(totalSubscriptionFees, 2),
    netTaxImpact: roundTo(netTaxImpact, 2),
    holdings,
    cashBalance: roundTo(cashBalance, 2),
    history,
    enrichedTransactions
  };
};
