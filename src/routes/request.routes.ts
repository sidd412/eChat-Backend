import { FastifyInstance } from 'fastify';
import { createRequest } from '../controllers/request.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function requestRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [verifyJWT] }, createRequest);
}
