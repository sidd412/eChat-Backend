import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Use REDIS_URL if it exists (Render/Upstash), otherwise fallback to manual config
export const redis = redisUrl 
  ? new Redis(redisUrl, { maxRetriesPerRequest: null })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null // Required for some matchmaking workers / bull queues
    });

redis.on('connect', () => {
  console.log('⚡ Redis Connected Successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});
