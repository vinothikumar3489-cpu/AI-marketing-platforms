import { Redis } from 'ioredis';

let redisConnectionInstance = null;

export function getRedisConnection() {
  if (redisConnectionInstance) return redisConnectionInstance;

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    return null;
  }

  try {
    const redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 10) {
          console.error('❌ Redis max retries reached. Giving up.');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('error', (err) => {
      console.error('❌ Redis Connection Error:', err.message);
    });

    redis.on('ready', () => {
      console.log('✅ Redis Connected');
    });

    redisConnectionInstance = redis;
    return redis;
  } catch (err) {
    console.warn('⚠️ Failed to create Redis connection:', err.message);
    return null;
  }
}

export function isRedisAvailable() {
  const conn = getRedisConnection();
  return conn !== null;
}
