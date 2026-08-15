import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/user.model';
import { Transaction } from '../models/transaction.model';
import crypto from 'crypto';

const REFERRAL_BONUS_COINS = 50;

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TALK-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const getReferralInfo = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let user = await User.findOne({ userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = generateUniqueCode();
      await user.save();
    }

    const referralCount = user.referralCount || 0;
    const coinsEarned = referralCount * REFERRAL_BONUS_COINS;

    return reply.send({
      success: true,
      referralCode: user.referralCode,
      referralCount,
      coinsEarned,
      bonusPerReferral: REFERRAL_BONUS_COINS,
      hasClaimedReferral: !!user.referredBy,
      blockContactsMatching: user.blockContactsMatching || false
    });
  } catch (error) {
    console.error('Error fetching referral info:', error);
    return reply.status(500).send({ error: 'Failed to fetch referral info' });
  }
};

export const syncContacts = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { phoneNumbers } = (request.body as any) || {};

    if (!Array.isArray(phoneNumbers)) {
      return reply.status(400).send({ error: 'phoneNumbers must be an array' });
    }

    // Normalize phone numbers (strip non-digits, extract last 10 digits for robust matching)
    const normalizedMap = new Map<string, string>();
    const searchPatterns: string[] = [];

    for (const rawPhone of phoneNumbers) {
      if (typeof rawPhone === 'string') {
        const cleaned = rawPhone.replace(/\D/g, '');
        if (cleaned.length >= 7) {
          const last10 = cleaned.slice(-10);
          normalizedMap.set(last10, rawPhone);
          searchPatterns.push(last10);
        }
      }
    }

    if (searchPatterns.length === 0) {
      return reply.send({ success: true, registeredContacts: [], matchedCount: 0 });
    }

    // Find registered users who have contactNumber matching any of the searchPatterns
    const regexPatterns = searchPatterns.map(p => new RegExp(p + '$'));
    const matchedUsers = await User.find({
      userId: { $ne: userId },
      contactNumber: { $in: regexPatterns }
    }).select('userId name avatar isOnline contactNumber gender country');

    const registeredContacts = matchedUsers.map(u => ({
      userId: u.userId,
      name: u.name,
      avatar: u.avatar || '',
      isOnline: u.isOnline || false,
      gender: u.gender || 'Not Specified',
      country: u.country || 'Global',
      contactNumber: u.contactNumber
    }));

    return reply.send({
      success: true,
      registeredContacts,
      matchedCount: registeredContacts.length
    });
  } catch (error) {
    console.error('Error syncing contacts:', error);
    return reply.status(500).send({ error: 'Failed to sync contacts' });
  }
};

export const claimReferralCode = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { code } = (request.body as any) || {};

    if (!code || typeof code !== 'string') {
      return reply.status(400).send({ error: 'Referral code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    const user = await User.findOne({ userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (user.referredBy) {
      return reply.status(400).send({ error: 'You have already redeemed a referral code' });
    }

    if (user.referralCode && user.referralCode.toUpperCase() === cleanCode) {
      return reply.status(400).send({ error: 'You cannot use your own referral code' });
    }

    const referrer = await User.findOne({ referralCode: cleanCode });
    if (!referrer) {
      return reply.status(404).send({ error: 'Invalid referral code' });
    }

    // Award bonus coins to both parties
    user.referredBy = referrer.userId;
    user.coinsBalance = (user.coinsBalance || 0) + REFERRAL_BONUS_COINS;
    await user.save();

    referrer.coinsBalance = (referrer.coinsBalance || 0) + REFERRAL_BONUS_COINS;
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    await referrer.save();

    // Create transaction records
    try {
      await Transaction.create({
        transactionId: `txn_ref_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.userId,
        amount: 0,
        currency: 'INR',
        coins: REFERRAL_BONUS_COINS,
        status: 'SUCCESS',
        paymentMethod: 'REFERRAL_BONUS',
        description: `Welcome bonus from referral code: ${cleanCode}`
      });

      await Transaction.create({
        transactionId: `txn_ref_${crypto.randomBytes(6).toString('hex')}`,
        userId: referrer.userId,
        amount: 0,
        currency: 'INR',
        coins: REFERRAL_BONUS_COINS,
        status: 'SUCCESS',
        paymentMethod: 'REFERRAL_REWARD',
        description: `Referral bonus for inviting ${user.name}`
      });
    } catch (txErr) {
      console.warn('Could not record referral transaction:', txErr);
    }

    return reply.send({
      success: true,
      message: `🎉 Referral code redeemed! You earned ${REFERRAL_BONUS_COINS} free coins!`,
      bonusCoins: REFERRAL_BONUS_COINS,
      newBalance: user.coinsBalance,
      referrerName: referrer.name
    });
  } catch (error) {
    console.error('Error claiming referral code:', error);
    return reply.status(500).send({ error: 'Failed to claim referral code' });
  }
};

export const toggleContactsPrivacy = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { blockContactsMatching } = (request.body as any) || {};

    const user = await User.findOneAndUpdate(
      { userId },
      { blockContactsMatching: !!blockContactsMatching },
      { new: true }
    );

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      success: true,
      message: user.blockContactsMatching
        ? 'Contacts blocked from matching with you in random queue'
        : 'Contacts allowed in match queue',
      blockContactsMatching: user.blockContactsMatching
    });
  } catch (error) {
    console.error('Error toggling contacts privacy:', error);
    return reply.status(500).send({ error: 'Failed to update privacy settings' });
  }
};
