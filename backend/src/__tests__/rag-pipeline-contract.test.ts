import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('upload to RAG canonical pipeline contract', () => {
  const server = read('backend/src/server.ts');
  const worker = read('backend/src/queue/worker.ts');
  const uploadRoute = read('backend/src/routes/upload.route.ts');

  it('uses only the document-processing queue for newly uploaded files', () => {
    expect(server).toContain("documentQueue.add('extract-and-embed'");
    expect(uploadRoute).toContain("documentQueue.add('extract-and-embed'");
    expect(uploadRoute).not.toContain("addJob('file-processing'");
  });

  it('writes canonical content chunks and marks a successful file indexed', () => {
    expect(worker).toContain('content: chunk');
    expect(worker).not.toContain('text_content: chunk');
    expect(worker).toContain(".update({ status: 'indexed' })");
  });

  it('requires authentication on the standalone upload route', () => {
    expect(uploadRoute).toContain("router.post('/upload', requireAuth");
  });
});
