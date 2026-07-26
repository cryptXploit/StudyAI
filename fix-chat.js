const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'controllers', 'chat.controller.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const target1 = `      // dYY Token Cost Check & Deduction (OWASP Safe)
      if (tier.toLowerCase() !== 'pro' && !cacheHit) {
        const chatCost = TOKEN_COSTS.AI_CHAT;
        const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
        
        if (profileErr || !userProfile || userProfile.tokens < chatCost) {
          res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: chatCost });
          return;
        }
        
        const { error: deductErr } = await supabase.from('profiles').update({ tokens: userProfile.tokens - chatCost }).eq('id', userId);
        if (deductErr) {
          res.status(500).json({ error: 'Failed to process transaction' });
          return;
        }
        
        await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -chatCost, reason: 'AI Chat Question' }]).catch(()=>{});
      }`;

const replacement1 = `      // dYY Token Cost Check (Deduct later on success)
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
      }`;

const target2 = `      await streamSSEResponse(res, streamResponse, {
        userId, fileIds: fileIdArray, conversationId, query: safeQuery, tier, cached: false, chunksCount: chunks.length, rawChunks: chunks, retrievalTime, memoryTime, totalTime: Date.now() - startTime, cacheKey, skipCacheWrite
      });`;

const replacement2 = `      await streamSSEResponse(res, streamResponse, {
        userId, fileIds: fileIdArray, conversationId, query: safeQuery, tier, cached: false, chunksCount: chunks.length, rawChunks: chunks, retrievalTime, memoryTime, totalTime: Date.now() - startTime, cacheKey, skipCacheWrite, cost: TOKEN_COSTS.AI_CHAT
      });`;

const target3 = `    if (streamCompletedCleanly) {
      const cacheKey = metadata.cacheKey;`;

const replacement3 = `    if (streamCompletedCleanly) {
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (metadata.cost && metadata.tier?.toLowerCase() !== 'pro') {
        const { data: latestProfile } = await supabase.from('profiles').select('tokens').eq('id', metadata.userId).single();
        if (latestProfile) {
          await supabase.from('profiles').update({ tokens: latestProfile.tokens - metadata.cost }).eq('id', metadata.userId);
          await supabase.from('reward_transactions').insert([{ user_id: metadata.userId, amount: -metadata.cost, reason: 'AI Chat Question' }]).catch(()=>{});
        }
      }

      const cacheKey = metadata.cacheKey;`;

// Using regex or exact string replacement
content = content.replace(/ \/\/ dYY. Token Cost Check & Deduction \(OWASP Safe\)[\s\S]*?\.catch\(\(\)=>\{\}\);\r?\n      \}/g, replacement1);
content = content.replace(/await streamSSEResponse\(res, streamResponse, \{[\s\S]*?skipCacheWrite\r?\n      \}\);/g, replacement2);
content = content.replace(/if \(streamCompletedCleanly\) \{\r?\n      const cacheKey = metadata\.cacheKey;/g, replacement3);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed chat controller');
