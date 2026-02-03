#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = 'atlas_portfolio_export_2026-02-01.csv';
const OUTPUT_FILE = 'atlas_portfolio_export_2026-02-01_adapted.csv';

// Ticker to ISIN mapping (based on Moroccan market data)
const TICKER_TO_ISIN = {
  'TMA': 'MA0000012262',
  'VCN': 'MA0000012759',
  'TGC': 'MA0000012528',
  'DHO': 'MA0000011850',
  'MSA': 'MA0000012312',
  'NKL': 'MA0000011942',
  'ATW': 'MA0000012445',
  'HPS': 'MA0000012619',
  'AKT': 'MA0000012585',
  'BOA': 'MA0000012437',
  'GTM': 'MA0000012783',
  'SNA': 'MA0000012700',
  'FBR': 'MA0000011587',
  'STR': 'MA0000012056',
  'DYT': 'MA0000012536',
  'IAM': 'MA0000011454',
  'RIS': 'MA0000011462'
};

function adaptCSV() {
  try {
    console.log('🔄 Starting CSV adaptation...');
    
    // Read the input file
    const csvContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('Input CSV file is empty');
    }
    
    console.log(`📄 Found ${lines.length} lines in input file`);
    
    // Process header
    const header = lines[0];
    const headers = header.split(',');
    
    // Check if ISIN column already exists
    const hasISIN = headers.includes('ISIN');
    
    // Create new header with ISIN column
    let newHeader;
    if (hasISIN) {
      newHeader = header; // Keep existing header
      console.log('✅ ISIN column already exists');
    } else {
      // Insert ISIN after Company column
      const companyIndex = headers.indexOf('Company');
      if (companyIndex === -1) {
        throw new Error('Company column not found in CSV');
      }
      
      const newHeaders = [...headers];
      newHeaders.splice(companyIndex + 1, 0, 'ISIN');
      newHeader = newHeaders.join(',');
      console.log('🔧 Added ISIN column to header');
    }
    
    // Process data rows
    const adaptedLines = [newHeader];
    let recordsProcessed = 0;
    let recordsWithMissingISIN = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      
      if (hasISIN) {
        // ISIN column already exists, just pass through
        adaptedLines.push(line);
        recordsProcessed++;
      } else {
        // Add ISIN column
        const ticker = values[headers.indexOf('Ticker')]?.trim() || '';
        const isin = TICKER_TO_ISIN[ticker] || '';
        
        if (!isin) {
          recordsWithMissingISIN++;
          console.warn(`⚠️  No ISIN found for ticker: ${ticker}`);
        }
        
        // Insert ISIN after Company column
        const companyIndex = headers.indexOf('Company');
        const newValues = [...values];
        newValues.splice(companyIndex + 1, 0, isin);
        
        adaptedLines.push(newValues.join(','));
        recordsProcessed++;
      }
    }
    
    // Write output file
    fs.writeFileSync(OUTPUT_FILE, adaptedLines.join('\n'), 'utf8');
    
    console.log('✅ CSV adaptation completed!');
    console.log(`📊 Processed ${recordsProcessed} records`);
    if (recordsWithMissingISIN > 0) {
      console.log(`⚠️  ${recordsWithMissingISIN} records missing ISIN (will use empty string)`);
    }
    console.log(`💾 Output saved to: ${OUTPUT_FILE}`);
    
    // Show import command
    console.log('\n🚀 To import the adapted CSV:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Go to the Transactions tab');
    console.log('3. Click "Import CSV" button');
    console.log('4. Select the adapted CSV file');
    console.log('5. Confirm the import');
    
  } catch (error) {
    console.error('❌ Error during CSV adaptation:', error.message);
    process.exit(1);
  }
}

// Run the adaptation
adaptCSV();