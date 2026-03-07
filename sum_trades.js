const fs = require('fs');

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.replace(/\"/g, '').trim();
    // Handle Moroccan format (21 965,33)
    if (clean.includes(',') && !clean.includes('.')) {
        clean = clean.replace(/\s/g, '').replace(',', '.');
    } else if (clean.includes(',') && clean.includes('.')) {
        // Assume 1,234.56
        clean = clean.replace(/,/g, '');
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

const csv = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());
let cash = 0;
let buys = 0;
let sells = 0;
let deposits = 0;
let others = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple split for this specific CSV structure (assuming no commas in names)
    // Or use a regex that handles quotes
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
    if (cols.length < 8) continue;

    const op = cols[3].toLowerCase();
    const total = parseMadNumber(cols[7]);

    if (op === 'achat' || op === 'buy') {
        buys += Math.abs(total);
        cash -= Math.abs(total);
    } else if (op === 'vente' || op === 'sell') {
        sells += Math.abs(total);
        cash += Math.abs(total);
    } else if (op === 'depot' || op === 'dpt') {
        deposits += Math.abs(total);
        cash += Math.abs(total);
    } else {
        others += total;
        cash += total;
    }
}

console.log('Buys:', buys.toFixed(2));
console.log('Sells:', sells.toFixed(2));
console.log('Deposits:', deposits.toFixed(2));
console.log('Others:', others.toFixed(2));
console.log('Final Cash Balance (from Portfolio CSV):', cash.toFixed(2));
