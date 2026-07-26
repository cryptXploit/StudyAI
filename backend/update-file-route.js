const fs = require('fs');

let code = fs.readFileSync('src/routes/file.route.ts', 'utf8');

if (!code.includes('import Redis from \'ioredis\'')) {
  code = code.replace(`import { createClient } from '@supabase/supabase-js';`, 
`import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');`);

  code += `

// --- SECURE PROXY TICKET SYSTEM ---

router.post('/download-ticket', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { fileId } = req.body;

    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('files')
      .select('storage_path, user_id')
      .eq('id', fileId)
      .single();

    if (dbError || !fileRecord || fileRecord.user_id !== userId) {
      res.status(403).json({ error: 'Unauthorized access' });
      return;
    }

    const ticketId = crypto.randomUUID();
    // Save ticket in Redis for 60 seconds
    await redis.setex(\`ticket:\${ticketId}\`, 60, fileRecord.storage_path);

    res.json({ ticketId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/proxy/:ticketId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const storagePath = await redis.get(\`ticket:\${ticketId}\`);

    if (!storagePath) {
      res.status(403).send('Invalid or expired ticket');
      return;
    }

    // Burn the ticket so it can only be used once
    await redis.del(\`ticket:\${ticketId}\`);

    let cleanPath = storagePath;
    if (cleanPath.startsWith('documents/')) cleanPath = cleanPath.substring(10);
    if (cleanPath.startsWith('/documents/')) cleanPath = cleanPath.substring(11);
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

    const { data, error } = await supabaseAdmin.storage.from('documents').download(cleanPath);
    if (error || !data) {
      res.status(500).send('Error downloading file from storage');
      return;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    // 'inline' means it will render in the browser securely
    res.setHeader('Content-Disposition', \`inline; filename="document.pdf"\`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});
`;

  fs.writeFileSync('src/routes/file.route.ts', code);
  console.log('Successfully updated file.route.ts');
} else {
  console.log('Already updated');
}
