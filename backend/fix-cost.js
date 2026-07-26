const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
let fixed = 0;
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /if\s*\(\s*tier\.toLowerCase\(\)\s*!==\s*'pro'\s*\)\s*\{\s*const\s*cost\s*=\s*TOKEN_COSTS\.([A-Z_]+)\s*;/g;
  
  if(regex.test(content)) {
    content = content.replace(regex, (match, p1) => `const cost = TOKEN_COSTS.${p1};\n    if (tier.toLowerCase() !== 'pro') {`);
    fs.writeFileSync(filePath, content);
    fixed++;
    console.log('Fixed', file);
  }
});
console.log('Fixed total:', fixed);
