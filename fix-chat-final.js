const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'controllers', 'chat.controller.ts');
let content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find where `const isFollowUp = ` is.
const isFollowUpIdx = lines.findIndex(l => l.includes('const isFollowUp = followUpKeywords.some'));

// Find where `try {` is before `if (fileIdArray.length > 0) {`
const tryBlockIdx = lines.findIndex(l => l.includes('if (fileIdArray.length > 0) {')) - 1;

// Between isFollowUpIdx and tryBlockIdx is the mess I made.
// I need to replace it with the proper cache checking logic.
const originalCacheLogic = `
    // SYLLABUS SAFE CACHE HASHING
    const syllabusKey = \`\${body.syllabusCourseName || ''}-\${(body.syllabusChapters || []).join(',')}-\${(body.syllabusTopics || []).join(',')}\`;
    const fileSalt = fileIdArray.sort().join(',');
    const cacheKey = \`chat:cache:v3:\${userId}:\${fileSalt}:\${language}:\${syllabusKey}:\${hashQuery(safeQuery)}\`;
    
    const skipCacheRead = isFollowUp || isRepeatQuestion;
    const skipCacheWrite = isFollowUp;

    if (!skipCacheRead) {
      const cached = await getCachedResponse(cacheKey);
      if (cached) {
        cacheHit = true;
        return serveSSEResponse(res, cached.answer, { userId, fileIds: fileIdArray, query: safeQuery, tier, cached: true, cacheAge: Date.now() - cached.timestamp, latency: Date.now() - startTime });
      }
    }

    const summaryKeywords = ['summarize', 'summary', 'overview', 'what is this document about', 'full document', 'entire file', 'sumarize', 'all documents'];
    const isSummaryRequest = summaryKeywords.some(keyword => safeQuery.toLowerCase().includes(keyword));

    const retrievalStart = Date.now();
    let chunks: any[] = []; let contextChunks = ""; let needFallbackRAG = false;
`;

// Replace lines between isFollowUpIdx+1 and tryBlockIdx with originalCacheLogic
lines.splice(isFollowUpIdx + 1, tryBlockIdx - (isFollowUpIdx + 1), originalCacheLogic);

// Now find the token check block at the bottom
// `const messages = [{ role: 'system' as const, content: systemPrompt }`
const messagesIdx = lines.findIndex(l => l.includes("const messages = [{ role: 'system' as const, content: systemPrompt }"));
const routerIdx = lines.findIndex(l => l.includes("const router = new ModelRouter();"));

const correctedTokenLogic = `
    // Token Cost Check (Deduct later on success)
    if (tier.toLowerCase() !== 'pro' && !cacheHit) {
      const chatCost = TOKEN_COSTS.AI_CHAT;
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr) {
        console.error('[Chat] Token Check DB Error:', profileErr);
        res.status(500).json({ error: 'Database error while checking tokens' });
        return;
      }
      
      if (!userProfile || userProfile.tokens < chatCost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: chatCost });
        return;
      }
    }
`;

lines.splice(messagesIdx + 1, routerIdx - (messagesIdx + 1), correctedTokenLogic);

fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('Restored and fixed chat controller');
