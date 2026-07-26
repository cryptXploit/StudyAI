// 1. 🛡️ CRITICAL: dotenv MUST be the very first lines before ANY other imports!
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Now it's safe to import the rest of the application
import './core/logger';
import logger from './core/logger';
import { app, server } from './server';
import './queue/worker';



const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info('server.start', { port: PORT });
  console.log(`🚀 Server is successfully running on port ${PORT}`);
});
