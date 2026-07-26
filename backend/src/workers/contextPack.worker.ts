import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createWorker } from '../queue/worker';
import { connection as redis } from '../queue/connection';
import { ModelRouter } from '../ai/ModelRouter';
import { ChatMessage } from '../ai/ProviderAdapter';
import { GoogleGenAI } from '@google/genai';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const router = new ModelRouter();
const ai = new GoogleGenAI({});

interface ContextPackJobData {
  fileId: string;
  userId: string;
  tenantId?: string;
}

const GENERATOR_VERSION = '1.0.0';
const PROMPT_VERSION = '1.0.0';
const EMBEDDING_VERSION = 'text-embedding-004';

// Helper for concurrency
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const exec = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }).map(() => exec()));
  return results;
}

export const contextPackWorker = createWorker<ContextPackJobData>(
  'context-pack-queue',
  async (job: Job<ContextPackJobData>) => {
    const { fileId, userId, tenantId = 'default' } = job.data;
    console.log(`[ContextPackWorker] Starting generation for file: ${fileId}`);

    // 1. Fetch chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('file_chunks')
      .select('text_content, chunk_index')
      .eq('file_id', fileId)
      .order('chunk_index', { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      throw new Error(`Failed to fetch chunks or no chunks found for file: ${fileId}`);
    }

    const fullText = chunks.map(c => c.text_content).join('\n\n');
    const contentHash = crypto.createHash('md5').update(fullText).digest('hex');

    // 2. Optimization: Check existing pack by hash
    const { data: existingPack } = await supabase
      .from('context_packs')
      .select('id, content_hash')
      .eq('file_id', fileId)
      .eq('content_hash', contentHash)
      .single();

    if (existingPack) {
      console.log(`[ContextPackWorker] Pack already exists for hash ${contentHash}. Skipping generation.`);
      return { skipped: true, reason: 'hash_match' };
    }

    // 3. Generate structured data via LLM
    // We break this into concurrent requests to avoid massive single prompts and token limits
    // For production RAG, we use Pro tier for high reasoning.
    console.log(`[ContextPackWorker] Extracting intelligence using AI...`);

    const extractionPrompts = [
      {
        key: 'summary_concepts_map',
        prompt: `Analyze the following text and extract JSON containing:
1. "summary": { "short": "", "detailed": "", "bengali": "", "english": "" }
2. "key_concepts": [{ "concept": "", "definition": "", "importance_score": 1-10 }]
3. "topic_map": { "chapters": [{ "title": "", "sections": [{ "title": "", "topics": [] }] }] }
4. "knowledge_graph": { "entities": [], "relationships": [{ "source": "", "target": "", "relation": "" }] }
Text: ${fullText.substring(0, 30000)} // Truncated for example safety, in reality use map-reduce for large docs.
Respond ONLY with raw JSON.`
      },
      {
        key: 'learning_exam_qa',
        prompt: `Analyze the following text and extract JSON containing:
1. "exam_notes": [{ "fact": "", "formula": "", "likely_exam_point": boolean }]
2. "flashcards": [{ "question": "", "answer": "", "difficulty": "easy|medium|hard" }]
3. "quizzes": { "mcq": [], "short": [], "long": [] }
4. "suggested_questions": { "beginner": [], "intermediate": [], "advanced": [] }
5. "learning_objectives": []
6. "difficulty_map": { "easy": [], "medium": [], "hard": [] }
7. "study_recommendations": { "weak_areas": [], "important_sections": [], "revision_suggestions": [] }
Text: ${fullText.substring(0, 30000)}
Respond ONLY with raw JSON.`
      }
    ];

    const aiResults = await mapConcurrent(extractionPrompts, 2, async (ep) => {
      const messages: ChatMessage[] = [{ role: 'user', content: ep.prompt }];
      const responseText = await router.generate(messages, userId, 'Pro', { temperature: 0.2 });
      try {
        // basic clean up of markdown json blocks
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return { key: ep.key, data: JSON.parse(cleaned) };
      } catch (e) {
        console.error(`Failed to parse JSON for ${ep.key}`);
        return { key: ep.key, data: {} };
      }
    });

    const dataObj = aiResults.reduce((acc, curr) => ({ ...acc, ...curr.data }), {} as any);

    // 4. Generate Topic Embeddings
    console.log(`[ContextPackWorker] Generating embeddings for metadata...`);
    const textsToEmbed = [
      dataObj.summary?.detailed || '',
      ...(dataObj.key_concepts || []).map((c: any) => c.concept + ': ' + c.definition),
    ].filter(t => t.length > 0);

    const embeddings = await mapConcurrent(textsToEmbed, 5, async (text) => {
      const embedResponse = await ai.models.embedContent({ model: 'text-embedding-004', contents: text });
      return embedResponse.embeddings?.[0]?.values || (embedResponse as any).embedding?.values || [];
    });

    // 5. Build final context pack
    const contextPack = {
      file_id: fileId,
      user_id: userId,
      tenant_id: tenantId,
      content_hash: contentHash,
      context_pack_version: 1,
      generator_version: GENERATOR_VERSION,
      prompt_version: PROMPT_VERSION,
      embedding_version: EMBEDDING_VERSION,
      
      summary: dataObj.summary || {},
      key_concepts: dataObj.key_concepts || [],
      topic_map: dataObj.topic_map || {},
      knowledge_graph: dataObj.knowledge_graph || {},
      exam_notes: dataObj.exam_notes || [],
      flashcards: dataObj.flashcards || [],
      quizzes: dataObj.quizzes || {},
      suggested_questions: dataObj.suggested_questions || {},
      learning_objectives: dataObj.learning_objectives || [],
      difficulty_map: dataObj.difficulty_map || {},
      study_recommendations: dataObj.study_recommendations || {},
      
      retrieval_metadata: {
        chunk_coverage: chunks.length,
        concept_coverage: (dataObj.key_concepts || []).length,
      },
      
      // Store average or primary embedding (simplification for DB schema)
      primary_embedding: embeddings[0] || null
    };

    // 6. Store in Supabase
    console.log(`[ContextPackWorker] Storing pack in database...`);
    const { data: savedPack, error: saveError } = await supabase
      .from('context_packs')
      .upsert(contextPack, { onConflict: 'file_id' })
      .select('id')
      .single();

    if (saveError && saveError.code !== 'PGRST116') {
      throw new Error(`Failed to save context pack: ${saveError.message}`);
    }

    // 7. Caching in Redis
    console.log(`[ContextPackWorker] Caching to Redis...`);
    const cacheKey = `context_pack:${fileId}`;
    await redis.set(cacheKey, JSON.stringify(contextPack), 'EX', 86400 * 7); // Cache for 7 days
    await redis.set(`topics:${fileId}`, JSON.stringify(contextPack.topic_map), 'EX', 86400 * 7);
    await redis.set(`summaries:${fileId}`, JSON.stringify(contextPack.summary), 'EX', 86400 * 7);

    console.log(`[ContextPackWorker] Completed Context Pack Generation for ${fileId}`);
    return { success: true, contextPackId: savedPack?.id };
  },
  (job) => job.data.fileId // Idempotency key
);

export default contextPackWorker;
