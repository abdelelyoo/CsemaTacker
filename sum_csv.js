const fs = require('fs');

const csv = fs.readFileSync('atlas_portfolio_export_2026-02-26.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

let sum = 0;
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple split for now, check if it works for this file
    const cols = line.split(',');
    // Total is 8th column
    let valStr = cols[7];
    if (valStr) {
        valStr = valStr.replace(/\"/g, '');
        const val = parseFloat(valStr);
        if (!isNaN(val)) {
            sum += val;
        }
    }
}
console.log('SUM OF TOTAL COLUMN:', sum);
