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

  // Debug FCM route
  fastify.get('/test-fcm/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    try {
      const { User } = require('../models/user.model');
      const { getIsFirebaseInitialized } = require('../config/firebase');
      const { getMessaging } = require('firebase-admin/messaging');

      if (!getIsFirebaseInitialized()) {
        return reply.status(500).send({ error: 'Firebase is not initialized' });
      }

      const user = await User.findOne({ userId });
      if (!user) {
        return reply.status(404).send({ error: 'User not found in DB' });
      }

      if (!user.fcmToken) {
        return reply.status(400).send({ error: 'User has no fcmToken in DB' });
      }

      const payload = {
        notification: {
          title: 'eChat Test',
          body: 'If you see this, FCM is working perfectly!',
        },
        data: {
          type: 'TEST_NOTIFICATION',
          senderId: 'test_system',
        },
        token: user.fcmToken,
      };

      const result = await getMessaging().send(payload);
      return { success: true, result, fcmToken: user.fcmToken };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message, stack: err.stack });
    }
  });
}
