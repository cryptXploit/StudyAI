const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Look for .catch(()=>{}) or .catch(() => {}) attached to insert or any supabase call.
  // The easiest is to just replace .insert([...]).catch(()=>{}); with .insert([...]);
  
  if (content.includes('.catch(()=>{})') || content.includes('.catch(() => {})')) {
    // Specifically target the reward_transactions insert catch
    const regex1 = /\.insert\((.*?)\)\.catch\(\(\s*\)=>\s*\{\}\);/g;
    const regex2 = /\.catch\(\(\s*\)=>\s*\{\}\)/g;
    
    // Actually, there are things like timeoutPromise.catch(() => {}) which ARE promises and need catch!
    // So ONLY replace the ones attached to supabase inserts or updates.
    // Let's replace ONLY .insert([...]).catch(()=>{}) -> .insert([...])
    
    let original = content;
    content = content.replace(/\.insert\((.*?)\)\.catch\(\(\s*\)=>\s*\{\}\);/g, '.insert();');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed supabase catch in', file);
      updatedCount++;
    }
  }
}
console.log('Total files fixed:', updatedCount);
