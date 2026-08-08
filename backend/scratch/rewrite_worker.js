const fs = require('fs');
const path = require('path');
const file = path.resolve('src/queue/worker.ts');
let code = fs.readFileSync(file, 'utf8');

// Update extractContent return type
code = code.replace(
  /async function extractContent\(buffer: Buffer, mimetype: string, path: string\): Promise<string> \{/g,
  `async function extractContent(buffer: Buffer, mimetype: string, path: string): Promise<Array<{content: string, pageNumber: number}>> {`
);

// Update PDF extraction block
code = code.replace(
  /let finalExtractedText = "";\s+let pdfDocRef: PDFDocument \| null = null; \/\/ Lazy load only if needed\s+for \(let i = 0; i < docs\.length; i\+\+\) \{[\s\S]*?return finalExtractedText;\s+\} catch/g,
  `let extractedChunks: Array<{content: string, pageNumber: number}> = [];
      let pdfDocRef: PDFDocument | null = null; // Lazy load only if needed

      for (let i = 0; i < docs.length; i++) {
        const pageText = docs[i].pageContent;
        const pageNum = docs[i].metadata?.loc?.pageNumber || (i + 1);
        
        // 🟢 Smart Decision Gate: If text is < 100 chars, it's likely an image/graph page
        if (pageText.trim().length < 100) {
          logger.info(\`[Page \${pageNum}] Suspiciously low text. Routing to OCR...\`);
          
          if (!pdfDocRef) {
            pdfDocRef = await PDFDocument.load(buffer);
          }
          
          // Slice this specific page (0-indexed in pdf-lib)
          const miniPdf = await PDFDocument.create();
          const [copiedPage] = await miniPdf.copyPages(pdfDocRef, [i]);
          miniPdf.addPage(copiedPage);
          
          const miniPdfBytes = await miniPdf.save();
          const miniBuffer = Buffer.from(miniPdfBytes);
          
          const ocrText = await performVisionAnalysis(miniBuffer);
          extractedChunks.push({ content: \`[Page \${pageNum}]\\n\${ocrText.trim()}\`, pageNumber: pageNum });
        } else {
          // Free Fast Lane: Normal digital text
          extractedChunks.push({ content: \`[Page \${pageNum}]\\n\${pageText.trim()}\`, pageNumber: pageNum });
        }
      }

      return extractedChunks;
    } catch`
);

// Update image extraction block
code = code.replace(
  /return await performVisionAnalysis\(buffer\);\s+\}\s+return "";/g,
  `const text = await performVisionAnalysis(buffer);
    return [{ content: text, pageNumber: 1 }];
  }
  return [];`
);

// Update processDocument
code = code.replace(
  /const text = await extractContent\(fileBuffer, safeMimetype, storagePath\);\s+const chunks = splitTextIntoChunks\(text, 1000\);\s+const fileName = storagePath\.split\('\/'\)\.pop\(\) \|\| 'Untitled Document';\s+await supabase\.from\('context_packs'\)\.insert\(\{[\s\S]*?\}\);\s+\/\/ 🟢 MAGICAL FIX: Bulk Insert Preparation \(Saves Database from Crashing\)\s+const chunksToInsert = \[\];\s+let index = 0;\s+for \(const chunk of chunks\) \{[\s\S]*?\}\s+index\+\+;\s+\}/g,
  `const pageChunks = await extractContent(fileBuffer, safeMimetype, storagePath);

  const fileName = storagePath.split('/').pop() || 'Untitled Document';
  const fullTextPreview = pageChunks.map(c => c.content).join(' ').substring(0, 500);
  
  await supabase.from('context_packs').insert({
    file_id: fileId,
    user_id: userId,
    name: \`\${fileName} - Summary\`,
    description: fullTextPreview + '... (Auto-generated context)',
  });

  // 🟢 MAGICAL FIX: Bulk Insert Preparation (Saves Database from Crashing)
  const chunksToInsert = [];
  let index = 0;

  for (const pageChunk of pageChunks) {
    // If a page is huge, we should still split it to avoid embedding size limits.
    const subChunks = splitTextIntoChunks(pageChunk.content, 1000);
    for (const chunk of subChunks) {
      if (chunk.trim().length < 10) continue;
      const vector = await generateEmbedding(chunk, 1536);
      chunksToInsert.push({
        file_id: fileId,
        user_id: userId,
        content: chunk,
        embedding: vector,
        chunk_index: index,
        page_number: pageChunk.pageNumber
      });
      index++;
    }
  }`
);

fs.writeFileSync(file, code);
console.log("Rewrote worker.ts!");
