import sys

file_path = "src/queue/worker.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update extractContent return type
code = code.replace(
    "async function extractContent(buffer: Buffer, mimetype: string, path: string): Promise<string> {",
    "async function extractContent(buffer: Buffer, mimetype: string, path: string): Promise<Array<{content: string, pageNumber: number}>> {"
)

# 2. Update PDF logic
old_pdf_logic = """      let finalExtractedText = "";
      let pdfDocRef: PDFDocument | null = null; // Lazy load only if needed

      for (let i = 0; i < docs.length; i++) {
        const pageText = docs[i].pageContent;
        const pageNum = docs[i].metadata?.loc?.pageNumber || (i + 1);
        
        // 🟢 Smart Decision Gate: If text is < 100 chars, it's likely an image/graph page
        if (pageText.trim().length < 100) {
          logger.info(`[Page ${pageNum}] Suspiciously low text. Routing to Gemini Flash OCR...`);
          
          if (!pdfDocRef) {
            pdfDocRef = await PDFDocument.load(buffer);
          }
          
          // Slice this specific page (0-indexed in pdf-lib)
          const miniPdf = await PDFDocument.create();
          const [copiedPage] = await miniPdf.copyPages(pdfDocRef, [i]);
          miniPdf.addPage(copiedPage);
          
          const miniPdfBytes = await miniPdf.save();
          const miniBuffer = Buffer.from(miniPdfBytes);
          
          const geminiText = await modelRouter.extractDocument(miniBuffer);
          finalExtractedText += `\\n\\n[Page ${pageNum}]\\n${geminiText.trim()}`;
        } else {
          // Free Fast Lane: Normal digital text
          finalExtractedText += `\\n\\n[Page ${pageNum}]\\n${pageText.trim()}`;
        }
      }

      return finalExtractedText;"""

new_pdf_logic = """      let extractedChunks: Array<{content: string, pageNumber: number}> = [];
      let pdfDocRef: PDFDocument | null = null; // Lazy load only if needed

      for (let i = 0; i < docs.length; i++) {
        const pageText = docs[i].pageContent;
        const pageNum = docs[i].metadata?.loc?.pageNumber || (i + 1);
        
        // 🟢 Smart Decision Gate: If text is < 100 chars, it's likely an image/graph page
        if (pageText.trim().length < 100) {
          logger.info(`[Page ${pageNum}] Suspiciously low text. Routing to OCR...`);
          
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
          extractedChunks.push({ content: `[Page ${pageNum}]\\n${ocrText.trim()}`, pageNumber: pageNum });
        } else {
          // Free Fast Lane: Normal digital text
          extractedChunks.push({ content: `[Page ${pageNum}]\\n${pageText.trim()}`, pageNumber: pageNum });
        }
      }

      return extractedChunks;"""

code = code.replace(old_pdf_logic, new_pdf_logic)

# 3. Update image logic
old_image_logic = """    return await performVisionAnalysis(buffer);
  }
  return "";"""

new_image_logic = """    const text = await performVisionAnalysis(buffer);
    return [{ content: text, pageNumber: 1 }];
  }
  return [];"""

code = code.replace(old_image_logic, new_image_logic)

# 4. Update processDocument
old_doc_logic = """  const text = await extractContent(fileBuffer, safeMimetype, storagePath);
  const chunks = splitTextIntoChunks(text, 1000);

  const fileName = storagePath.split('/').pop() || 'Untitled Document';
  await supabase.from('context_packs').insert({
    file_id: fileId,
    user_id: userId,
    name: `${fileName} - Summary`,
    description: text.substring(0, 500) + '... (Auto-generated context)',
  });

  // 🟢 MAGICAL FIX: Bulk Insert Preparation (Saves Database from Crashing)
  const chunksToInsert = [];
  let index = 0;

  for (const chunk of chunks) {
    const vector = await generateEmbedding(chunk, 1536);
    chunksToInsert.push({
      file_id: fileId,
      user_id: userId,
      content: chunk,
      embedding: vector,
      chunk_index: index 
    });
    index++;
  }"""

new_doc_logic = """  const pageChunks = await extractContent(fileBuffer, safeMimetype, storagePath);

  const fileName = storagePath.split('/').pop() || 'Untitled Document';
  const fullTextPreview = pageChunks.map(c => c.content).join(' ').substring(0, 500);
  
  await supabase.from('context_packs').insert({
    file_id: fileId,
    user_id: userId,
    name: `${fileName} - Summary`,
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
  }"""

code = code.replace(old_doc_logic, new_doc_logic)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("worker.ts rewritten successfully.")
