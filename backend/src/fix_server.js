const fs = require('fs');
let content = fs.readFileSync('d:/Production-ready-StudyAI/backend/src/server.ts', 'utf8');

const correctSection = `const app = express();

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

// 2. CORS restricted to frontend URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// 3. Body parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. Custom middleware to sanitize incoming inputs to prevent NoSQL/SQL injection
const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.replace(/\\x00/g, ''); 
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
    const pong = await connection.ping();`;

const startIndex = content.indexOf('const app = express();');
const endIndexStr = 'results.redis.ok = !!pong;';
const endIndex = content.indexOf(endIndexStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + correctSection + '\\n    ' + content.substring(endIndex + endIndexStr.length);
  fs.writeFileSync('d:/Production-ready-StudyAI/backend/src/server.ts', content);
  console.log('Successfully fixed server.ts manually!');
} else {
  console.log('Could not find indices!', startIndex, endIndex);
}
