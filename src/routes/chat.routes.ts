import { FastifyInstance } from 'fastify';
import { getMessages } from '../controllers/chat.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function chatRoutes(fastify: FastifyInstance) {
  // Direct text chat message retrieval routes
  fastify.get('/:chatId/messages', { preHandler: [verifyJWT] }, getMessages);
}
