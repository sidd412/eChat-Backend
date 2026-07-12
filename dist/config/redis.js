"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
exports.redis = new ioredis_1.default({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null // Required for some matchmaking workers / bull queues
});
exports.redis.on('connect', () => {
    console.log('⚡ Redis Connected Successfully');
});
exports.redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err);
});
