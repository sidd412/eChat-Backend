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
    
    // Remove from ALL country queues (both genders)
    for (const g of ['Male', 'Female']) {
      await redis.srem(`queue:country:${country}:${g}`, userId);
    }
    
    // Remove from ALL Geo queues
    await redis.zrem('queue:geo:Male', userId);
    await redis.zrem('queue:geo:Female', userId);
  }

  /**
   * Score how well two users match each other's preferences.
   * Higher score = better match. Minimum score = 0 (no preference alignment).
   * 
   * Scoring:
   *   +2 = mutual gender preference match (both want each other's gender)
   *   +1 = one-sided gender match (only one user prefers the other's gender)
   *   +2 = mutual age range match (both in each other's preferred age range)
   *   +1 = one-sided age match
   *   
   * Max possible score = 4 (perfect mutual match)
   * Min possible score = 0 (no alignment at all, but still matchable)
   */
  private static scoreMatch(userA: UserState, userB: UserState): number {
    let score = 0;

    // Gender preference scoring
    const aWantsB = userA.prefGender === 'All' || userA.prefGender === userB.gender;
    const bWantsA = userB.prefGender === 'All' || userB.prefGender === userA.gender;
    if (aWantsB) score++;
    if (bWantsA) score++;

    // Age preference scoring
    const bInARange = userB.age >= userA.prefMinAge && userB.age <= userA.prefMaxAge;
    const aInBRange = userA.age >= userB.prefMinAge && userA.age <= userB.prefMaxAge;
    if (bInARange) score++;
    if (aInBRange) score++;

    return score;
  }

  /**
   * Soft-preference matchmaking:
   * 
   * 1. Collect ALL available candidates (not filtered by preference).
   * 2. Score each candidate based on how well preferences align.
   * 3. Pick the BEST scoring candidate.
   * 4. If no candidates exist, add self to queue and wait.
   * 
   * This ensures:
   * - If only 2 people are online, they ALWAYS match (regardless of preferences).
   * - If multiple people are online, the best preference match is prioritized.
   * - Preferences are "soft" — they influence priority, not eligibility.
   */
  public static async findMatch(user: UserState, _userName: string): Promise<MatchResult | null> {
    const unlock = await matchMutex.lock();
    try {
      console.log(`🔍 [MATCH] findMatch called for ${user.userId} (gender=${user.gender}, prefGender=${user.prefGender}, country=${user.country}, filter=${user.filterType})`);
    
    // We expect the caller (sockets/index.ts) to have already cleared any stale locks
    // and informed partners if this user was previously in a match.
    // If they are still busy here, it means they shouldn't be matched yet.
    const isBusy = await redis.exists(`user:busy:${user.userId}`);
    if (isBusy) {
      console.log(`🔍 [MATCH] ${user.userId} is BUSY, skipping`);
      return null;
    }
    await this.saveUserState(user);

    // ────────────────────────────────────────────
    // Step 1: Collect ALL candidates (both genders)
    // ────────────────────────────────────────────
    const allCandidateIds = new Set<string>();

    if (user.filterType === 'country') {
      for (const gender of ['Male', 'Female']) {
        const setKey = `queue:country:${user.country}:${gender}`;
        const members = await redis.smembers(setKey);
        console.log(`🔍 [MATCH] Queue "${setKey}": [${members.join(', ')}]`);
        members.forEach(m => allCandidateIds.add(m));
      }
    } else {
      for (const gender of ['Male', 'Female']) {
        const geoKey = `queue:geo:${gender}`;
        const members = await redis.georadius(
          geoKey, user.longitude, user.latitude, user.kmRadius, 'km'
        ) as string[];
        console.log(`🔍 [MATCH] Geo "${geoKey}": ${members.length} nearby`);
        members.forEach(m => allCandidateIds.add(m));
      }
    }

    // Remove self from candidates
    allCandidateIds.delete(user.userId);
    console.log(`🔍 [MATCH] Total candidates (excluding self): ${allCandidateIds.size} -> [${[...allCandidateIds].join(', ')}]`);

    // ────────────────────────────────────────────
    // Step 2: Score each candidate
    // ────────────────────────────────────────────
    let bestCandidate: { state: UserState; score: number; name: string } | null = null;

    for (const candidateId of allCandidateIds) {
      // Skip busy candidates (already in a call)
      const isCandidateBusy = await redis.exists(`user:busy:${candidateId}`);
      if (isCandidateBusy) {
        console.log(`🔍 [MATCH] Candidate ${candidateId} is BUSY, skipping`);
        continue;
      }

      const candidate = await this.getUserState(candidateId);
      if (!candidate) {
        console.log(`🔍 [MATCH] Candidate ${candidateId} has no state, skipping`);
        continue;
      }

      // Filter type must match (country users match country, geo matches geo)
      if (candidate.filterType !== user.filterType) {
        console.log(`🔍 [MATCH] Candidate ${candidateId} filterType mismatch (${candidate.filterType} vs ${user.filterType}), skipping`);
        continue;
      }

      const score = this.scoreMatch(user, candidate);
      console.log(`🔍 [MATCH] Candidate ${candidateId}: score=${score} (gender=${candidate.gender}, pref=${candidate.prefGender}, age=${candidate.age})`);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { state: candidate, score, name: 'Stranger' };
      }
    }

    // ────────────────────────────────────────────
    // Step 3: If best candidate found, lock & match
    // ────────────────────────────────────────────
    if (bestCandidate) {
      console.log(`🔍 [MATCH] Best candidate: ${bestCandidate.state.userId} with score ${bestCandidate.score}`);

      // Atomic lock both users to prevent double-matching
      const lockSelf = await redis.set(`user:busy:${user.userId}`, '1', 'EX', 30, 'NX');
      const lockPartner = await redis.set(`user:busy:${bestCandidate.state.userId}`, '1', 'EX', 30, 'NX');

      if (lockSelf && lockPartner) {
        console.log(`✅ [MATCH] MATCH SUCCESS! ${user.userId} <-> ${bestCandidate.state.userId} (score=${bestCandidate.score})`);

        // Remove both from all queues
        await this.removeUser(user.userId, user.gender, user.country);
        await this.removeUser(bestCandidate.state.userId, bestCandidate.state.gender, bestCandidate.state.country);

        // Generate Agora channel + token
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
        // Lock race condition — release and retry next cycle
        console.log(`🔍 [MATCH] Lock failed for ${user.userId} <-> ${bestCandidate.state.userId}, releasing`);
        await redis.del(`user:busy:${user.userId}`);
        await redis.del(`user:busy:${bestCandidate.state.userId}`);
      }
    }

    // ────────────────────────────────────────────
    // Step 4: No match found — add self to queue
    // ────────────────────────────────────────────
    console.log(`🔍 [MATCH] No match available for ${user.userId}. Adding to queue and waiting.`);

    if (user.filterType === 'country') {
      const setKey = `queue:country:${user.country}:${user.gender}`;
      await redis.sadd(setKey, user.userId);
      await redis.expire(setKey, 300);
      console.log(`🔍 [MATCH] Added ${user.userId} to ${setKey}`);
    } else {
      const geoKey = `queue:geo:${user.gender}`;
      await redis.geoadd(geoKey, user.longitude, user.latitude, user.userId);
      await redis.expire(geoKey, 300);
      console.log(`🔍 [MATCH] Added ${user.userId} to ${geoKey}`);
    }

    return null;
    } finally {
      unlock();
    }
  }
}
