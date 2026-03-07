const fs = require('fs');

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.replace(/\"/g, '').trim();
    if (clean.includes(',') && !clean.includes('.')) {
        clean = clean.replace(/\s/g, '').replace(',', '.');
    } else if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/,/g, '');
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

const csvT = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());
const transactions = csvT.slice(1).map(l => {
    const c = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
    return { Operation: c[3], Total: parseMadNumber(c[7]) };
});

const csvB = fs.readFileSync('bank_operations_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());
const bankOps = csvB.slice(1).map(l => {
    const c = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
    return { Category: c[2].toUpperCase(), Amount: parseMadNumber(c[4]) };
});

const targets = [-1131, 23.1];

console.log('Searching for logic that produces targets...');

function runSim(skipOption, signOption, bankOption) {
    let cash = 0;

    transactions.forEach(tx => {
        const op = tx.Operation.toLowerCase();
        if (op === 'achat' || op === 'buy' || op === 'vente' || op === 'sell') {
            const isBuy = op === 'achat' || op === 'buy';
            const val = Math.abs(tx.Total);
            if (isBuy) cash -= val;
            else cash += val;
        } else {
            const normalizedOp = op.replace(/\s+/g, ' ').trim();
            const isCashOp = normalizedOp.includes('depot') || normalizedOp.includes('retrait') ||
                normalizedOp.includes('dividende') || normalizedOp.includes('frais') ||
                normalizedOp.includes('taxe');

            if (isCashOp && skipOption) return;

            let total = tx.Total;
            if (signOption && (normalizedOp.includes('frais') || normalizedOp.includes('taxe')) && total > 0) {
                total = -total;
            }
            if (normalizedOp.includes('depot')) cash += Math.abs(total);
            else if (normalizedOp.includes('retrait')) cash -= Math.abs(total);
            else if (normalizedOp.includes('dividende')) cash += Math.abs(total);
            else cash += total;
        }
    });

    if (bankOption) {
        bankOps.forEach(op => {
            const amt = Math.abs(op.Amount);
            switch (op.Category) {
                case 'DEPOSIT': cash += amt; break;
                case 'WITHDRAWAL': cash -= amt; break;
                case 'DIVIDEND': cash += amt; break;
                case 'TAX': cash -= amt; break; // Assumed tax is out
                case 'BANK_FEE': case 'CUSTODY': case 'SUBSCRIPTION':
                    cash -= amt; break;
            }
        });
    }
    return cash;
}

for (let skipOpt of [true, false]) {
    for (let signOpt of [true, false]) {
        for (let bankOpt of [true, false]) {
            const res = runSim(skipOpt, signOpt, bankOpt);
            if (Math.abs(res - (-1131)) < 5 || Math.abs(res - 23.1) < 5) {
                console.log(`Found: ${res.toFixed(2)} | Skip: ${skipOpt}, Sign: ${signOpt}, Bank: ${bankOpt}`);
            }
        }
    }
}
