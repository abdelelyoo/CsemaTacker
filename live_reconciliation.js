const fs = require('fs');

// Mock DateService
const DateService = {
    parse: (str) => {
        if (!str) return new Date(NaN);
        const parts = str.split(/[\/\-]/);
        if (parts.length === 3) {
            if (parts[2].length === 2) {
                return new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(str);
    }
};

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.toString().replace(/\"/g, '').replace(/\s?MAD/gi, '').trim();
    const lastComma = clean.lastIndexOf(',');
    const lastPeriod = clean.lastIndexOf('.');
    if (lastComma > lastPeriod) clean = clean.replace(/\./g, '').replace(',', '.');
    else clean = clean.replace(/,/g, '');
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

// Logic from portfolioCalc.ts (simplified for verification)
function calculatePortfolio(transactions, prices, fees = [], bankOps = []) {
    let cashBalance = 0;

    const hasBankDeposits = bankOps.some(op => op.Category === 'DEPOSIT');
    const hasBankWithdrawals = bankOps.some(op => op.Category === 'WITHDRAWAL');
    const hasBankDividends = bankOps.some(op => op.Category === 'DIVIDEND');
    const hasBankFees = bankOps.some(op => op.Category === 'BANK_FEE' || op.Category === 'CUSTODY' || op.Category === 'SUBSCRIPTION');

    transactions.forEach(tx => {
        const normalizedOp = tx.Operation.toLowerCase();
        const isCashOp = normalizedOp.includes('depot') || normalizedOp.includes('retrait') || normalizedOp.includes('dividende') || normalizedOp.includes('taxe') || normalizedOp.includes('frais');

        if (isCashOp) {
            const shouldSkip =
                (normalizedOp.includes('depot') && hasBankDeposits) ||
                (normalizedOp.includes('retrait') && hasBankWithdrawals) ||
                (normalizedOp.includes('dividende') && hasBankDividends) ||
                ((normalizedOp.includes('frais') || normalizedOp.includes('taxe')) && hasBankFees);

            if (!shouldSkip) {
                cashBalance += tx.Total;
            }
        } else {
            cashBalance += tx.Total;
        }
    });

    fees.forEach(f => cashBalance -= f.amount);

    bankOps.forEach(op => {
        if (op.Category === 'DEPOSIT' || op.Category === 'DIVIDEND') {
            cashBalance += Math.abs(op.Amount);
        } else if (op.Category === 'WITHDRAWAL' || op.Category === 'BANK_FEE' || op.Category === 'CUSTODY' || op.Category === 'SUBSCRIPTION') {
            cashBalance -= Math.abs(op.Amount);
        } else if (op.Category === 'TAX') {
            cashBalance += op.Amount; // Can be pos or neg
        }
    });

    return cashBalance;
}

// 1. Parse Portfolio CSV
const portfolioCsv = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8');
const pLines = portfolioCsv.split('\n').filter(l => l.trim());
const pHeaders = pLines[0].split(',').map(h => h.trim());
const transactions = pLines.slice(1).map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
    return {
        Operation: cols[3],
        Total: parseMadNumber(cols[7]),
        Fees: parseMadNumber(cols[8]),
        Tax: parseMadNumber(cols[9])
    };
});

// 2. Parse Bank Ops CSV
const bankCsv = fs.readFileSync('bank_operations_export_2026-02-26.csv', 'utf8');
const bLines = bankCsv.split('\n').filter(l => l.trim());
const bankOps = bLines.slice(1).map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
    return {
        Category: cols[2].toUpperCase(),
        Amount: parseMadNumber(cols[4])
    };
});

const result = calculatePortfolio(transactions, {}, [], bankOps);
console.log('--- ACTUAL APP LOGIC RESULT ---');
console.log('Cash Balance:', result);
console.log('Target:', 23.10);
console.log('Discrepancy:', result - 23.10);
