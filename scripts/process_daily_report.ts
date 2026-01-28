
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

// Read API Key
const envPath = path.join(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
} catch (e) {
    // Ignore error
}

if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env.local");
    process.exit(1);
}

const main = async () => {
    const textPath = path.join(process.cwd(), 'latest_pdf_content.txt');
    if (!fs.existsSync(textPath)) {
        console.error("latest_pdf_content.txt not found. Please run the python extraction script first.");
        process.exit(1);
    }
    const pdfText = fs.readFileSync(textPath, 'utf-8');

    console.log(`Processing extracted PDF text (${pdfText.length} characters)...`);

    try {
        const ai = new GoogleGenAI({ apiKey });

        // Use loose typing to support both SDK versions (Google Cloud vs AI Studio styles)
        // This ensures the script works regardless of which exact @google/genai version is resolved
        let model;
        let result;
        const prompt = `
            Extract structured data from this market report text (BKGR Lettre Quotidienne):
            """${pdfText.substring(0, 45000)}""" 
            
            Return JSON ONLY matching this structure:
            {
                "LATEST_PRICES": { "TICKER": 123.45, ... },
                "ANALYST_TARGETS": [ { "ticker": "...", "targetPrice": 0, "recommendation": "Buy/Hold/Sell", "date": "YYYY-MM-DD", "source": "BKGR" } ],
                "MARKET_DAILY_HIGHLIGHTS": {
                    "date": "YYYY-MM-DD",
                    "sentiment": "Bearish" | "Bullish" | "Neutral",
                    "masiVariation": -0.0,
                    "totalVolume": 0,
                    "highlights": [ { "category": "Macro" | "Corporate", "title": "...", "content": "..." } ],
                    "topPerformers": [ { "ticker": "...", "change": 0.0 } ],
                    "bottomPerformers": [ { "ticker": "...", "change": 0.0 } ]
                }
            }
             
            Rules:
            - Map "SOT" to "MSA", "TGC" to "TGCC", "SNP" to "SNEP", "GTM" to "SGTM".
            - Extract ALL prices from the dashboard table.
        `;

        // Check availability of methods
        if (ai.models && ai.models.generateContent) {
            console.log("Using Client.models.generateContent...");
            result = await (ai as any).models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt
            });
        } else if ((ai as any).getGenerativeModel) {
            console.log("Using getGenerativeModel...");
            model = (ai as any).getGenerativeModel({ model: "gemini-2.0-flash" });
            result = await model.generateContent(prompt);
        } else {
            throw new Error("Unknown @google/genai SDK structure.");
        }

        // Extract text response
        let jsonStr = '';
        if (result.response && typeof result.response.text === 'function') {
            jsonStr = result.response.text();
        } else if (typeof result.text === 'string') {
            jsonStr = result.text;
        } else if (typeof result.text === 'function') {
            jsonStr = result.text();
        } else if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            jsonStr = result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Could not extract text from Gemini response.");
        }

        const data = JSON.parse(jsonStr.replace(/```json|```/g, '').trim());

        const tsContent = `
import { AnalystTarget, MarketIntelligence } from './types';

export const LATEST_PRICES: Record<string, number> = ${JSON.stringify(data.LATEST_PRICES, null, 4)};

export const ANALYST_TARGETS: AnalystTarget[] = ${JSON.stringify(data.ANALYST_TARGETS || [], null, 4)};

export const MARKET_DAILY_HIGHLIGHTS: MarketIntelligence = ${JSON.stringify(data.MARKET_DAILY_HIGHLIGHTS, null, 4)};
`;

        const outputPath = path.join(process.cwd(), 'daily_data.ts');
        fs.writeFileSync(outputPath, tsContent);
        console.log(`Successfully updated daily_data.ts with data for ${data.MARKET_DAILY_HIGHLIGHTS?.date}`);

    } catch (error) {
        console.error("Error processing daily report:", error);
        process.exit(1);
    }
};

main();
