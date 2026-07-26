const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('page.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Mobile Smart Header')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/Production-ready-StudyAI/frontend/src/app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Mobile Floating Input Dock')) {
       let nextLineIdx = i + 1;
       while (nextLineIdx < lines.length && !lines[nextLineIdx].includes('<div className=')) {
          nextLineIdx++;
       }
       if (nextLineIdx < lines.length) {
         let line = lines[nextLineIdx];
         
         const mangled = "className={`{ ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}lg:hidden";
         
         if (line.includes(mangled)) {
             line = line.replace(mangled, 'className={`lg:hidden');
             
             if (line.includes('\`}>')) {
                 line = line.replace('\`}>', ' ${isHeaderVisible ? \'translate-y-0 opacity-100\' : \'translate-y-full opacity-0\'}\`}>');
             } else if (line.includes('\`} >')) {
                 line = line.replace('\`} >', ' ${isHeaderVisible ? \'translate-y-0 opacity-100\' : \'translate-y-full opacity-0\'}\`} >');
             }
             
             lines[nextLineIdx] = line;
             changed = true;
         }
       }
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('FIXED: ' + file);
  }
});
console.log('DONE');
