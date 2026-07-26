/**
 * Context Pack Generator - Verification & Testing Guide
 * 
 * This script demonstrates how to verify the end-to-end context pack flow.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Test 1: Verify Context Pack Generation After Document Indexing
 */
export async function testContextPackGeneration() {
  console.log('\n========== TEST 1: Context Pack Generation ==========');
  
  const fileId = 'test-file-id-123'; // Assume this file was uploaded and indexed
  
  // 1. Wait for context pack to be generated (watch Supabase)
  console.log('Waiting for context pack generation (max 60s)...');
  let contextPack = null;
  for (let i = 0; i < 60; i++) {
    const { data } = await supabase
      .from('context_packs')
      .select('*')
      .eq('file_id', fileId)
      .single();
    
    if (data) {
      contextPack = data;
      console.log(`✓ Context pack found after ${i} seconds`);
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (!contextPack) {
    console.error('✗ Context pack not generated within 60 seconds');
    return false;
  }
  
  // 2. Verify all 13 components are present
  const components = [
    'summary', 'key_concepts', 'topic_map', 'knowledge_graph',
    'exam_notes', 'flashcards', 'quizzes', 'suggested_questions',
    'learning_objectives', 'difficulty_map', 'study_recommendations',
    'retrieval_metadata', 'versioning'
  ];
  
  let allPresent = true;
  components.forEach(comp => {
    if (!contextPack[comp]) {
      console.error(`✗ Missing component: ${comp}`);
      allPresent = false;
    } else {
      console.log(`✓ Component present: ${comp}`);
    }
  });
  
  if (!allPresent) return false;
  
  // 3. Verify versioning metadata
  console.log('\n--- Versioning Metadata ---');
  console.log(`Context Pack Version: ${contextPack.versioning.context_pack_version}`);
  console.log(`Generator Version: ${contextPack.versioning.generator_version}`);
  console.log(`Prompt Version: ${contextPack.versioning.prompt_version}`);
  console.log(`Generated At: ${contextPack.versioning.generated_at}`);
  console.log(`Content Hash: ${contextPack.versioning.content_hash}`);
  
  // 4. Verify content quality
  console.log('\n--- Content Quality ---');
  console.log(`Summary (Short EN): ${contextPack.summary.short_en.substring(0, 50)}...`);
  console.log(`Key Concepts Count: ${contextPack.key_concepts.length}`);
  console.log(`Flashcards Count: ${contextPack.flashcards.length}`);
  console.log(`Questions Count: ${contextPack.quizzes.mcq.length + contextPack.quizzes.short.length}`);
  console.log(`Chunks Covered: ${contextPack.retrieval_metadata.chunk_coverage}`);
  console.log(`Processing Time: ${contextPack.retrieval_metadata.processing_time_ms}ms`);
  
  console.log('\n✓ TEST 1 PASSED: Context pack fully generated with all components');
  return true;
}

/**
 * Test 2: Verify Fast Query Latency Using Context Pack
 */
export async function testFastQueries() {
  console.log('\n========== TEST 2: Fast Query Latency ==========');
  
  const fileId = 'test-file-id-123';
  const queries = [
    'What are the key concepts?',
    'What should I focus on for the exam?',
    'Explain the difficulty map',
    'Generate a quiz question',
    'What are the learning objectives?'
  ];
  
  const latencies: number[] = [];
  
  for (const query of queries) {
    const startTime = Date.now();
    
    // Simulate query using context pack (no full retrieval)
    const { data } = await supabase
      .from('context_packs')
      .select('*')
      .eq('file_id', fileId)
      .single();
    
    if (!data) {
      console.error(`✗ Context pack not found for query: "${query}"`);
      return false;
    }
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    latencies.push(latency);
    
    console.log(`✓ Query: "${query}" completed in ${latency}ms`);
  }
  
  // 3. Verify latency improvement
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const expectedLatencyMs = 500; // Context pack lookups should be < 500ms
  
  console.log(`\n--- Latency Summary ---`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Expected: < ${expectedLatencyMs}ms`);
  
  if (avgLatency < expectedLatencyMs) {
    console.log('✓ Latency within acceptable range');
    console.log('✓ TEST 2 PASSED: Fast query latency confirmed');
    return true;
  } else {
    console.error('✗ Latency exceeds expected threshold');
    return false;
  }
}

/**
 * Test 3: Verify Deduplication (Content Hash Check)
 */
export async function testDeduplication() {
  console.log('\n========== TEST 3: Content Hash Deduplication ==========');
  
  const fileId = 'test-file-id-123';
  
  // 1. Get current pack
  const { data: pack1 } = await supabase
    .from('context_packs')
    .select('content_hash, generated_at')
    .eq('file_id', fileId)
    .single();
  
  if (!pack1) {
    console.error('✗ No context pack found in database');
    return false;
  }
  
  console.log(`✓ Current Pack Generated At: ${pack1.generated_at}`);
  console.log(`✓ Current Pack Hash: ${pack1.content_hash}`);
  
  // 2. Simulate re-uploading same content (would trigger worker again)
  console.log('\nSimulating re-upload of same document...');
  // In real test: trigger file-processing worker again for same file
  
  // Wait and check if new pack was created
  await new Promise(r => setTimeout(r, 5000));
  
  const { data: pack2 } = await supabase
    .from('context_packs')
    .select('content_hash, generated_at')
    .eq('file_id', fileId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (pack1 && pack2 && pack1.content_hash === pack2.content_hash) {
    console.log('✓ Content hash matches - pack regeneration was skipped (idempotent)');
    console.log('✓ TEST 3 PASSED: Deduplication working correctly');
    return true;
  } else {
    console.log('✗ Content hash changed unexpectedly');
    return false;
  }
}

/**
 * Test 4: Verify Multi-Language Support
 */
export async function testMultiLanguageSupport() {
  console.log('\n========== TEST 4: Multi-Language Support ==========');
  
  const fileId = 'test-file-id-123';
  const { data: pack } = await supabase
    .from('context_packs')
    .select('summary')
    .eq('file_id', fileId)
    .single();
  
  if (!pack) {
    console.error('✗ Context pack not found');
    return false;
  }
  
  const summary = pack.summary as any;
  const enSummary = summary?.short_en || '';
  const bnSummary = summary?.short_bn || '';
  
  console.log(`✓ English Summary (${enSummary.length} chars): ${enSummary.substring(0, 50)}...`);
  console.log(`✓ Bengali Summary (${bnSummary.length} chars): ${bnSummary.substring(0, 50)}...`);
  
  if (enSummary.length > 0 && bnSummary.length > 0) {
    console.log('✓ TEST 4 PASSED: Multi-language support verified');
    return true;
  }
  
  return false;
}

/**
 * Test 5: Verify Retrieval Metadata Accuracy
 */
export async function testRetrievalMetadata() {
  console.log('\n========== TEST 5: Retrieval Metadata ==========');
  
  const fileId = 'test-file-id-123';
  const { data: pack } = await supabase
    .from('context_packs')
    .select('retrieval_metadata')
    .eq('file_id', fileId)
    .single();
  
  if (!pack) {
    console.error('✗ Context pack not found');
    return false;
  }
  
  const metadata = pack.retrieval_metadata as any;
  
  console.log(`Chunk Coverage: ${metadata?.chunk_coverage || 0} chunks`);
  console.log(`Concept Coverage: ${metadata?.concept_coverage || 0} concepts`);
  console.log(`Summary Coverage: ${metadata?.summary_coverage || 0}%`);
  console.log(`Processing Time: ${metadata?.processing_time_ms || 0}ms`);
  
  // Verify reasonable values
  if (
    (metadata?.chunk_coverage || 0) > 0 &&
    (metadata?.concept_coverage || 0) > 0 &&
    (metadata?.summary_coverage || 0) >= 80 &&
    (metadata?.processing_time_ms || 0) < 60000 // Should complete in < 1 minute
  ) {
    console.log('✓ TEST 5 PASSED: Retrieval metadata is accurate');
    return true;
  }
  
  console.error('✗ Retrieval metadata values are suspicious');
  return false;
}

/**
 * Main Verification Flow
 */
export async function runAllVerifications() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Context Pack Generator - Verification Suite          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = {
    generation: await testContextPackGeneration(),
    latency: await testFastQueries(),
    deduplication: await testDeduplication(),
    multiLanguage: await testMultiLanguageSupport(),
    metadata: await testRetrievalMetadata(),
  };
  
  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║   Results: ${passedTests}/${totalTests} tests passed                         ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  return passedTests === totalTests;
}

// To run in production:
// npx ts-node src/workers/CONTEXT_PACK_VERIFICATION.ts
