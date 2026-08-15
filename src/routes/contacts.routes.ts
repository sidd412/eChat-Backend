import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/auth.middleware';
import {
  getReferralInfo,
  syncContacts,
  claimReferralCode,
  toggleContactsPrivacy
} from '../controllers/contacts.controller';

export default async function contactsRoutes(fastify: FastifyInstance) {
  // All contacts routes are protected with JWT authentication
  fastify.get('/referral', { preHandler: [verifyJWT] }, getReferralInfo);
  fastify.post('/referral/claim', { preHandler: [verifyJWT] }, claimReferralCode);
  fastify.post('/sync', { preHandler: [verifyJWT] }, syncContacts);
  fastify.post('/privacy', { preHandler: [verifyJWT] }, toggleContactsPrivacy);
}
