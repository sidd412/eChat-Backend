"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const redis_1 = require("../config/redis");
const agora_1 = require("../utils/agora");
const crypto_1 = __importDefault(require("crypto"));
class MatchmakingService {
    // Save user state in Redis
    static async saveUserState(user) {
        const key = `user:state:${user.userId}`;
        await redis_1.redis.hset(key, {
            userId: user.userId,
            socketId: user.socketId,
            gender: user.gender,
            age: user.age.toString(),
            country: user.country,
            longitude: user.longitude.toString(),
            latitude: user.latitude.toString(),
            prefGender: user.prefGender,
            prefMinAge: user.prefMinAge.toString(),
            prefMaxAge: user.prefMaxAge.toString(),
            filterType: user.filterType,
            kmRadius: user.kmRadius.toString()
        });
        // Expire user state after 5 minutes of inactivity in queue
        await redis_1.redis.expire(key, 300);
    }
    // Get user state from Redis
    static async getUserState(userId) {
        const key = `user:state:${userId}`;
        const data = await redis_1.redis.hgetall(key);
        if (!data || !data.userId)
            return null;
        return {
            userId: data.userId,
            socketId: data.socketId,
            gender: data.gender,
            age: parseInt(data.age, 10),
            country: data.country,
            longitude: parseFloat(data.longitude),
            latitude: parseFloat(data.latitude),
            prefGender: data.prefGender,
            prefMinAge: parseInt(data.prefMinAge, 10),
            prefMaxAge: parseInt(data.prefMaxAge, 10),
            filterType: data.filterType,
            kmRadius: parseInt(data.kmRadius, 10)
        };
    }
    // Remove user state and queues
    static async removeUser(userId, _gender, country) {
        await redis_1.redis.del(`user:state:${userId}`);
        await redis_1.redis.del(`user:busy:${userId}`);
        // Remove from country queues
        const countryGenders = ['Male', 'Female'];
        for (const g of countryGenders) {
            await redis_1.redis.srem(`queue:country:${country}:${g}`, userId);
        }
        // Remove from Geo queues
        await redis_1.redis.zrem('queue:geo:Male', userId);
        await redis_1.redis.zrem('queue:geo:Female', userId);
    }
    // Check if two users match each other's criteria
    static isMutualMatch(userA, userB) {
        // 1. Age checks
        const aAgeOk = userB.age >= userA.prefMinAge && userB.age <= userA.prefMaxAge;
        const bAgeOk = userA.age >= userB.prefMinAge && userA.age <= userB.prefMaxAge;
        if (!aAgeOk || !bAgeOk)
            return false;
        // 2. Gender checks
        const aGenderOk = userA.prefGender === 'All' || userA.prefGender === userB.gender;
        const bGenderOk = userB.prefGender === 'All' || userB.prefGender === userA.gender;
        if (!aGenderOk || !bGenderOk)
            return false;
        return true;
    }
    // Find a match for a user
    static async findMatch(user, _name) {
        // Check if user is already busy
        const isBusy = await redis_1.redis.exists(`user:busy:${user.userId}`);
        if (isBusy)
            return null;
        // Save/refresh current user state in Redis
        await this.saveUserState(user);
        // List of candidates
        let candidateIds = [];
        if (user.filterType === 'country') {
            // Fetch users waiting in the same country
            const targetGenders = user.prefGender === 'All' ? ['Male', 'Female'] : [user.prefGender];
            for (const gender of targetGenders) {
                const setKey = `queue:country:${user.country}:${gender}`;
                const members = await redis_1.redis.smembers(setKey);
                candidateIds.push(...members);
            }
        }
        else {
            // Geospatial km-based search
            const targetGenders = user.prefGender === 'All' ? ['Male', 'Female'] : [user.prefGender];
            for (const gender of targetGenders) {
                const geoKey = `queue:geo:${gender}`;
                // Find users within user.kmRadius kilometers from user's location
                // ioredis GEORADIUS syntax: GEORADIUS key longitude latitude radius km
                const members = await redis_1.redis.georadius(geoKey, user.longitude, user.latitude, user.kmRadius, 'km');
                candidateIds.push(...members);
            }
        }
        // Filter out self and busy users, then check matching preferences
        for (const candidateId of candidateIds) {
            if (candidateId === user.userId)
                continue;
            // Check if candidate is busy
            const isCandidateBusy = await redis_1.redis.exists(`user:busy:${candidateId}`);
            if (isCandidateBusy)
                continue;
            // Get candidate's state
            const candidate = await this.getUserState(candidateId);
            if (!candidate)
                continue;
            // Check if candidate is in the same matchmaking filter type and mutually matches criteria
            const filterMatch = candidate.filterType === user.filterType;
            if (filterMatch && this.isMutualMatch(user, candidate)) {
                // Lock both users as busy (using transactions/atomic commands to avoid race conditions)
                const lockSelf = await redis_1.redis.set(`user:busy:${user.userId}`, '1', 'EX', 30, 'NX');
                const lockPartner = await redis_1.redis.set(`user:busy:${candidate.userId}`, '1', 'EX', 30, 'NX');
                if (lockSelf && lockPartner) {
                    // Found match! Remove both from queues
                    await this.removeUser(user.userId, user.gender, user.country);
                    await this.removeUser(candidate.userId, candidate.gender, candidate.country);
                    // Generate Agora connection settings
                    const channelName = `call_${crypto_1.default.randomBytes(8).toString('hex')}`;
                    // Generate token for both users (passing 0 allows any user connection on channel)
                    const token = (0, agora_1.generateAgoraToken)(channelName, 0);
                    // Fetch partner's name from database/state or default
                    // For now, we fetch details from Redis state
                    const partnerDetails = {
                        userId: candidate.userId,
                        socketId: candidate.socketId,
                        name: 'Stranger', // Fallback, will be replaced with actual name from socket registry
                        gender: candidate.gender,
                        age: candidate.age,
                        country: candidate.country
                    };
                    return {
                        channelName,
                        token,
                        partner: partnerDetails
                    };
                }
                else {
                    // Unlock if locks failed
                    await redis_1.redis.del(`user:busy:${user.userId}`);
                    await redis_1.redis.del(`user:busy:${candidate.userId}`);
                }
            }
        }
        // If no match found, place self in queue
        if (user.filterType === 'country') {
            const setKey = `queue:country:${user.country}:${user.gender}`;
            await redis_1.redis.sadd(setKey, user.userId);
            // Set TTL on queue set for automatic cleanup
            await redis_1.redis.expire(setKey, 300);
        }
        else {
            const geoKey = `queue:geo:${user.gender}`;
            await redis_1.redis.geoadd(geoKey, user.longitude, user.latitude, user.userId);
            // Set TTL on geo key for automatic cleanup
            await redis_1.redis.expire(geoKey, 300);
        }
        return null;
    }
}
exports.MatchmakingService = MatchmakingService;
