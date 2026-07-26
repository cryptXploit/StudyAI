// /**
//  * Citation Machine Controller - Thesis Hacker
//  * Architecture: citation-js -> Zero LLM Cost -> DB History
//  */

// import { Request, Response, Router } from 'express';
// import { requireAuth } from '../middlewares/auth.middleware';
// import { createClient } from '@supabase/supabase-js';

// // Using require as citation-js doesn't always have perfect ESModule/TypeScript definitions
// const Cite = require('citation-js');

// const supabaseAdmin = createClient(
//   process.env.SUPABASE_URL || '',
//   process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// );

// export async function generateCitationHandler(req: Request, res: Response): Promise<void> {
//   try {
//     const userId = (req as any).user?.id;
//     const { input_text, style = 'apa' } = req.body;

//     if (!userId || !input_text) {
//       res.status(400).json({ error: 'Missing required fields: input_text.' });
//       return;
//     }

//     // 1. 🚀 ZERO-COST CITATION GENERATION (No LLM)
//     let citationText = "";
//     try {
//       // Citation-js automatically fetches metadata for DOI, Wikidata, URLs, etc.
//       const citation = new Cite(input_text);
      
//       citationText = citation.format('bibliography', {
//         format: 'text',
//         template: style, // 'apa', 'harvard1', 'mla', 'vancouver', 'ieee'
//         lang: 'en-US'
//       }).trim();

//     } catch (parseError) {
//       console.error('[Citation Machine] Parsing Error:', parseError);
//       res.status(400).json({ error: 'Failed to extract data. Please provide a valid DOI, Website URL, or valid BibTeX/ISBN.' });
//       return;
//     }

//     if (!citationText) {
//       res.status(400).json({ error: 'No citation could be generated from the given input.' });
//       return;
//     }

//     // 2. Save to History
//     const { data: historyRecord } = await supabaseAdmin.from('citation_history').insert([{
//       user_id: userId,
//       input_text: input_text,
//       style: style,
//       citation: citationText
//     }]).select().single();

//     res.json({ success: true, citation: citationText, historyId: historyRecord?.id });

//   } catch (error: any) {
//     console.error('[Citation Machine] Error:', error);
//     res.status(500).json({ error: 'Internal server error while generating citation.' });
//   }
// }

// export async function getCitationHistoryHandler(req: Request, res: Response): Promise<void> {
//   try {
//     const userId = (req as any).user?.id;
//     const { data, error } = await supabaseAdmin.from('citation_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
//     if (error) throw error;
//     res.json({ success: true, history: data });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// }

// export async function deleteCitationHistoryHandler(req: Request, res: Response): Promise<void> {
//   try {
//     const userId = (req as any).user?.id;
//     const { id } = req.params;
//     const { error } = await supabaseAdmin.from('citation_history').delete().eq('id', id).eq('user_id', userId);
//     if (error) throw error;
//     res.json({ success: true });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// }

// export function registerCitationRoutes(app: any): void {
//   const router = Router();
//   router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateCitationHandler(req, res); });
//   router.get('/history', requireAuth, async (req: Request, res: Response) => { await getCitationHistoryHandler(req, res); });
//   router.delete('/history/:id', requireAuth, async (req: Request, res: Response) => { await deleteCitationHistoryHandler(req, res); });
//   app.use('/api/citation', router);
// }