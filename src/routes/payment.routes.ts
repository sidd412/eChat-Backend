import { FastifyInstance } from 'fastify';
import { createOrder, juspayWebhook, verifyOrder, getPurchaseHistory } from '../controllers/payment.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function paymentRoutes(fastify: FastifyInstance) {
  // Protected route to create order
  fastify.post('/create-order', { preHandler: [verifyJWT] }, createOrder);
  
  // Protected route to verify order
  fastify.get('/verify/:orderId', { preHandler: [verifyJWT] }, verifyOrder);
  
  // Protected route to get purchase history
  fastify.get('/history', { preHandler: [verifyJWT] }, getPurchaseHistory);
  
  // Public webhook route (Juspay server will hit this)
  fastify.post('/webhook', juspayWebhook);
}
