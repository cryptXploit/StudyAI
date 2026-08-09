import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelRouter } from '../ai/ModelRouter';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-1.5-flash' });



export const runOraclePrediction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const userTier = (req as any).user?.tier || 'Free';
    const { syllabusId, chapterId, fileIds, language } = req.body;

    if (!syllabusId || !fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'Syllabus ID and selected source files are required.' });
    }

    // 🟢 Token Cost Check & Deduction (OWASP Safe)
    if (userTier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.ORACLE_PREDICT;
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        return res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
      }
      
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Oracle Prediction', idempotencyKey: `oracle:${userId}:${Date.now()}`, tier: userTier });
      } catch {
        return res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
      }
    }

    // 1. Fetch Syllabus Topics
    let topics: string[] = [];
    const { data: syllabus } = await supabase.from('syllabuses').select('*, chapters:syllabus_chapters(*)').eq('id', syllabusId).single();
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    if (chapterId) {
      const chapter = syllabus.chapters?.find((c: any) => c.id === chapterId);
      if (chapter && chapter.topics) {
         topics = chapter.topics;
      }
    } else {
      // Gather all topics from all chapters
      syllabus.chapters?.forEach((c: any) => {
        if (c.topics) topics.push(...c.topics);
      });
    }

    if (topics.length === 0) {
      return res.status(400).json({ error: 'No topics found in the selected syllabus/chapter.' });
    }

    // 2. Fetch File Chunks (The "Questions")
    const { data: chunks, error: chunkErr } = await supabase
      .from('file_chunks')
      .select('content, embedding')
      .in('file_id', fileIds);

    if (chunkErr || !chunks || chunks.length === 0) {
      return res.status(400).json({ error: 'No processed content found for the selected files.' });
    }

    const router = new ModelRouter();

    // 3. Stage 1: Zero-Cost Database Clustering (Node.js Vector Math)
    const { cosineSimilarity } = await import('../utils/vectorMath');
    
    const questionVectors = chunks.map(chunk => {
      let vec: number[] = [];
      if (typeof chunk.embedding === 'string') {
        try { vec = JSON.parse(chunk.embedding); } catch (e) {}
      } else if (Array.isArray(chunk.embedding)) {
        vec = chunk.embedding;
      }
      return { text: chunk.content, vector: vec };
    }).filter(qv => qv.vector.length > 0 && qv.text.length > 20); // filter out empty or tiny chunks

    if (questionVectors.length === 0) {
      return res.status(400).json({ error: 'No valid questions found in the selected files.' });
    }

    // O(N^2) Density Clustering to find repeating questions
    const clusters: { count: number, texts: string[] }[] = [];
    const visited = new Set<number>();
    const SIMILARITY_THRESHOLD = 0.82; // High threshold for near-identical or highly similar questions

    for (let i = 0; i < questionVectors.length; i++) {
      if (visited.has(i)) continue;
      
      const currentCluster = { count: 1, texts: [questionVectors[i].text] };
      visited.add(i);

      for (let j = i + 1; j < questionVectors.length; j++) {
        if (visited.has(j)) continue;
        const sim = cosineSimilarity(questionVectors[i].vector, questionVectors[j].vector);
        if (sim > SIMILARITY_THRESHOLD) {
          currentCluster.count++;
          // Keep up to 3 text samples per cluster to save token context
          if (currentCluster.texts.length < 3) {
            currentCluster.texts.push(questionVectors[j].text);
          }
          visited.add(j);
        }
      }
      clusters.push(currentCluster);
    }

    // Sort clusters by frequency (highest first) and take the top 20
    clusters.sort((a, b) => b.count - a.count);
    const topClusters = clusters.slice(0, 20);

    if (topClusters.length === 0) {
      return res.status(400).json({ error: 'Could not find any clear patterns in the past papers.' });
    }

    // 4. Stage 2: Micro-Formatting with Cheap/Fast AI Model
    // We only send the text from the most frequent clusters
    const contextString = topClusters.map((c, i) => `[Cluster ${i+1} | Frequency: ${c.count}]\nTexts:\n${c.texts.join('\n---\n')}`).join('\n\n==========\n\n');

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const systemPrompt = `You are a Board Exam Oracle. Your task is to review clusters of text from study materials, past papers, or research papers and format them into beautiful, clean predicted exam questions.

CRITICAL INSTRUCTIONS:
1. You will receive clusters of raw text. The "Frequency" indicates how many times this topic appeared.
2. If the text contains actual exam questions, synthesize them into a single, perfectly formatted board-standard question.
3. If the text contains notes, research papers, or general topics (NOT questions), YOU MUST GENERATE a highly probable exam question based on the key concepts in the text.
4. Assign a realistic confidence score (75-99%) based purely on the Frequency. (e.g., Frequency 1 = 70-80%, Frequency 2 = 85-90%, Frequency 3+ = 95-99%).
5. Return ONLY a strict JSON array. No markdown, no extra text.${strictLangInstruction}

JSON FORMAT:
[
  {
    "id": "1",
    "topic": "Clean Subject/Topic Heading",
    "format": "Full question text here.\\na) First subquestion...\\nb) Second subquestion...",
    "confidence": 95
  }
]`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here are the top repeating topic clusters:\n\n${contextString}\n\nFormat them into the JSON array of predicted questions (generate up to 20 questions).` }
    ];

    // 🚀 Use 'Free' tier (Flash/Groq) for lightning fast speed & ultra low cost
    const aiResponse = await router.generate(messages as any, userId, 'Free', { temperature: 0.2 });
    
    // 5. Parse JSON from AI response
    let finalPredictions = [];
    try {
      const startIndex = aiResponse.indexOf('[');
      const endIndex = aiResponse.lastIndexOf(']');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
         const jsonStr = aiResponse.substring(startIndex, endIndex + 1);
         finalPredictions = JSON.parse(jsonStr);
      } else {
         throw new Error("No JSON array found in response");
      }
    } catch (e) {
      console.error("Oracle AI JSON Parsing Error:", e, "Raw Output:", aiResponse);
      // Fallback if JSON fails
      finalPredictions = topClusters.map((c, index) => ({
        id: String(index + 1),
        topic: "Predicted Topic " + (index + 1),
        format: c.texts[0].substring(0, 300) + "...",
        confidence: Math.min(99, 70 + (c.count * 5))
      }));
    }

    return res.status(200).json({ predictions: finalPredictions });

  } catch (error: any) {
    console.error("[Oracle Predictor Error]:", error);
    return res.status(500).json({ error: 'Failed to run Oracle predictions.', details: error.message });
  }
};
