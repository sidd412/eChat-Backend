import { FastifyInstance } from 'fastify';
import { loginGuest, loginGoogle, getProfile, updateProfile, toggleInteraction, getInteractions } from '../controllers/auth.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function authRoutes(fastify: FastifyInstance) {
  // Public auth routes
  fastify.post('/guest', loginGuest);
  fastify.post('/google', loginGoogle);

  // Authenticated profile verification checks
  fastify.get('/profile', { preHandler: [verifyJWT] }, getProfile);
  fastify.get('/profile/:userId', { preHandler: [verifyJWT] }, require('../controllers/auth.controller').getUserProfile);
  fastify.put('/profile', { preHandler: [verifyJWT] }, updateProfile);
  fastify.post('/interaction', { preHandler: [verifyJWT] }, toggleInteraction);
  fastify.get('/interactions', { preHandler: [verifyJWT] }, getInteractions);
}
