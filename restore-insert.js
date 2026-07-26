const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');

const filesToFix = [
  { file: 'flashcard.controller.ts', reason: 'Flashcard Generator', amount: '-cost' },
  { file: 'gamification.controller.ts', reason: 'Panic Mode Instant Unlock', amount: '-cost' },
  { file: 'night.controller.ts', reason: 'Night Before Study', amount: '-cost' },
  { file: 'oracle.controller.ts', reason: 'Oracle Prediction', amount: '-cost' },
  { file: 'podcast.controller.ts', reason: 'Podcast Generator', amount: '-cost', isMultiple: true },
  { file: 'quiz.controller.ts', reason: 'Quiz Generation', amount: '-cost' },
  { file: 'solver.controller.ts', reason: 'Problem Solver Generation', amount: '-cost' }
];

for (const { file, reason, amount, isMultiple } of filesToFix) {
  const filePath = path.join(controllersDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix empty insert() -> insert([{ user_id: userId, amount: -cost, reason: '...' }])
  // We need to be careful with map and podcast as they have multiple.
  
  if (file === 'podcast.controller.ts') {
    content = content.replace(/await supabase.from\('reward_transactions'\)\.insert\(\);/g, (match, offset, str) => {
      // Check surrounding context to see if it's debate or podcast
      const contextBefore = str.substring(Math.max(0, offset - 500), offset);
      if (contextBefore.includes('DEBATE')) {
        return "await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: 'Debate Generator' }]);";
      } else {
        return "await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: 'Podcast Generator' }]);";
      }
    });
  } else if (file === 'gamification.controller.ts') {
    // Uses supabaseAdmin
    content = content.replace(/await supabaseAdmin\.from\('reward_transactions'\)\.insert\(\);/g, "await supabaseAdmin.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: '" + reason + "' }]);");
  } else if (file === 'flashcard.controller.ts') {
    content = content.replace(/await supabaseAdmin\.from\('reward_transactions'\)\.insert\(\);/g, "await supabaseAdmin.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: '" + reason + "' }]);");
  } else {
    content = content.replace(/await supabase\.from\('reward_transactions'\)\.insert\(\);/g, "await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: '" + reason + "' }]);");
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Restored insert in', file);
}

// Special case for map.controller.ts
const mapPath = path.join(controllersDir, 'map.controller.ts');
let mapContent = fs.readFileSync(mapPath, 'utf-8');
let mapMatches = 0;
mapContent = mapContent.replace(/await supabase\.from\('reward_transactions'\)\.insert\(\);/g, (match, offset, str) => {
  const contextBefore = str.substring(Math.max(0, offset - 500), offset);
  if (contextBefore.includes('AI Chat')) {
    return "await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -chatCost, reason: 'Mind Map AI Chat' }]);";
  } else {
    return "await supabase.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: 'Mind Map Generation' }]);";
  }
});
fs.writeFileSync(mapPath, mapContent, 'utf-8');
console.log('Restored insert in map.controller.ts');
