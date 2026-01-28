
import * as genai from "@google/genai";
console.log(Object.keys(genai));
try {
    const { GoogleGenAI } = genai as any;
    console.log("GoogleGenAI:", GoogleGenAI);
} catch (e) {
    console.log("Error accessing GoogleGenAI");
}
