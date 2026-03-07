const fs = require('fs');

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.replace(/\"/g, '').trim();
    const lastComma = clean.lastIndexOf(',');
    const lastPeriod = clean.lastIndexOf('.');
    if (lastComma > lastPeriod) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (lastPeriod > lastComma) {
        clean = clean.replace(/,/g, '');
    } else if (lastComma !== -1) {
        const parts = clean.split(',');
        if (parts[1].length === 3) clean = clean.replace(',', '');
        else clean = clean.replace(',', '.');
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

// Actual Logic from portfolioCalc.ts (Simplified but accurate to the bug)
function calculateReplication(transactions, bankOperations) {
    let cashBalance = 0;

    const hasBankDeposits = bankOperations.some(bo => bo.Category === 'DEPOSIT');
    const hasBankWithdrawals = bankOperations.some(bo => bo.Category === 'WITHDRAWAL');
    const hasBankDividends = bankOperations.some(bo => bo.Category === 'DIVIDEND');
    const hasBankFees = bankOperations.some(
        bo => bo.Category === 'BANK_FEE' || bo.Category === 'TAX' ||
            bo.Category === 'CUSTODY' || bo.Category === 'SUBSCRIPTION'
    );

    transactions.forEach(tx => {
        const op = tx.Operation.toLowerCase();
        if (op === 'achat' || op === 'buy' || op === 'vente' || op === 'sell') {
            const val = Math.abs(tx.Total);
            if (op === 'achat' || op === 'buy') cashBalance -= val;
            else cashBalance += val;
        } else {
            const normalizedOp = op.replace(/\s+/g, ' ').trim();
            const shouldSkip =
                (normalizedOp.includes('depot') && hasBankDeposits) ||
                (normalizedOp.includes('retrait') && hasBankWithdrawals) ||
                (normalizedOp.includes('dividende') && hasBankDividends) ||
                ((normalizedOp.includes('frais') || normalizedOp.includes('taxe') ||
                    normalizedOp.includes('cus') || normalizedOp.includes('sub')) && hasBankFees);

            if (shouldSkip) return;

            let total = tx.Total;
            if (normalizedOp.includes('depot')) cashBalance += Math.abs(total);
            else if (normalizedOp.includes('retrait')) cashBalance -= Math.abs(total);
            else if (normalizedOp.includes('dividende')) cashBalance += Math.abs(total);
            else cashBalance += total;
        }
    });

    bankOperations.forEach(op => {
        const amt = op.Amount;
        switch (op.Category) {
            case 'DEPOSIT': cashBalance += Math.abs(amt); break;
            case 'WITHDRAWAL': cashBalance -= Math.abs(amt); break;
            case 'DIVIDEND': cashBalance += Math.abs(amt); break;
            case 'TAX': cashBalance += amt; break;
            case 'BANK_FEE': case 'CUSTODY': case 'SUBSCRIPTION':
                cashBalance -= Math.abs(amt); break;
        }
    });

    return cashBalance;
}

// --- DATA LOADING ---
const csvT = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());
const transactions = csvT.slice(1).map(l => {
    const c = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
    let total = parseMadNumber(c[7]);
    const op = c[3];
    if ((op.toLowerCase().includes('frais') || op.toLowerCase().includes('taxe')) && total > 0) total = -total;
    return { Operation: op, Total: total };
});

const csvB = fs.readFileSync('bank_operations_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());
const bankOps = csvB.slice(1).map(l => {
    const c = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
    return { Category: c[2].toUpperCase(), Amount: parseMadNumber(c[4]) };
});

console.log('Final Cash Balance (Replicated):', calculateReplication(transactions, bankOps).toFixed(2));
