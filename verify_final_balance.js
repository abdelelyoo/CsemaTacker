const fs = require('fs');

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.toString().replace(/\s?MAD/gi, '').trim();
    // Handle Moroccan format (trailing commas for decimals)
    const lastComma = clean.lastIndexOf(',');
    const lastPeriod = clean.lastIndexOf('.');

    if (lastComma > lastPeriod) {
        // Comma is likely the decimal separator (Moroccan)
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (lastPeriod > lastComma) {
        // Period is the decimal separator
        clean = clean.replace(/,/g, '');
    } else if (lastComma !== -1) {
        // Only comma exists
        const parts = clean.split(',');
        if (parts[1].length === 3) clean = clean.replace(',', ''); // Thousands separator
        else clean = clean.replace(',', '.'); // Decimal separator
    }

    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

function parseCSVLine(line) {
    const cols = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            cols.push(currentField.trim().replace(/^"|"$/g, ''));
            currentField = '';
        } else currentField += char;
    }
    cols.push(currentField.trim().replace(/^"|"$/g, ''));
    return cols;
}

const portfolioCsv = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8');
const portfolioLines = portfolioCsv.split('\n').filter(l => l.trim());
const bankCsv = fs.readFileSync('bank_operations_export_2026-02-26.csv', 'utf8');
const bankLines = bankCsv.split('\n').filter(l => l.trim());

let totalBuysSells = 0;
let totalDeposits = 0;
let totalDividends = 0;
let totalTaxes = 0;
let totalBankFees = 0;

console.log('--- Transactions (atlas_portfolio_export_2026-02-26.csv) ---');
for (let i = 1; i < portfolioLines.length; i++) {
    const cols = parseCSVLine(portfolioLines[i]);
    if (cols.length < 8) continue;
    const op = cols[3].toLowerCase();
    const total = parseMadNumber(cols[7]);

    if (op === 'depot' || op === 'dpt') {
        // We track deposits from the bank ops file mostly, 
        // but let's see if this file has them too.
        // totalDeposits += total; 
    } else {
        totalBuysSells += total;
    }
}

console.log('Net Trades (Buys + Sells + Trade-indexed Dividends/Fees):', totalBuysSells);

console.log('\n--- Bank Operations (bank_operations_export_2026-02-26.csv) ---');
for (let i = 1; i < bankLines.length; i++) {
    const cols = parseCSVLine(bankLines[i]);
    if (cols.length < 5) continue;
    const cat = cols[2].toUpperCase();
    const amount = parseMadNumber(cols[4]);

    if (cat === 'DEPOSIT') {
        totalDeposits += amount;
    } else if (cat === 'DIVIDEND') {
        totalDividends += amount;
    } else if (cat === 'TAX') {
        totalTaxes += amount;
    } else if (cat === 'CUSTODY' || cat === 'BANK_FEE') {
        totalBankFees += amount;
    }
}

console.log('Total Deposits:', totalDeposits);
console.log('Total Dividends:', totalDividends);
console.log('Total Taxes (Refunds):', totalTaxes);
console.log('Total Bank Fees:', totalBankFees);

const finalBalance = totalBuysSells + totalDeposits + totalDividends + totalTaxes + totalBankFees;
console.log('\n====================================');
console.log('FINAL CALCULATED CASH BALANCE:', finalBalance);
console.log('====================================');
