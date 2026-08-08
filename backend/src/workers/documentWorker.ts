import { Worker } from 'bullmq';
import { connection, documentQueue } from '../queue/connection';
import { createClient } from '@supabase/supabase-js';
import { ModelRouter } from '../ai/ModelRouter';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// ⚠️ আপনার এক্সট্রাকশন এবং চাঙ্কিং এর ইমপোর্টগুলো যেমন ছিল তেমনই রাখবেন!
// (শুধু extractTextFromPDF টা আর দরকার নেই, কারণ MarkItDown সেটা করবে)
import { chunkText, processAndStoreEmbeddings } from '../utils/documentUtils';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ========================================================================
// 🟢 NEW ARCHITECTURE: Python MarkItDown Integration for High Fidelity Text
// ========================================================================
async function extractWithMarkItDown(fileBlob: Blob, fileExtension: string): Promise<string> {
  // 1. Blob কে একটি temporary ফাইলে সেভ করতে হবে, কারণ Python স্ক্রিপ্ট ফাইল পাথ (File Path) নেয়।
  const tempDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempFileName = `temp_${Date.now()}.${fileExtension || 'pdf'}`;
  const tempFilePath = path.join(tempDir, tempFileName);
  
  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  await fs.writeFile(tempFilePath, buffer);

  // 2. Python Script কল করা
  return new Promise((resolve, reject) => {
    // extractor.py ফাইলের লোকেশন
    const scriptPath = path.join(process.cwd(), 'src', 'utils', 'extractor.py'); 

    const pythonProcess = spawn('python3', [scriptPath, tempFilePath]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      // 3. কাজ শেষ হলে temporary ফাইলটি মুছে ফেলা (যাতে স্টোরেজ ফুল না হয়)
      try { await fs.unlink(tempFilePath); } catch (e) {}

      if (code === 0) {
        resolve(stdoutData.trim());
      } else {
        console.error(`[Worker] MarkItDown Error: ${stderrData}`);
        reject(new Error(`MarkItDown extraction failed with code ${code}`));
      }
    });

    pythonProcess.on('error', async (err) => {
      try { await fs.unlink(tempFilePath); } catch (e) {}
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// ========================================================================
// 🟢 Standalone Native OCR Fallback (For Scanned PDFs / Jpeg)
// ========================================================================
async function extractTextWithOCRFallback(fileBlob: Blob, standardText: string): Promise<string> {
  // যদি MarkItDown ২০০ টির বেশি ক্যারেক্টার বের করতে পারে, তার মানে এটি একটি নরমাল পিডিএফ
  if (standardText && standardText.trim().length >= 200) {
    return standardText; 
  }
  
  console.warn("[Worker] 🚨 Detected Image-based or Scanned PDF! Initiating Multimodal OCR...");
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("[Worker] No Gemini API key found for OCR fallback.");
      return standardText;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64');
    
    const requestBody = {
      contents: [{
        role: "user",
        parts: [
          { text: "Extract and transcribe all readable text from this document accurately. Maintain paragraph structure. Do not output markdown code blocks. Just the raw text." },
          { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
        ]
      }]
    };

    const model = process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(await response.text());
    
    const data = await response.json();
    const ocrText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (ocrText && ocrText.trim().length > 0) {
        console.log("[Worker] 🎯 Multimodal OCR Extraction Successful!");
        return ocrText;
    }
  } catch (ocrError) {
    console.error("[Worker] Multimodal OCR Failed:", ocrError);
  }
  
  return standardText; 
}

export const documentWorker = new Worker('document-processing', async (job) => {
  const { fileId, userId, storagePath, tier } = job.data;
  
  try {
    // 1. Download File from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(storagePath);
      
    if (downloadError || !fileData) throw new Error('File download failed');

    // 🟢 2. Extract Text using Microsoft MarkItDown ($0 Cost, High Fidelity)
    // Extract file extension from storagePath (e.g., 'uploads/document.pdf' -> 'pdf')
    const fileExtension = storagePath.split('.').pop()?.toLowerCase() || 'pdf';
    console.log(`[Worker] Extracting text using MarkItDown for file: ${fileId}`);
    
    let rawText = '';
    try {
      rawText = await extractWithMarkItDown(fileData, fileExtension);
    } catch (mdError) {
      console.warn(`[Worker] MarkItDown failed, falling back to empty string. Error:`, mdError);
      rawText = '';
    }
    
    // 🟢 2.1 OCR PROTECTOR: যদি স্ক্যানড পিডিএফ হয় (MarkItDown ফেইল করে বা টেক্সট কম পায়), তবে এআই দিয়ে টেক্সট বের করে আনা হবে
    rawText = await extractTextWithOCRFallback(fileData, rawText);

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No readable text could be extracted from this document.');
    }

    // 3. Chunking & Embedding (আপনার আগের লজিক)
    const chunks = chunkText(rawText);
    await processAndStoreEmbeddings(chunks, fileId, userId);

    // ========================================================================
    // 🟢 Background Global Summary Generation (Zero Latency for User)
    // ========================================================================
    try {
      let textForSummary = rawText;
      if (rawText.length > 25000) {
        textForSummary = rawText.substring(0, 12000) + "\n\n...[MIDDLE OMITTED]...\n\n" + rawText.substring(rawText.length - 12000);
      }

      const router = new ModelRouter();
      const messages = [
        { role: 'system' as const, content: 'You are an expert Document Analyst. Provide a highly professional, comprehensive, and well-structured summary of the following document. Highlight key topics, findings, and conclusions.' },
        { role: 'user' as const, content: textForSummary }
      ];

      // Generate Summary using Free Tier Model to save Pro cost
      const summary = await router.generate(messages, userId, 'Free');

      // Save Summary to Database
      await supabaseAdmin.from('files').update({ 
        global_summary: summary,
        status: 'indexed' 
      }).eq('id', fileId);

    } catch (summaryError) {
      console.error(`[Worker] Failed to generate global summary for ${fileId}:`, summaryError);
      // যদি সামারি ফেইলও করে, তবু ফাইল যেন indexed মার্ক হয়
      await supabaseAdmin.from('files').update({ status: 'indexed' }).eq('id', fileId);
    }
    // 👇👇👇 ঠিক এখান থেকে নিচের কোডটুকু কপি করে পেস্ট করুন 👇👇👇

    // ========================================================================
    // 🟢 NEW: Background Auto Anki-Flashcard Generation (30 Cards)
    // ========================================================================
    try {
      console.log(`[Worker] 🃏 Generating 30 Auto-Flashcards for ${fileId}...`);
      
      const router = new ModelRouter();
      const flashcardSystemPrompt = `You are an expert Educational Flashcard Generator.
Your job is to extract the 30 most critical concepts from the text and create high-yield "Anki-style" flashcards.

CRITICAL RULES:
1. Output ONLY a raw, valid JSON object. No markdown blocks (\`\`\`json). No conversational text.
2. The JSON MUST exactly follow this structure: 
{
  "cards": [
    {"q": "Question or Term here", "a": "Short, memorable answer with **bold** key terms"}
  ],
  "glossary": {
    "Bold Term 1": "1-sentence definition"
  }
}
3. Keep answers concise. Use **bold** for difficult terms in the answer ("a" field) and define them in the glossary.
4. MUST generate exactly or up to 30 highly important cards.`;

      // using the same truncated 'textForSummary' to avoid huge token costs
      let textForCards = rawText;
      if (rawText.length > 25000) {
          textForCards = rawText.substring(0, 15000) + "\n\n...[MIDDLE OMITTED]...\n\n" + rawText.substring(rawText.length - 15000);
      }

      const flashcardMessages = [
        { role: 'system' as const, content: flashcardSystemPrompt },
        { role: 'user' as const, content: `DOCUMENT CONTEXT:\n${textForCards}` }
      ];

      // Generate Flashcards (Using 'Free' tier to keep background costs $0)
      const flashcardResponse = await router.generate(flashcardMessages, userId, 'Free');

      // Clean & Parse the JSON output
      const cleanJSON = flashcardResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJSON);
      
      const generatedCards = parsedData.cards || parsedData;
      const generatedGlossary = parsedData.glossary || {};

      if (Array.isArray(generatedCards) && generatedCards.length > 0) {
        // Save directly to the user's Flashcard Library
        const fileName = storagePath.split('/').pop() || 'Document';
        
        await supabaseAdmin.from('flashcard_decks').insert([{ 
          user_id: userId, 
          topic: `Auto-Generated: ${fileName}`, 
          file_ids: [fileId], 
          cards: { cards: generatedCards, glossary: generatedGlossary } 
        }]);
        
        console.log(`[Worker] ✅ Successfully saved ${generatedCards.length} Auto-Flashcards to library for ${fileId}`);
      }
    } catch (flashcardError) {
      console.error(`[Worker] 🚨 Failed to generate Auto-Flashcards for ${fileId}:`, flashcardError);
      // We DO NOT throw error here, because if flashcard fails, the file should still remain 'indexed'
    }

    // 👆👆👆 পেস্ট করা শেষ 👆👆👆

  } catch (error) {
    console.error(`[Worker] Job Failed:`, error);
    await supabaseAdmin.from('files').update({ status: 'failed' }).eq('id', fileId);
    throw error;
  }
}, { connection });
