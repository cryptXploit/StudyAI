import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
  
  try {
    console.log('Fetching models...');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''));
    const data = await response.json();
    console.log(data.models.map((m: any) => m.name).join(', '));
  } catch (err: any) {
    console.error('Gemini Error:', err.message);
  }
}
testGemini();
