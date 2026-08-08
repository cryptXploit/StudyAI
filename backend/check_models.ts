import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log("API Key found:", !!apiKey);
  if (!apiKey) {
    console.error("No API key found in .env");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) {
      console.error("API Error:", data.error);
    } else {
      const models = data.models.map((m: any) => m.name);
      console.log("Available models:");
      console.log(models.join(", "));
      
      console.log("\nChecking for gemini-1.5-flash:");
      console.log(models.includes('models/gemini-1.5-flash') ? "AVAILABLE" : "NOT AVAILABLE");
      
      console.log("\nChecking for gemini-3.5-flash:");
      console.log(models.includes('models/gemini-3.5-flash') ? "AVAILABLE" : "NOT AVAILABLE");
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

checkModels();
