import { FastifyRequest, FastifyReply } from 'fastify';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import crypto from 'crypto';

export const createOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const { amount, coins } = request.body as { amount: number; coins: number };

    if (!amount || !coins) {
      return reply.code(400).send({ message: 'Amount and coins are required' });
    }

    const JUSPAY_MERCHANT_ID = process.env.JUSPAY_MERCHANT_ID || 'echat9129054029';
    const JUSPAY_API_KEY = process.env.JUSPAY_API_KEY || '';

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Create pending transaction in DB
    const transaction = new Transaction({
      userId: requester.userId,
      orderId,
      amount,
      coins,
      status: 'PENDING'
    });
    await transaction.save();
    
    // Call real Juspay Session API
    const authHeader = 'Basic ' + Buffer.from(JUSPAY_API_KEY + ':').toString('base64');
    
    const juspayPayload = {
      order_id: orderId,
      amount: amount.toFixed(2),
      customer_id: requester.userId,
      customer_email: 'test@echat.com',
      customer_phone: '9999999999',
      payment_page_client_id: JUSPAY_MERCHANT_ID,
      action: 'paymentPage',
      return_url: 'https://sandbox.juspay.in/end'
    };

    console.log('📦 Creating Juspay session with payload:', juspayPayload);

    const response = await fetch('https://sandbox.juspay.in/session', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'x-merchantid': JUSPAY_MERCHANT_ID
      },
      body: JSON.stringify(juspayPayload)
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('Juspay API Error:', data);
      return reply.code(500).send({ message: 'Failed to create Juspay session', details: data });
    }

    console.log('✅ Juspay session created:', JSON.stringify(data, null, 2));

    // Return the payment link for WebView-based flow
    const paymentLink = data.payment_links?.web || data.payment_links?.mobile;

    return reply.code(200).send({
      success: true,
      orderId,
      paymentLink,
      sdkPayload: data.sdk_payload
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    return reply.code(500).send({ message: 'Failed to create order' });
  }
};

export const juspayWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // In real implementation, verify webhook signature via request headers
    // const signature = request.headers['x-juspay-signature'];
    
    const body = request.body as any;
    
    // Juspay wraps webhook details in `content.order`
    const eventName = body.event_name;
    const orderData = body.content?.order || body;

    const orderId = orderData.order_id || orderData.orderId;
    const status = orderData.status;

    if (!orderId || !status) {
      return reply.code(400).send({ message: 'Invalid webhook payload' });
    }

    const transaction = await Transaction.findOne({ orderId });
    if (!transaction) {
      return reply.code(404).send({ message: 'Transaction not found' });
    }

    if (transaction.status === 'SUCCESS') {
      return reply.code(200).send({ message: 'Already processed' });
    }

    transaction.gatewayResponse = body;

    // Assuming 'CHARGED' or 'SUCCESS' means payment went through
    if (status === 'CHARGED' || status === 'SUCCESS' || eventName === 'ORDER_SUCCEEDED') {
      transaction.status = 'SUCCESS';
      await transaction.save();

      // Add coins to user wallet
      const user = await User.findOne({ userId: transaction.userId });
      if (user) {
        user.coinsBalance += transaction.coins;
        await user.save();
        
        // Notify socket via redis pub/sub or emit event directly if in same process
        // For simplicity, assuming io is available globally or we emit via redis in the future.
        console.log(`💰 Added ${transaction.coins} coins to ${user.userId}. New Balance: ${user.coinsBalance}`);
      }
    } else {
      transaction.status = 'FAILED';
      await transaction.save();
    }

    return reply.code(200).send({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return reply.code(500).send({ message: 'Webhook processing failed' });
  }
};

export const verifyOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const { orderId } = request.params as { orderId: string };
    
    if (!orderId) {
      return reply.code(400).send({ message: 'Order ID is required' });
    }

    const transaction = await Transaction.findOne({ orderId, userId: requester.userId });
    if (!transaction) {
      return reply.code(404).send({ message: 'Transaction not found' });
    }

    if (transaction.status === 'SUCCESS') {
      return reply.code(200).send({ success: true, message: 'Already verified' });
    }

    const JUSPAY_MERCHANT_ID = process.env.JUSPAY_MERCHANT_ID || 'echat9129054029';
    const JUSPAY_API_KEY = process.env.JUSPAY_API_KEY || '';
    const authHeader = 'Basic ' + Buffer.from(JUSPAY_API_KEY + ':').toString('base64');

    // Fetch order status from Juspay API
    const response = await fetch(`https://sandbox.juspay.in/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'x-merchantid': JUSPAY_MERCHANT_ID
      }
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('Verify Order Error:', data);
      return reply.code(500).send({ message: 'Failed to verify order with Juspay' });
    }

    const status = data.status;
    transaction.gatewayResponse = data;

    if (status === 'CHARGED' || status === 'SUCCESS') {
      transaction.status = 'SUCCESS';
      await transaction.save();

      const user = await User.findOne({ userId: requester.userId });
      if (user) {
        user.coinsBalance += transaction.coins;
        await user.save();
      }
      return reply.code(200).send({ success: true, status: 'SUCCESS' });
    } else {
      transaction.status = 'FAILED';
      await transaction.save();
      return reply.code(200).send({ success: false, status: transaction.status });
    }
  } catch (error) {
    console.error('Verify Order Error:', error);
    return reply.code(500).send({ message: 'Error verifying order' });
  }
};

export const getPurchaseHistory = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    
    const transactions = await Transaction.find({ userId: requester.userId })
      .sort({ createdAt: -1 })
      .select('orderId amount coins status createdAt');

    return reply.code(200).send({ success: true, transactions });
  } catch (error) {
    console.error('History Error:', error);
    return reply.code(500).send({ message: 'Failed to fetch history' });
  }
};
