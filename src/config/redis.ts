import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis({
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
