import { FastifyRequest, FastifyReply } from 'fastify';
import { Consent } from '../models/consent.model';
import { User } from '../models/user.model';
import { Interaction } from '../models/interaction.model';

interface GetConsentQuery {
  userId: string;
}

interface RespondConsentBody {
  consentId: string;
  action: 'allow' | 'deny';
}

export const getPendingConsents = async (request: FastifyRequest<{ Querystring: GetConsentQuery }>, reply: FastifyReply) => {
  try {
    const { userId } = request.query;
    if (!userId) {
      return reply.code(400).send({ message: 'User ID is required' });
    }

    const pendingConsents = await Consent.find({ receiverId: userId, status: 'pending' }).sort({ createdAt: -1 });
    
    const enrichedConsents = await Promise.all(pendingConsents.map(async (consent) => {
      const sender = await User.findOne({ userId: consent.senderId });
      return {
        id: consent._id,
        senderId: consent.senderId,
        receiverId: consent.receiverId,
        senderName: sender?.name || 'Unknown',
        status: consent.status,
        timestamp: consent.createdAt
      };
    }));

    return reply.code(200).send({ notifications: enrichedConsents });
  } catch (error) {
    request.log.error(error as Error, 'Error fetching pending consents:');
    return reply.code(500).send({ message: 'Server error' });
  }
};

export const respondToConsent = async (request: FastifyRequest<{ Body: RespondConsentBody }>, reply: FastifyReply) => {
  try {
    const { consentId, action } = request.body;
    if (!consentId || !['allow', 'deny'].includes(action)) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const consent = await Consent.findById(consentId);
    if (!consent) {
      return reply.code(404).send({ message: 'Consent request not found' });
    }

    consent.status = action === 'allow' ? 'allowed' : 'denied';
    consent.updatedAt = Date.now();
    await consent.save();

    if (action === 'allow') {
      // Add interaction so they appear in each other's chats list under 'consent' category
      await Interaction.findOneAndUpdate(
        { userId: consent.receiverId, targetUserId: consent.senderId },
        { $addToSet: { categories: 'consent' }, $set: { timestamp: Date.now() } },
        { upsert: true, new: true }
      );
      await Interaction.findOneAndUpdate(
        { userId: consent.senderId, targetUserId: consent.receiverId },
        { $addToSet: { categories: 'consent' }, $set: { timestamp: Date.now() } },
        { upsert: true, new: true }
      );
    }

    return reply.code(200).send({ success: true, message: `Consent ${action}ed successfully.` });
  } catch (error) {
    request.log.error(error as Error, 'Error responding to consent:');
    return reply.code(500).send({ message: 'Server error' });
  }
};

interface RevokeConsentBody {
  userId: string;
  targetUserId: string;
}

export const revokeConsent = async (request: FastifyRequest<{ Body: RevokeConsentBody }>, reply: FastifyReply) => {
  try {
    const { userId, targetUserId } = request.body;
    if (!userId || !targetUserId) {
      return reply.code(400).send({ message: 'User ID and Target User ID are required' });
    }

    // A user can revoke a consent (block) a sender
    await Consent.deleteMany({
      $or: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId }
      ]
    });

    // Mark interaction as blocked for the blocker
    await Interaction.findOneAndUpdate(
      { userId, targetUserId },
      { $set: { isBlocked: true, timestamp: Date.now() } },
      { upsert: true, new: true }
    );
    
    // Also remove interaction for the other person so they can't see the blocker
    await Interaction.findOneAndUpdate(
      { userId: targetUserId, targetUserId: userId },
      { $set: { isBlocked: true, timestamp: Date.now() } },
      { upsert: true, new: true }
    );

    return reply.code(200).send({ success: true, message: 'User blocked and chat removed.' });
  } catch (error) {
    request.log.error(error as Error, 'Error revoking consent:');
    return reply.code(500).send({ message: 'Server error' });
  }
};
