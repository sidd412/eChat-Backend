import { FastifyRequest, FastifyReply } from 'fastify';
import { Request } from '../models/request.model';
import { User } from '../models/user.model';
import crypto from 'crypto';

export const createRequest = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    if (!requester || !requester.userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { type, targetId, reason } = request.body as {
      type: 'account_deletion' | 'report_user' | 'support';
      targetId?: string;
      reason: string;
    };

    if (!type || !reason) {
      return reply.status(400).send({ error: 'Type and reason are required' });
    }

    // Find requester's email
    const user = await User.findOne({ userId: requester.userId });
    const requesterEmail = user?.email || '';

    // Generate unique request ID
    const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;

    const newRequest = new Request({
      requestId,
      requesterId: requester.userId,
      requesterEmail,
      type,
      targetId,
      reason,
      status: 'created'
    });

    await newRequest.save();

    return reply.status(201).send({
      success: true,
      message: 'Request submitted successfully',
      requestId
    });
  } catch (error: any) {
    console.error('Create Request Error:', error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};
