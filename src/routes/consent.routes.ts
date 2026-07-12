import { FastifyInstance } from 'fastify';
import { getPendingConsents, respondToConsent, revokeConsent } from '../controllers/consent.controller';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', getPendingConsents);
  fastify.post('/respond', respondToConsent);
  fastify.post('/revoke', revokeConsent);
}
