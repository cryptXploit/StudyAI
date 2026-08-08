import { Worker, Job } from 'bullmq';
import { connection } from './connection';
import logger from '../core/logger';
import { ModelRouter } from '../ai/ModelRouter';

const { PDFParse } = require('pdf-parse');

// The exact same text extraction logic from oracle.controller.ts, moved to background
async function extractTextFromBuffer(buffer: Buffer, mimetype: string, userId: string, userTier: string, language: string): Promise<string> {
  const router = new ModelRouter();

  if (mimetype === 'application/pdf') {
    try {
      const u8 = new Uint8Array(buffer);
      const parser = new PDFParse(u8);
      await parser.load();
      const text = await parser.getText();
      
      if (text.trim().length > 50) {
        return text;
      }
      logger.info("Scanned PDF detected in Oracle Worker, falling back to AI OCR...");
    } catch (e) {
      logger.error("pdf-parse error in oracle worker", { error: e });
    }
  }

  // If it's a direct image, use Local Tesseract OCR (100% Free & No Limits)
  if (mimetype.startsWith('image/')) {
    try {
      logger.info("Image detected, running local Tesseract OCR...");
      const Tesseract = require('tesseract.js');
      
      const tesseractPromise = Tesseract.recognize(buffer, 'eng');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Tesseract timeout exceeded")), 15000);
      });
      
      const { data: { text } } = await Promise.race([tesseractPromise, timeoutPromise]) as any;
      return text;
    } catch (err: any) {
      logger.error("Tesseract Error/Timeout:", err.message);
      // Fallback to Gemini if Tesseract fails or times out
    }
  }

  // Use Gemini to extract text directly from Image or PDF buffer (as fallback for Scanned PDFs or failed Tesseract)
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
  let modelName = process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-3.5-flash';
  if (modelName.includes('1.5')) modelName = 'gemini-3.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    logger.info("Running Gemini OCR/Extraction (Free Tier Limits Apply)...");
    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    const response = await model.generateContent([
      "Please extract all the text, specifically all the exam questions, from this document exactly as they appear." + strictLangInstruction,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimetype
        }
      }
    ]);
    return response.response.text();
  } catch (err: any) {
    logger.error("Gemini Extraction Error in Background Worker:", err);
    throw err; // BullMQ will catch this and auto-retry
  }
}

export const oracleWorker = new Worker(
  'oracle-extraction',
  async (job: Job) => {
    const { filesData, userId, userTier, language } = job.data;
    // filesData is an array of { mimetype, bufferBase64 }
    
    let extractedText = "";
    for (const file of filesData) {
      const buffer = Buffer.from(file.bufferBase64, 'base64');
      // If we don't have AI OCR integrated into ModelRouter for images, we might use tesseract here for images.
      // For now, we use the AI fallback logic.
      const text = await extractTextFromBuffer(buffer, file.mimetype, userId, userTier, language);
      extractedText += `\n${text}\n`;
    }

    const router = new ModelRouter();
    
    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const chunkingPrompt = `Extract all distinct questions or exam problems from the following text. Return them as a STRICT JSON array of strings. Do not include answers, only the question text. If a question has subparts, keep them together as one string.
Text:
${extractedText.substring(0, 25000)}

Output ONLY a valid JSON array of strings, e.g. ["What is Newton's First Law?", "Explain Quantum Entanglement"]. No markdown backticks.${strictLangInstruction}`;

    const chunkingResult = await router.generate([{ role: 'user', content: chunkingPrompt }], userId, userTier, { temperature: 0.1 });
    let cleanChunking = chunkingResult.trim();
    if (cleanChunking.indexOf('[') !== -1) cleanChunking = cleanChunking.substring(cleanChunking.indexOf('['), cleanChunking.lastIndexOf(']') + 1);
    
    let questions: string[] = [];
    try {
      questions = JSON.parse(cleanChunking);
    } catch (e) {
      throw new Error("Failed to extract discrete questions from the document.");
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No valid questions found in the document.");
    }

    return { questions };
  },
  { connection: connection as any, concurrency: 2 }
);

oracleWorker.on('completed', (job) => logger.info('oracleWorker.completed', { jobId: job.id }));
oracleWorker.on('failed', (job, err) => logger.error('oracleWorker.failed', { jobId: job?.id, error: err.message }));
