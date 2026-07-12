import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface DecodedToken {
  userId: string;
  name: string;
}

export const verifyJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretjwtechatkey123!@#'
    ) as DecodedToken;

    // Attach decoded user info to request object
    (request as any).user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
  }
};
