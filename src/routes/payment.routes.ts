import { FastifyInstance } from 'fastify';
import { createOrder, juspayWebhook, verifyOrder, getPurchaseHistory, verifyPlayPurchase, getInvoice } from '../controllers/payment.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

export default async function paymentRoutes(fastify: FastifyInstance) {
  // Google Play In-App Purchase Verification route
  fastify.post('/verify-play-purchase', { preHandler: [verifyJWT] }, verifyPlayPurchase);

  // Protected route to create order
  fastify.post('/create-order', { preHandler: [verifyJWT] }, createOrder);
  
  // Protected route to verify order
  fastify.get('/verify/:orderId', { preHandler: [verifyJWT] }, verifyOrder);
  
  // Protected route to get purchase history
  fastify.get('/history', { preHandler: [verifyJWT] }, getPurchaseHistory);

  // Protected route to get invoice for a specific order
  fastify.get('/invoice/:orderId', { preHandler: [verifyJWT] }, getInvoice);
  
  // Public webhook route
  fastify.post('/webhook', juspayWebhook);
}
