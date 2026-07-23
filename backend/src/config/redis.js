import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Maintain a singleton connection pool
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

redisConnection.on('ready', () => {
  console.log('✅ Redis Connected');
});
