import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/user.model';
import { Transaction } from '../models/transaction.model';
import crypto from 'crypto';

const CHECK_IN_REWARDS = [10, 20, 30, 40, 50, 75, 100]; // 7 days rewards

const SPIN_PRIZES = [
  { index: 0, coins: 10, label: "10 Coins", weight: 35 },
  { index: 1, coins: 20, label: "20 Coins", weight: 25 },
  { index: 2, coins: 15, label: "15 Coins", weight: 30 },
  { index: 3, coins: 100, label: "100 Coins 👑", weight: 2 }, // Rare Grand Jackpot
  { index: 4, coins: 25, label: "25 Coins", weight: 20 },
  { index: 5, coins: 30, label: "30 Coins", weight: 15 },
  { index: 6, coins: 50, label: "50 Coins", weight: 5 },      // Rare
  { index: 7, coins: 10, label: "10 Coins", weight: 35 }
];

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
         d1.getUTCMonth() === d2.getUTCMonth() &&
         d1.getUTCDate() === d2.getUTCDate();
}

function isYesterday(lastDate: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameCalendarDay(lastDate, yesterday);
}

// 1. Get current rewards status (Streak, canCheckIn, canSpin, cooldown)
export const getRewardsStatus = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const now = new Date();
    let canCheckInToday = true;
    if (user.lastCheckInDate) {
      canCheckInToday = !isSameCalendarDay(new Date(user.lastCheckInDate), now);
    }

    let canSpinToday = true;
    let nextSpinTimeMs = 0;
    if (user.lastSpinDate) {
      const lastSpinTime = new Date(user.lastSpinDate).getTime();
      const cooldownPeriodMs = 24 * 60 * 60 * 1000; // 24 hours cooldown
      const diff = now.getTime() - lastSpinTime;
      if (diff < cooldownPeriodMs) {
        canSpinToday = false;
        nextSpinTimeMs = lastSpinTime + cooldownPeriodMs;
      }
    }

    return reply.status(200).send({
      success: true,
      streak: user.checkInStreak || 0,
      canCheckInToday,
      canSpinToday,
      nextSpinTimeMs,
      coinsBalance: user.coinsBalance,
      checkInRewards: CHECK_IN_REWARDS
    });
  } catch (error: any) {
    console.error('Get Rewards Status Error:', error);
    return reply.status(500).send({ error: 'Failed to fetch rewards status' });
  }
};

// 2. Claim Daily Check-In
export const claimDailyCheckIn = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const now = new Date();

    if (user.lastCheckInDate && isSameCalendarDay(new Date(user.lastCheckInDate), now)) {
      return reply.status(400).send({
        success: false,
        error: 'Already claimed today! Come back tomorrow.'
      });
    }

    let newStreak = 1;
    if (user.lastCheckInDate && isYesterday(new Date(user.lastCheckInDate), now)) {
      newStreak = ((user.checkInStreak || 0) % 7) + 1;
    } else {
      newStreak = 1; // Streak broken or first time
    }

    const rewardCoins = CHECK_IN_REWARDS[newStreak - 1];

    user.coinsBalance += rewardCoins;
    user.checkInStreak = newStreak;
    user.lastCheckInDate = now;
    await user.save();

    // Log transaction
    const orderId = `checkin_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await Transaction.create({
      userId,
      orderId,
      amount: 0,
      coins: rewardCoins,
      status: 'SUCCESS',
      gatewayResponse: { type: 'DAILY_CHECK_IN', streak: newStreak, coins: rewardCoins }
    });

    console.log(`🎉 [CHECK-IN] ${user.name} claimed Day ${newStreak} reward (+${rewardCoins} coins)`);

    return reply.status(200).send({
      success: true,
      coinsEarned: rewardCoins,
      newStreak,
      coinsBalance: user.coinsBalance,
      message: `Claimed +${rewardCoins} coins for Day ${newStreak}!`
    });
  } catch (error: any) {
    console.error('Daily Check-In Error:', error);
    return reply.status(500).send({ error: 'Failed to claim daily check-in' });
  }
};

// 3. Spin Lucky Wheel
export const spinLuckyWheel = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const now = new Date();
    const cooldownPeriodMs = 24 * 60 * 60 * 1000;

    if (user.lastSpinDate) {
      const lastSpinTime = new Date(user.lastSpinDate).getTime();
      if (now.getTime() - lastSpinTime < cooldownPeriodMs) {
        return reply.status(400).send({
          success: false,
          error: 'Daily spin already used. Please wait for cooldown.'
        });
      }
    }

    // Weighted random selection
    const totalWeight = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let randomNum = Math.random() * totalWeight;
    let selectedPrize = SPIN_PRIZES[0];

    for (const prize of SPIN_PRIZES) {
      if (randomNum < prize.weight) {
        selectedPrize = prize;
        break;
      }
      randomNum -= prize.weight;
    }

    user.coinsBalance += selectedPrize.coins;
    user.lastSpinDate = now;
    await user.save();

    // Log transaction
    const orderId = `spin_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await Transaction.create({
      userId,
      orderId,
      amount: 0,
      coins: selectedPrize.coins,
      status: 'SUCCESS',
      gatewayResponse: { type: 'LUCKY_SPIN', prizeIndex: selectedPrize.index, coins: selectedPrize.coins }
    });

    console.log(`🎡 [SPIN] ${user.name} won ${selectedPrize.label} (+${selectedPrize.coins} coins)`);

    return reply.status(200).send({
      success: true,
      prizeIndex: selectedPrize.index,
      coinsWon: selectedPrize.coins,
      label: selectedPrize.label,
      coinsBalance: user.coinsBalance,
      nextSpinTimeMs: now.getTime() + cooldownPeriodMs
    });
  } catch (error: any) {
    console.error('Lucky Spin Error:', error);
    return reply.status(500).send({ error: 'Failed to process lucky spin' });
  }
};
