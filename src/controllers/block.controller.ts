import { FastifyRequest, FastifyReply } from 'fastify';
import { Interaction } from '../models/interaction.model';
import { User } from '../models/user.model';

export const getBlockedList = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    
    // Find all interactions where the user blocked someone
    const interactions = await Interaction.find({
      userId: requester.userId,
      isBlocked: true
    });
    
    const list = await Promise.all(
      interactions.map(async (item) => {
        const targetUser = await User.findOne({ userId: item.targetUserId });
        return {
          id: item.targetUserId,
          name: targetUser?.name || `User ${item.targetUserId.substring(0, 4)}`,
          avatar: targetUser?.avatar || ''
        };
      })
    );

    return reply.code(200).send({
      success: true,
      blockedUsers: list
    });
  } catch (error: any) {
    console.error('Get Blocked List Error:', error);
    return reply.code(500).send({ error: 'Failed to retrieve blocked users' });
  }
};

interface UnblockBody {
  targetUserId: string;
}

export const unblockUser = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const { targetUserId } = request.body as UnblockBody;

    if (!targetUserId) {
      return reply.code(400).send({ error: 'Target User ID is required' });
    }

    // Unblock the user by setting isBlocked = false
    await Interaction.findOneAndUpdate(
      { userId: requester.userId, targetUserId },
      { $set: { isBlocked: false, timestamp: Date.now() } }
    );

    // Also unblock the reverse relationship so both can see each other again
    await Interaction.findOneAndUpdate(
      { userId: targetUserId, targetUserId: requester.userId },
      { $set: { isBlocked: false, timestamp: Date.now() } }
    );

    return reply.code(200).send({ success: true, message: 'User unblocked successfully' });
  } catch (error: any) {
    console.error('Unblock User Error:', error);
    return reply.code(500).send({ error: 'Failed to unblock user' });
  }
};
