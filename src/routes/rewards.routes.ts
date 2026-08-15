import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/auth.middleware';
import {
  getRewardsStatus,
  claimDailyCheckIn,
  spinLuckyWheel
} from '../controllers/rewards.controller';

export default async function rewardsRoutes(fastify: FastifyInstance) {
  // All rewards routes are protected with JWT authentication
  fastify.get('/status', { preHandler: [verifyJWT] }, getRewardsStatus);
  fastify.post('/check-in', { preHandler: [verifyJWT] }, claimDailyCheckIn);
  fastify.post('/spin', { preHandler: [verifyJWT] }, spinLuckyWheel);
}
