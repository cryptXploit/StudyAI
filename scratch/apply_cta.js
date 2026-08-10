const fs = require('fs');
const path = require('path');

const baseDir = 'D:/Production-ready-StudyAI/frontend/src/app';

const targetFiles = [
  'chat/page.tsx',
  'dashboard/oracle/page.tsx',
  'flashcards/page.tsx',
  'notes-purifier/page.tsx',
  'quiz/page.tsx',
  'solver/page.tsx',
  'story/page.tsx'
];

for (const relPath of targetFiles) {
  const filePath = path.join(baseDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add the import if not exists
  if (!content.includes('import UploadCTA')) {
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.substring(0, endOfLastImport) + 
                "\nimport UploadCTA from '@/components/dashboard/UploadCTA';" + 
                content.substring(endOfLastImport);
      changed = true;
    }
  }

  // Replace file empty states
  const fileRegex = /(?:files|userFiles)\.length === 0 \? \(\s*<(?:div|p)[^>]*>[\s\S]*?<\/(?:div|p)>\s*\) : \(/g;
  content = content.replace(fileRegex, (match) => {
    changed = true;
    const arrayName = match.includes('userFiles') ? 'userFiles' : 'files';
    return `${arrayName}.length === 0 ? (\n                <UploadCTA type="source" title="No Sources Found" description="Upload PDFs or Documents in your workspace to enable AI to chat with them." />\n              ) : (`;
  });

  // Replace syllabus empty states (in chat/page.tsx and oracle/page.tsx usually)
  const syllabusRegex = /syllabuses\.length === 0 \? \(\s*<(?:div|p)[^>]*>[\s\S]*?<\/(?:div|p)>\s*\) : \(/g;
  content = content.replace(syllabusRegex, (match) => {
    changed = true;
    return `syllabuses.length === 0 ? (\n                <UploadCTA type="syllabus" title="No Syllabus Forged Yet" description="Create a structured syllabus in your workspace to generate targeted study materials." />\n              ) : (`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${relPath}`);
  } else {
    console.log(`No changes made to ${relPath}`);
  }
}
