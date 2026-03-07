
import fs from 'fs';

const parseMadNumber = (str) => {
    if (str === undefined || str === null || str === '') return 0;
    let clean = str.trim().replace(/"/g, '').replace(/\s?MAD/gi, '').trim();
    if (clean === '' || clean === '-') return 0;

    const lastComma = clean.lastIndexOf(',');
    const lastPeriod = clean.lastIndexOf('.');

    if (lastComma > lastPeriod) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (lastPeriod > lastComma) {
        clean = clean.replace(/,/g, '');
    } else if (lastComma !== -1) {
        const parts = clean.split(',');
        if (parts[1].length === 3 && parts[0].length >= 1) {
            clean = clean.replace(',', '');
        } else {
            clean = clean.replace(',', '.');
        }
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
};

const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headerLine = lines[0].trim();
    const delimiter = ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        let values = line.split(delimiter);
        if (values.length > headers.length) {
            const fixed = [];
            const lastHeaderIndex = headers.length - 1;
            for (let hIndex = 0; hIndex < headers.length; hIndex++) {
                if (hIndex < lastHeaderIndex) fixed[hIndex] = values[hIndex];
                else fixed[hIndex] = values.slice(hIndex).join(delimiter);
            }
            values = fixed;
        }
        const raw = {};
        headers.forEach((h, index) => {
            raw[h] = (values[index] || '').trim().replace(/^"|"$/g, '');
        });
        data.push(raw);
    }
    return data;
};

const portfolioCsv = fs.readFileSync('C:/Users/ABDEL/Desktop/my apps/AtlasPortfMager/atlas_portfolio_export_2026-02-26.csv', 'utf8');
const bankCsv = fs.readFileSync('C:/Users/ABDEL/Desktop/my apps/AtlasPortfMager/bank_operations_export_2026-02-26.csv', 'utf8');

const rawTrades = parseCSV(portfolioCsv);
const rawBankOps = parseCSV(bankCsv);

let cashBalance = 0;
let totalDeposits = 0;
let totalWithdrawals = 0;
let totalSells = 0;
let totalBuys = 0;
let totalDividends = 0;
let totalTaxes = 0;
let totalFees = 0;

const bankOps = rawBankOps.map(op => ({
    Category: op.Category,
    Amount: parseMadNumber(op.Amount),
    Operation: op.Type || op.Operation
}));

const hasBankDeposits = bankOps.some(bo => bo.Category === 'DEPOSIT');
const hasBankWithdrawals = bankOps.some(bo => bo.Category === 'WITHDRAWAL');
const hasBankDividends = bankOps.some(bo => bo.Category === 'DIVIDEND');
const hasBankFees = bankOps.some(bo => bo.Category === 'BANK_FEE' || bo.Category === 'TAX' || bo.Category === 'CUSTODY');

rawTrades.forEach((tx, idx) => {
    const op = (tx.Operation || '').toLowerCase();
    const ticker = tx.Ticker;
    const total = parseMadNumber(tx.Total);

    if (op === 'achat' || op === 'buy') {
        cashBalance -= Math.abs(total);
        totalBuys += Math.abs(total);
    } else if (op === 'vente' || op === 'sell') {
        cashBalance += Math.abs(total);
        totalSells += Math.abs(total);
    } else {
        const normalizedOp = op.replace(/\s+/g, ' ').trim();
        const isCashOp = normalizedOp.includes('depot') || normalizedOp.includes('retrait') || normalizedOp.includes('dividende') || normalizedOp.includes('frais') || normalizedOp.includes('taxe');

        if (isCashOp) {
            // PORTING THE BUG: (normalizedOp.includes('retrait') || hasBankWithdrawals)
            const shouldSkip =
                (normalizedOp.includes('depot') && hasBankDeposits) ||
                (normalizedOp.includes('retrait') || hasBankWithdrawals) ||
                (normalizedOp.includes('dividende') && hasBankDividends) ||
                ((normalizedOp.includes('frais') || normalizedOp.includes('taxe')) && hasBankFees);

            if (!shouldSkip) {
                if (normalizedOp.includes('depot')) {
                    cashBalance += Math.abs(total);
                    totalDeposits += Math.abs(total);
                } else if (normalizedOp.includes('retrait')) {
                    cashBalance -= Math.abs(total);
                    totalWithdrawals += Math.abs(total);
                } else if (normalizedOp.includes('dividende')) {
                    cashBalance += Math.abs(total);
                    totalDividends += Math.abs(total);
                } else {
                    cashBalance += total;
                    if (normalizedOp.includes('taxe')) totalTaxes += total;
                    else totalFees += Math.abs(total);
                }
            } else {
                // console.log(`Skipping trade cash op: ${tx.Operation} ${total}`);
            }
        }
    }
});

bankOps.forEach(op => {
    const amount = op.Amount;
    const cat = op.Category;

    switch (cat) {
        case 'DEPOSIT':
            totalDeposits += Math.abs(amount);
            cashBalance += Math.abs(amount);
            break;
        case 'WITHDRAWAL':
            totalWithdrawals += Math.abs(amount);
            cashBalance -= Math.abs(amount);
            break;
        case 'DIVIDEND':
            totalDividends += Math.abs(amount);
            cashBalance += Math.abs(amount);
            break;
        case 'TAX':
            totalTaxes += amount;
            cashBalance += amount;
            break;
        case 'BANK_FEE':
        case 'CUSTODY':
        case 'SUBSCRIPTION':
            totalFees += Math.abs(amount);
            cashBalance -= Math.abs(amount);
            break;
    }
});

console.log('--- Results ---');
console.log('Total Deposits:', totalDeposits.toFixed(2));
console.log('Total Sells:', totalSells.toFixed(2));
console.log('Total Buys:', totalBuys.toFixed(2));
console.log('Total Dividends:', totalDividends.toFixed(2));
console.log('Total Taxes:', totalTaxes.toFixed(2));
console.log('Total Fees:', totalFees.toFixed(2));
console.log('Withdrawals:', totalWithdrawals.toFixed(2));
console.log('Final Cash Balance:', cashBalance.toFixed(2));

const check = totalDeposits + totalSells + totalDividends + totalTaxes - totalBuys - totalFees - totalWithdrawals;
console.log('Check Sum:', check.toFixed(2));
