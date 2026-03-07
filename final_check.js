const fs = require('fs');

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

const portfolioLines = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());
const bankLines = fs.readFileSync('bank_operations_export_2026-02-26.csv', 'utf8').split('\n').filter(l => l.trim());

let cash = 0;

// Step 1: Sum all trade totals from atlas_portfolio_export (excluding Depot, Dividende, Taxe)
// because those are usually in bank operations too.
for (let i = 1; i < portfolioLines.length; i++) {
    const cols = portfolioLines[i].split(',').map(c => c.replace(/^"|"$/g, ''));
    const op = cols[3].toLowerCase();
    const total = parseMadNumber(cols[7]);

    if (op !== 'depot' && op !== 'dividende' && op !== 'taxe' && op !== 'dpt') {
        cash += total;
    }
}

console.log('Cash after Trades:', cash);

// Step 2: Add all bank operations
for (let i = 1; i < bankLines.length; i++) {
    const cols = bankLines[i].split(',').map(c => c.replace(/^"|"$/g, ''));
    if (cols.length < 5) continue;
    const cat = cols[2].toUpperCase();
    const amount = parseMadNumber(cols[4]);

    // Direction is handled by category in the app
    if (cat === 'DEPOSIT' || cat === 'DIVIDEND' || cat === 'TAX') {
        cash += Math.abs(amount);
    } else {
        cash -= Math.abs(amount);
    }
}

console.log('Final Cash Available:', cash);
