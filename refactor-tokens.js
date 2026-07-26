const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

let updatedFiles = 0;

for (const file of files) {
  if (['reward.controller.ts', 'gamification.controller.ts', 'geomapper.controller.ts', 'chat.controller.ts'].includes(file)) continue;

  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Regex to match the deduction part:
  const deductionPattern = /const \{ error: deductErr \} = await (supabase|supabaseAdmin)\.from\('profiles'\)\.update\(\{ tokens: userProfile\.tokens - cost \}\)\.eq\('id', userId\);\s*if \(deductErr\) \{\s*res\.status\(500\)\.json\(\{ error: 'Failed to process transaction' \}\);\s*return;\s*\}\s*await \1\.from\('reward_transactions'\)\.insert\(\[\{ user_id: userId, amount: -cost, reason: '([^']+)' \}\]\)(?:\.catch\(\(\)=>\{\}\);)?/g;

  const match = deductionPattern.exec(content);
  if (match) {
    const dbClient = match[1];
    const reason = match[2];

    // Remove the deduction block from the top verification
    content = content.replace(match[0], '');

    // Now inject it right before the successful res.json or res.send at the bottom.
    // We look for a line that resembles res.json({ success: true... or res.json({ valid: true...
    
    // Safer: Look for the first res.json that is not inside an error condition (400, 401, 402, 404, 500)
    const resJsonRegex = /res\.json\(\{\s*(?!(error|message))[^}]+\}\);/g;
    
    let lastSuccessResJsonIndex = -1;
    let match2;
    while ((match2 = resJsonRegex.exec(content)) !== null) {
      lastSuccessResJsonIndex = match2.index;
    }

    if (lastSuccessResJsonIndex !== -1) {
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

      content = content.substring(0, lastSuccessResJsonIndex) + deductionCode + '\n      ' + content.substring(lastSuccessResJsonIndex);
      
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${file}`);
      updatedFiles++;
    } else {
      console.log(`Could not find success res.json in ${file}`);
    }
  }
}

console.log(`Total files updated: ${updatedFiles}`);
