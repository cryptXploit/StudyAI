import { registerQuizRoutes } from './controllers/quiz.controller';
import { registerLiveRoutes } from './controllers/live.controller';
import { registerNightRoutes } from './controllers/night.controller'; // উপরে ইমপোর্ট করুন
import { registerMapRoutes } from './controllers/map.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerFlashcardRoutes } from './controllers/flashcard.controller';
import { registerStoryRoutes } from './controllers/story.controller';
import { registerSolverRoutes } from './controllers/solver.controller';
import { registerPodcastRoutes } from './controllers/podcast.controller';
import { registerMoleculeRoutes } from './controllers/molecule.controller';
import { registerCurveRoutes } from './controllers/curve.controller';
import { registerPlannerRoutes } from './controllers/planner.controller';
import { registerPresentationRoutes } from './controllers/presentation.controller';
import { registerFlowchartRoutes } from './controllers/flowchart.controller';
import { registerWallpaperRoutes } from './controllers/wallpaper.controller';
import { registerLogicRoutes } from './controllers/logicflow.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerUniverseRoutes } from './controllers/universe.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerTimelineRoutes } from './controllers/timeline.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerBionicRoutes } from './controllers/bionic.controller';
import { registerPurifierRoutes } from './controllers/purifier.controller';
import { registerCalendarRoutes } from './controllers/calendar.controller';
import { registerLabGraphRoutes } from './controllers/labgraph.controller';
import { registerBattleRoutes } from './controllers/battle.controller';
import { registerYoutubeRoutes } from './controllers/youtube.controller';
import { Server } from 'socket.io';
import http from 'http';

import './core/logger'; // side-effect: routes console -> structured logger
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { traceMiddleware } from './core/tracing';
import { connection } from './queue/connection';
import { createClient } from '@supabase/supabase-js';
import logger from './core/logger';
import multer from 'multer';
import { registerChatRoutes } from './controllers/chat.controller';
import { requireAuth } from './middlewares/auth.middleware';
import { documentQueue } from './queue/connection';
import './queue/oracleWorker'; // 🟢 Start the Oracle background worker
import './workers/subscriptionWorker'; // 🟢 Start the Subscription Expiration Checker

import { registerFocusRoutes } from './controllers/focus.controller';
import { registerBattleRoutes2 } from './controllers/battle2.controller';
import { registerRewardRoutes } from './controllers/reward.controller';
import { registerSyllabusRoutes } from './controllers/syllabus.controller';
import { registerGeoMapperRoutes } from './controllers/geomapper.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerCareerRoutes } from './controllers/career.controller';
import { registerNotesRoutes } from './controllers/notes.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import oracleRoutes from './routes/oracle.route';
import { registerAdminRoutes } from './controllers/admin.controller';
import paymentRoutes from './routes/payment.routes';
import paddleRoutes from './routes/paddle.routes';
import feedbackRoutes from './routes/feedback.routes';
import marketingRoutes from './routes/marketing.routes';

import fileRoutes from './routes/file.route';
import {registerBookJumperRoutes} from './controllers/bookjumper.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
// import { registerCitationRoutes } from './controllers/citation.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerGamificationRoutes } from './controllers/gamification.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
import { registerProfileRoutes } from './controllers/profile.controller'; // 🟢 একদম উপরে ইমপোর্ট করুন
// import { registerPanicRoutes } from './controllers/panic.controller';


dotenv.config();

// 🟢 NEW: Global Error Handlers to prevent terminal crash from Uncaught Exceptions (like MsEdgeTTS streams)
process.on('uncaughtException', (err) => {
  console.warn('[System] Uncaught Exception caught gracefully:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 🟢 ZERO-LATENCY MULTIPLAYER SOCKET ENGINE
const roomUsers: Record<string, any[]> = {};

// 🟢 BATTLE GROUND MULTIPLAYER ENGINE
const battleRooms: Record<string, { players: any[], currentQuestion: number, status: string }> = {};

// Tracing middleware - attaches X-Trace-Id
app.use(traceMiddleware);

// 1. Helmet for security headers and XSS protection
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS restricted to frontend URL (added fallback for network IPs during dev)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and local IPs
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost') || origin.startsWith('http://192.168.') || origin.startsWith('http://172.')) {
        return callback(null, true);
      }
    }
    
    // Check against the configured FRONTEND_URL
    if (origin === frontendUrl) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// MUST mount Paddle webhooks BEFORE global express.json() so it can parse the raw body for signature verification
app.use('/api/payments/paddle', paddleRoutes);

// 3. Body parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. Custom middleware to sanitize incoming inputs to prevent NoSQL/SQL injection
const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.replace(/\x00/g, ''); 
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') {
    const sanitizedObj: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (key.startsWith('$') || key.includes('.')) continue;
        sanitizedObj[key] = sanitizeValue(value[key]);
      }
    }
    return sanitizedObj;
  }
  return value;
};

const sanitizeInput = (req: any, res: any, next: any) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
app.use(sanitizeInput);

// ==========================================
// HEALTH CHECK ROUTE (Skips rate limiting)
// ==========================================
app.get('/health', async (req: Request, res: Response) => {
  const results: any = { redis: { ok: false }, supabase: { ok: false }, bullmq: { ok: false } };

  try {
    const pong = await connection.ping();    
    results.bullmq.ok = !!pong;
  } catch (err: any) {
    logger.error('health.redis', { error: err?.message || String(err) });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { error } = await supabase.from('files').select('id').limit(1).maybeSingle();
      results.supabase.ok = !error;
    } else {
      results.supabase.ok = true; 
    }
  } catch (err: any) {
    logger.error('health.supabase', { error: err?.message || String(err) });
  }

  const overall = results.redis.ok && results.supabase.ok && results.bullmq.ok;
  const statusCode = overall ? 200 : 503;
  
  logger.info('health.check', { status: overall ? 'ok' : 'degraded', components: results, statusCode });
  res.status(statusCode).json({ status: overall ? 'ok' : 'degraded', timestamp: new Date().toISOString(), components: results });
});

// ==========================================
// RATE LIMITING FOR API ROUTES
// ==========================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // Increased from 100 to 1000 to accommodate heavy polling tasks
  message: 'Too many requests from this IP, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ==========================================
// API ROUTES
// ==========================================
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type. Upload a PDF, JPEG, or PNG.' });
    }

    const userId = (req as any).user.id;
    const originalName = req.file.originalname;
    
    // Create a Supabase Admin Client for backend operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 1. Generate a unique path for the Storage Bucket
    const fileExt = originalName.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // 2. Upload the actual PDF to Supabase 'documents' bucket
    const { data: storageData, error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    // 3. Create a record in the 'files' table
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        user_id: userId,
        name: originalName,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        status: 'uploading', // Frontend will show "Uploading/Processing" badge
        storage_path: fileName, // Link to the bucket
        file_url: fileName
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete from storage if DB insert fails
      await supabaseAdmin.storage.from('documents').remove([fileName]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // 5. Fire Event to BullMQ
    await documentQueue.add('extract-and-embed', {
      fileId: fileRecord.id,
      userId: userId,
      storagePath: fileName,
      mimetype: req.file.mimetype,
      tier: 'Free' // (বা ইউজারের ডাটাবেস থেকে পাওয়া টিয়ার)
    });

    // 6. Send success response to Frontend
    res.status(200).json({ 
      success: true, 
      fileId: fileRecord.id,
      message: 'File successfully uploaded and queued for AI indexing' 
    });

    // 5. TODO: Send to BullMQ Worker here for text extraction & chunking
    // e.g., fileQueue.add('process-document', { fileId: fileRecord.id, userId, storagePath: fileName });

  } catch (error) {
    console.error('[Upload API] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error during upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomCode, user }) => {
    socket.join(roomCode);
    if (!roomUsers[roomCode]) roomUsers[roomCode] = [];
    
    // Add user if not exists
    const existing = roomUsers[roomCode].find(u => u.id === user.id);
    if (!existing) {
      roomUsers[roomCode].push({ id: user.id, name: user.name || 'Student', isFocused: true });
    }
    io.to(roomCode).emit('room-update', roomUsers[roomCode]);
  });

  socket.on('tab-status', ({ roomCode, userId, isFocused }) => {
    if (roomUsers[roomCode]) {
      const user = roomUsers[roomCode].find(u => u.id === userId);
      if (user) {
         user.isFocused = isFocused;
         io.to(roomCode).emit('room-update', roomUsers[roomCode]);
      }
    }
  });

  // ⚔️ Battle Arena Sockets
  socket.on('join-battle', ({ roomCode, user }) => {
    socket.join(roomCode);
    if (!battleRooms[roomCode]) {
      battleRooms[roomCode] = { players: [], currentQuestion: 0, status: 'waiting' };
    }
    
    const existing = battleRooms[roomCode].players.find(u => u.id === user.id);
    if (!existing) {
      battleRooms[roomCode].players.push({ id: user.id, name: user.name, score: 0 });
    }
    io.to(roomCode).emit('battle-update', battleRooms[roomCode]);
  });

  socket.on('start-battle', ({ roomCode }) => {
    if (battleRooms[roomCode]) {
      battleRooms[roomCode].status = 'playing';
      battleRooms[roomCode].currentQuestion = 0;
      io.to(roomCode).emit('battle-update', battleRooms[roomCode]);
    }
  });

  socket.on('submit-answer', ({ roomCode, userId, isCorrect, timeBonus }) => {
    if (battleRooms[roomCode]) {
      const player = battleRooms[roomCode].players.find(u => u.id === userId);
      if (player && isCorrect) {
        // More points for faster answers! (Base 100 + up to 50 time bonus)
        player.score += (100 + timeBonus); 
      }
      // Sort leaderboard
      battleRooms[roomCode].players.sort((a, b) => b.score - a.score);
      io.to(roomCode).emit('battle-update', battleRooms[roomCode]);
    }
  });

  socket.on('next-question', ({ roomCode, questionIndex }) => {
    if (battleRooms[roomCode]) {
      battleRooms[roomCode].currentQuestion = questionIndex;
      io.to(roomCode).emit('battle-update', battleRooms[roomCode]);
    }
  });

  socket.on('disconnect', () => {
    // Optional: handle user leaving (cleanup)
  });
});






registerChatRoutes(app);
registerLiveRoutes(app);
registerQuizRoutes(app); // এখানে কল করে দিবেন
registerNightRoutes(app); // 🟢 এখানে কল করুন
registerMapRoutes(app); // 🟢 এখানে কল করুন
registerFlashcardRoutes(app); // 🟢 এখানে কল করুন
registerStoryRoutes(app);
registerSolverRoutes(app)
registerPodcastRoutes(app)
registerMoleculeRoutes(app)
registerCurveRoutes(app);
registerPlannerRoutes(app);
registerPresentationRoutes(app);
registerFlowchartRoutes(app);
registerWallpaperRoutes(app);
registerLogicRoutes(app);
registerUniverseRoutes(app);
registerTimelineRoutes(app);
registerBionicRoutes(app);
registerPurifierRoutes(app);
registerCalendarRoutes(app);
registerLabGraphRoutes(app);
registerBattleRoutes(app);
registerYoutubeRoutes(app);
registerFocusRoutes(app);
registerBattleRoutes2(app);
registerRewardRoutes(app);
registerSyllabusRoutes(app);
registerGeoMapperRoutes(app);
registerCareerRoutes(app);
registerNotesRoutes(app);

app.use('/api/files', fileRoutes);
registerBookJumperRoutes(app);
app.use('/api/oracle', requireAuth, oracleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/marketing', marketingRoutes);

// dYY Serve uploaded files natively in development (Optional);
registerGamificationRoutes(app);
registerProfileRoutes(app);
registerAdminRoutes(app);
// registerPanicRoutes(app);

// Keep the error handler last so errors from every registered route reach it.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', {
    message: err?.message || 'unknown',
    stack: err?.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export { app, server };
