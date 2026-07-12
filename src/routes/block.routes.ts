import { FastifyInstance } from 'fastify';
import { getBlockedList, unblockUser } from '../controllers/block.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function blockRoutes(fastify: FastifyInstance) {
  fastify.get('/list', { preHandler: [verifyJWT] }, getBlockedList);
  fastify.post('/unblock', { preHandler: [verifyJWT] }, unblockUser);
}
