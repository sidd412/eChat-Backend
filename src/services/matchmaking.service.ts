import { redis } from '../config/redis';
import { generateAgoraToken } from '../utils/agora';
import crypto from 'crypto';

export interface UserState {
  userId: string;
  socketId: string;
  gender: string;
  age: number;
  country: string;
  longitude: number;
  latitude: number;
  prefGender: 'Male' | 'Female' | 'All';
  prefMinAge: number;
  prefMaxAge: number;
  filterType: 'km' | 'country';
  kmRadius: number;
}

export interface MatchResult {
  channelName: string;
  token: string;
  partner: {
    userId: string;
    socketId: string;
    name: string;
    gender: string;
    age: number;
    country: string;
  };
}

class SimpleMutex {
  private queue: Array<(value: () => void) => void> = [];
  private locked = false;

  async lock(): Promise<() => void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.dispatch();
    });
  }

  private dispatch() {
    if (this.locked) return;
    const next = this.queue.shift();
    if (next) {
      this.locked = true;
      let released = false;
      next(() => {
        if (!released) {
          released = true;
          this.locked = false;
          this.dispatch();
        }
      });
    }
  }
}

const matchMutex = new SimpleMutex();

export class MatchmakingService {
  
  // Save user state in Redis
  private static async saveUserState(user: UserState): Promise<void> {
    const key = `user:state:${user.userId}`;
    await redis.hset(key, {
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
    await redis.expire(key, 300);
  }

  // Get user state from Redis
  private static async getUserState(userId: string): Promise<UserState | null> {
    const key = `user:state:${userId}`;
    const data = await redis.hgetall(key);
    if (!data || !data.userId) return null;

    return {
      userId: data.userId,
      socketId: data.socketId,
      gender: data.gender,
      age: parseInt(data.age, 10),
      country: data.country,
      longitude: parseFloat(data.longitude),
      latitude: parseFloat(data.latitude),
      prefGender: data.prefGender as 'Male' | 'Female' | 'All',
      prefMinAge: parseInt(data.prefMinAge, 10),
      prefMaxAge: parseInt(data.prefMaxAge, 10),
      filterType: data.filterType as 'km' | 'country',
      kmRadius: parseInt(data.kmRadius, 10)
    };
  }

  // Remove user state and queues
  public static async removeUser(userId: string, _gender: string, country: string): Promise<void> {
    await redis.del(`user:state:${userId}`);
    await redis.del(`user:busy:${userId}`);
    await redis.srem('queue:global', userId);
    
    // For backward compatibility / safety:
    for (const g of ['Male', 'Female']) {
      await redis.srem(`queue:country:${country}:${g}`, userId);
    }
    await redis.zrem('queue:geo:Male', userId);
    await redis.zrem('queue:geo:Female', userId);
  }

  // Calculate distance between two coordinates in km (Haversine formula)
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  /**
   * Score how well two users match each other's preferences.
   * Higher score = better match. Minimum score = 0 (no preference alignment).
   * 
   * Scoring:
   *   +10 = mutual gender preference match (both want each other's gender)
   *   +5 = one-sided gender match (only one user prefers the other's gender)
   *   +6 = mutual age range match (both in each other's preferred age range)
   *   +3 = one-sided age match
   *   +4 = mutual location match (same country, or within distance radius if using km filter)
   *   +2 = one-sided location match
   */
  private static scoreMatch(userA: UserState, userB: UserState): number {
    let score = 0;

    // 1. Gender preference (Max 10 points)
    const aWantsB = userA.prefGender === 'All' || userA.prefGender === userB.gender;
    const bWantsA = userB.prefGender === 'All' || userB.prefGender === userA.gender;
    if (aWantsB && bWantsA) {
      score += 10;
    } else if (aWantsB || bWantsA) {
      score += 5;
    }

    // 2. Age preference (Max 6 points)
    const bInARange = userB.age >= userA.prefMinAge && userB.age <= userA.prefMaxAge;
    const aInBRange = userA.age >= userB.prefMinAge && userA.age <= userB.prefMaxAge;
    if (bInARange && aInBRange) {
      score += 6;
    } else if (bInARange || aInBRange) {
      score += 3;
    }

    // 3. Location/Country preference (Max 4 points)
    if (userA.filterType === 'km' || userB.filterType === 'km') {
      const distance = this.calculateDistance(userA.latitude, userA.longitude, userB.latitude, userB.longitude);
      const aSatisfied = userA.filterType !== 'km' || distance <= userA.kmRadius;
      const bSatisfied = userB.filterType !== 'km' || distance <= userB.kmRadius;
      if (aSatisfied && bSatisfied) {
        score += 4;
      } else if (aSatisfied || bSatisfied) {
        score += 2;
      }
    } else {
      if (userA.country === userB.country) {
        score += 4;
      }
    }

    return score;
  }

  /**
   * soft-preference matchmaking with instant matching:
   * 
   * 1. Collect ALL candidate IDs currently waiting in `queue:global` (excluding self).
   * 2. Filter out candidates who are already busy.
   * 3. Fetch user state for candidates (limit to 50 for speed).
   * 4. If no candidates exist, add self to `queue:global` and return null.
   * 5. If candidates exist:
   *    - If only 1 candidate, match immediately.
   *    - If multiple candidates, score them based on preferences and select the highest scorer.
   * 6. Lock both users atomically to prevent double-matching, remove from queue, generate Agora token.
   */
  public static async findMatch(user: UserState, _userName: string): Promise<MatchResult | null> {
    const unlock = await matchMutex.lock();
    try {
      console.log(`🔍 [MATCH] findMatch called for ${user.userId} (gender=${user.gender}, prefGender=${user.prefGender}, country=${user.country})`);
    
      const isBusy = await redis.exists(`user:busy:${user.userId}`);
      if (isBusy) {
        console.log(`🔍 [MATCH] ${user.userId} is BUSY, skipping`);
        return null;
      }
      await this.saveUserState(user);

      // Step 1: Collect ALL candidates from global queue
      const globalQueue = await redis.smembers('queue:global');
      const allCandidateIds = new Set(globalQueue);

      // Remove self from candidates
      allCandidateIds.delete(user.userId);
      console.log(`🔍 [MATCH] Candidates in global queue: ${allCandidateIds.size}`);

      // Step 2: Score candidates
      let bestCandidate: { state: UserState; score: number; name: string } | null = null;
      const candidateArray = Array.from(allCandidateIds).slice(0, 50);

      for (const candidateId of candidateArray) {
        // Skip busy candidates
        const isCandidateBusy = await redis.exists(`user:busy:${candidateId}`);
        if (isCandidateBusy) {
          continue;
        }

        const candidate = await this.getUserState(candidateId);
        if (!candidate) {
          // Stale entry, cleanup
          await redis.srem('queue:global', candidateId);
          continue;
        }

        const score = this.scoreMatch(user, candidate);
        console.log(`🔍 [MATCH] Candidate ${candidateId}: score=${score} (gender=${candidate.gender}, age=${candidate.age})`);

        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = { state: candidate, score, name: 'Stranger' };
        }
      }

      // Step 3: If candidate found, match!
      if (bestCandidate) {
        console.log(`🔍 [MATCH] Matching ${user.userId} <-> ${bestCandidate.state.userId} with score ${bestCandidate.score}`);

        const lockSelf = await redis.set(`user:busy:${user.userId}`, '1', 'EX', 30, 'NX');
        const lockPartner = await redis.set(`user:busy:${bestCandidate.state.userId}`, '1', 'EX', 30, 'NX');

        if (lockSelf && lockPartner) {
          console.log(`✅ [MATCH] MATCH SUCCESS! ${user.userId} <-> ${bestCandidate.state.userId}`);

          // Remove both from queue
          await this.removeUser(user.userId, user.gender, user.country);
          await this.removeUser(bestCandidate.state.userId, bestCandidate.state.gender, bestCandidate.state.country);

          const channelName = `call_${crypto.randomBytes(8).toString('hex')}`;
          const token = generateAgoraToken(channelName, 0);

          return {
            channelName,
            token,
            partner: {
              userId: bestCandidate.state.userId,
              socketId: bestCandidate.state.socketId,
              name: bestCandidate.name,
              gender: bestCandidate.state.gender,
              age: bestCandidate.state.age,
              country: bestCandidate.state.country
            }
          };
        } else {
          console.log(`🔍 [MATCH] Lock failed, releasing locks`);
          await redis.del(`user:busy:${user.userId}`);
          await redis.del(`user:busy:${bestCandidate.state.userId}`);
        }
      }

      // Step 4: No match found — add self to global queue
      console.log(`🔍 [MATCH] No match available. Adding ${user.userId} to global queue.`);
      await redis.sadd('queue:global', user.userId);
      return null;
    } finally {
      unlock();
    }
  }
}
