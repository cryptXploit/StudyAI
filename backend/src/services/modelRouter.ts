import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let cachedModelName: string | null = null; 

// 🟢 NEW: In-Memory Cache to prevent Database Crash (Saves Supabase Connection Limit)
let cachedConfigs: any[] | null = null;
let lastConfigFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minutes cache

// Called after an admin saves central routing configuration so new embedding
// keys/models apply immediately instead of waiting for the worker cache TTL.
export function invalidateEmbeddingConfigCache() {
  cachedConfigs = null;
  cachedModelName = null;
  lastConfigFetchTime = 0;
}

async function logMetrics(provider: string, status: 'success' | 'error', latency: number, tokens = 0) {
  if (!supabase) return; 
  try {
    // 🟢 OPTIMIZATION: Removed heavy logging for Free Tier to save DB writes
    // In a premium app, you can re-enable this. For now, we only log errors to save 500MB DB space.
    if (status === 'error') {
      await supabase.from('api_health_logs').insert({ provider, status, latency_ms: latency });
    }
  } catch (e) {
    console.error("Metric Logging Failed (Ignoring to prevent crash)");
  }
}

export const modelRouter = {
  async embed(text: string, outputDimensions = 1536) {
    if (!text || text.trim() === "") return { vector: new Array(outputDimensions).fill(0) }; 
    const safeText = text.substring(0, 8000); // 🟢 Limit text size to save API tokens
    const startTime = Date.now();

    try {
      let configs: any[] = [];

      // 🟢 DATABASE SAVER: Fetch from DB only once every 10 minutes
      if (supabase) {
        if (!cachedConfigs || Date.now() - lastConfigFetchTime > CACHE_TTL_MS) {
          const { data, error } = await supabase
            .from('api_configurations')
            .select('*')
            .eq('is_active', true)
            .eq('task_type', 'embedding')
            .order('priority', { ascending: true });

          if (!error && data) {
            cachedConfigs = data;
            lastConfigFetchTime = Date.now();
          }
        }
        configs = cachedConfigs || [];
      }

      // Cascading Loop: One after another
      for (const config of configs) {
        if (!config.api_key || config.api_key.trim() === '') continue;

        const provider = config.provider_name.toLowerCase();
        const apiKey = config.api_key;
        let modelName = config.model_name;

        try {
          if (provider === 'gemini' || provider === 'google') {
            if (!modelName || modelName.trim() === '') {
              if (!cachedModelName) {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await res.json();
                const embedModel = data.models?.find((m: any) => m.supportedGenerationMethods?.includes("embedContent"));
                cachedModelName = embedModel ? embedModel.name.replace('models/', '') : (process.env.DEFAULT_GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001');
              }
              modelName = cachedModelName as string;
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: `models/${modelName}`,
                content: { parts: [{ text: safeText }] },
                outputDimensionality: outputDimensions
              })
            });

            const data = await response.json();
            
            if (!response.ok || !data.embedding || !data.embedding.values) {
               throw new Error(`Gemini API Error: ${data.error?.message || 'Invalid response'}`);
            }

            return { vector: data.embedding.values };
          }
        } catch (routeError: any) {
          console.warn(
            `[Embedding] Route ${provider} (${modelName || 'auto'}) failed. Cascading...`,
            routeError instanceof Error ? routeError.message : routeError
          );
          await logMetrics(provider, 'error', Date.now() - startTime);
          continue; 
        }
      }

      throw new Error("All DB embedding routes failed.");

    } catch (error: any) {
      return await this.emergencyFallback(safeText, outputDimensions);
    }
  },


  async emergencyFallback(safeText: string, outputDimensions = 1536) {
    try {
      console.warn("Triggering Embedding Emergency Fallback to .env...");
      const apiKey = process.env.EMBEDDING_FALLBACK_KEY || process.env.GEMINI_API_KEY!;
      const modelToUse = cachedModelName || process.env.DEFAULT_GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:embedContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${modelToUse}`,
          content: { parts: [{ text: safeText }] },
          outputDimensionality: outputDimensions
        })
      });

      const data = await response.json();
      if (data.embedding && data.embedding.values) return { vector: data.embedding.values };
      throw new Error("Fallback returned invalid data");

    } catch (fallbackError) {
      console.error("FATAL: Embedding Emergency Fallback also failed!");
      return { vector: new Array(outputDimensions).fill(0) }; 
    }
  },

  async analyzeImage(buffer: Buffer) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = { inlineData: { data: buffer.toString("base64"), mimeType: "image/jpeg" } };
    const result = await model.generateContent(["Describe this diagram or image in detail:", imagePart]);
    return { description: result.response.text() };
  },

  async extractDocument(buffer: Buffer) {
    let apiKey = process.env.GEMINI_API_KEY;

    // 🟢 As requested: Check DB for embedding fallback AI if not in .env
    if (!apiKey && supabase) {
      const { data } = await supabase
        .from('api_configurations')
        .select('api_key')
        .eq('is_active', true)
        .eq('task_type', 'embedding')
        .order('priority', { ascending: true })
        .limit(1)
        .single();
      
      if (data && data.api_key) apiKey = data.api_key;
    }

    if (!apiKey) throw new Error("API Key for Gemini is completely missing from .env and Database.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const pdfPart = { inlineData: { data: buffer.toString("base64"), mimeType: "application/pdf" } };
    
    const prompt = "Extract all text, readable content, diagrams, and handwriting from this document perfectly. Return ONLY the raw extracted text in clean markdown format without any intro or outro.";
    
    const result = await model.generateContent([prompt, pdfPart]);
    return result.response.text();
  }
};
