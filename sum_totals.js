const fs = require('fs');

function parseMadNumber(str) {
    if (!str) return 0;
    let clean = str.replace(/\"/g, '').trim();
    if (clean.includes(',')) {
        // If it has a comma and no period, it's likely Moroccan decimal separator
        if (!clean.includes('.')) {
            clean = clean.replace(',', '.');
        } else {
            // Both exist, usually comma is thousands, period is decimal in standard English
            // but Moroccan can be flipped. 
            // In the CSV seen: "21965.33" (period) and "12000" (none).
            // Actually in portfolio_export it was "21965.33" (period).
            // In bank_export it was "21965,33" (comma).
            // My script should handle both.
            const lastComma = clean.lastIndexOf(',');
            const lastPeriod = clean.lastIndexOf('.');
            if (lastComma > lastPeriod) clean = clean.replace(/\./g, '').replace(',', '.');
            else clean = clean.replace(/,/g, '');
        }
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
}

const lines = fs.readFileSync('trades_only.csv', 'utf8').split('\n').filter(l => l.trim());
let total = 0;
for (let line of lines) {
    if (line.startsWith('Date')) continue;
    const cols = line.split(',');
    // Extract the Total column. Since we have quotes, simple split might be tricky if there are commas in company names.
    // However, looking at the file, the 8th value is Total.
    // Let's use a regex to find numbers with optional periods/commas at the end of the line-ish.
    // Or just parse carefully.
    const field = cols[cols.length - 4]; // Total is 4th from right: Total, Fees, Tax, Realized
    const val = parseMadNumber(field);
    total += val;
}
console.log('SUM OF TRADES (Buys/Sells):', total);
