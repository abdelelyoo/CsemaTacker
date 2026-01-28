
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const main = async () => {
    try {
        const dir = process.cwd();
        console.log(`Current directory: ${dir}`);

        const files = fs.readdirSync(dir);
        const pdfFile = files.find(f => f.startsWith('BKGR Lettre Quotidienne') && f.endsWith('.pdf'));

        if (!pdfFile) {
            console.error('No matching PDF file found.');
            process.exit(1);
        }

        const pdfPath = path.join(dir, pdfFile);
        console.log(`Reading PDF: ${pdfPath}`);

        if (!fs.existsSync(pdfPath)) {
            console.error(`File does not exist: ${pdfPath}`);
            process.exit(1);
        }

        const dataBuffer = fs.readFileSync(pdfPath);
        console.log(`Read ${dataBuffer.length} bytes.`);

        const data = await pdf(dataBuffer);
        console.log(`Pages: ${data.numpages}`);

        // Save extracted text
        const outputPath = path.join(dir, 'latest_pdf_content.txt');
        console.log(`Writing output to: ${outputPath}`);
        fs.writeFileSync(outputPath, data.text);

        if (fs.existsSync(outputPath)) {
            console.log(`Success! Extracted text saved to ${outputPath}`);
        } else {
            console.error(`Failed to write file at ${outputPath}`);
        }

    } catch (error) {
        console.error('Error in main execution:', error);
        process.exit(1);
    }
};

main();
