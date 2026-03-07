import { execSync } from 'child_process';
import fs from 'fs';

try {
    const output = execSync('npx tsc --noEmit', { encoding: 'utf8' });
    fs.writeFileSync('tsc_errors.txt', 'SUCCESS\n' + output, 'utf8');
} catch (error) {
    fs.writeFileSync('tsc_errors.txt', (error as any).stdout, 'utf8');
}
