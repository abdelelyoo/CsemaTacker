const { execSync } = require('child_process');
const fs = require('fs');

try {
    const output = execSync('npx tsc --noEmit', { encoding: 'utf8' });
    fs.writeFileSync('tsc_errors.txt', 'SUCCESS\n' + output, 'utf8');
} catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error) {
        fs.writeFileSync('tsc_errors.txt', String(error.stdout), 'utf8');
    } else {
        fs.writeFileSync('tsc_errors.txt', 'ERROR: ' + String(error), 'utf8');
    }
}