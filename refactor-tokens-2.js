const fs = require('fs');
const path = require('path');

function refactorFile(file, successRegex) {
  const filePath = path.join(__dirname, 'backend', 'src', 'controllers', file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const deductionPattern = /const \{ error: deductErr \} = await (supabase|supabaseAdmin)\.from\('profiles'\)\.update\(\{ tokens: userProfile\.tokens - cost \}\)\.eq\('id', userId\);\s*if \(deductErr\) \{\s*res\.status\(\d+\)\.json\(\{ error: 'Failed to process transaction' \}\);\s*return;\s*\}\s*await \1\.from\('reward_transactions'\)\.insert\(\[\{ user_id: userId, amount: -cost, reason: '([^']+)' \}\]\)(?:\.catch\(\(\)=>\{\}\);)?/g;

  const match = deductionPattern.exec(content);
  if (match) {
    const dbClient = match[1];
    const reason = match[2];

    content = content.replace(match[0], '');

    const successMatch = successRegex.exec(content);
    if (successMatch) {
      const deductionCode = `
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        const { data: latestProfile } = await ${dbClient}.from('profiles').select('tokens').eq('id', userId).single();
        if (latestProfile) {
          await ${dbClient}.from('profiles').update({ tokens: latestProfile.tokens - cost }).eq('id', userId);
          await ${dbClient}.from('reward_transactions').insert([{ user_id: userId, amount: -cost, reason: '${reason}' }]);
        }
      }
      `;

      content = content.substring(0, successMatch.index) + deductionCode + '\n      ' + content.substring(successMatch.index);
      
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`Could not find success hook in ${file}`);
    }
  } else {
    console.log(`Could not find deduction block in ${file}`);
  }
}

refactorFile('story.controller.ts', /if \(streamCompletedCleanly/g);
refactorFile('wallpaper.controller.ts', /res\.setHeader\('Content-Type', 'image\/png'\);/g);
