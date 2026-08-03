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

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TLJZq2x1feNNW0';
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rofnnDQPweOfW1GHVK045fGJ';

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
    
    // Call Razorpay Payment Links API via Basic Auth fetch
    const authHeader = 'Basic ' + Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');
    
    const razorpayPayload = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      accept_partial: false,
      reference_id: orderId,
      description: `Recharge for ${coins} coins`,
      customer: {
        name: requester.name || 'User',
        email: requester.email || 'test@echat.com',
        contact: requester.contactNumber || '9999999999'
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: false,
      notes: {
        orderId,
        coins: String(coins)
      },
      callback_url: 'https://razorpay.com/payment-complete',
      callback_method: 'get'
    };

    console.log('📦 Creating Razorpay payment link with payload:', razorpayPayload);

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(razorpayPayload)
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('Razorpay API Error:', data);
      return reply.code(500).send({ message: 'Failed to create Razorpay payment link', details: data });
    }

    console.log('✅ Razorpay payment link created:', data.short_url);

    return reply.code(200).send({
      success: true,
      orderId,
      paymentLink: data.short_url
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    return reply.code(500).send({ message: 'Failed to create order' });
  }
};

export const juspayWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as any;
    console.log('📨 Razorpay Webhook Payload:', JSON.stringify(body, null, 2));

    // Handle payment_link.paid event
    if (body.event === 'payment_link.paid') {
      const paymentLinkObj = body.payload?.payment_link?.entity;
      if (!paymentLinkObj) {
        return reply.code(400).send({ message: 'Invalid webhook payload structure' });
      }

      const orderId = paymentLinkObj.reference_id;
      const status = paymentLinkObj.status;

      if (status === 'paid' && orderId) {
        const transaction = await Transaction.findOne({ orderId });
        if (!transaction) {
          return reply.code(404).send({ message: 'Transaction not found' });
        }

        if (transaction.status === 'SUCCESS') {
          return reply.code(200).send({ message: 'Already processed' });
        }

        transaction.status = 'SUCCESS';
        transaction.gatewayResponse = body;
        await transaction.save();

        const user = await User.findOne({ userId: transaction.userId });
        if (user) {
          user.coinsBalance += transaction.coins;
          await user.save();
          console.log(`💰 Added ${transaction.coins} coins to ${user.userId}. New Balance: ${user.coinsBalance}`);
        }
      }
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

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TLJZq2x1feNNW0';
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rofnnDQPweOfW1GHVK045fGJ';
    const authHeader = 'Basic ' + Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');

    // Retrieve status from Razorpay using the reference_id filter
    const response = await fetch(`https://api.razorpay.com/v1/payment_links?reference_id=${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('Verify Order Error:', data);
      return reply.code(500).send({ message: 'Failed to verify order with Razorpay' });
    }

    const paymentLinkObj = data.items?.[0];
    if (!paymentLinkObj) {
      return reply.code(404).send({ message: 'Payment link not found in Razorpay' });
    }

    const status = paymentLinkObj.status; // 'created', 'partially_paid', 'paid', 'expired', 'cancelled'
    transaction.gatewayResponse = paymentLinkObj;

    if (status === 'paid') {
      transaction.status = 'SUCCESS';
      await transaction.save();

      const user = await User.findOne({ userId: requester.userId });
      if (user) {
        user.coinsBalance += transaction.coins;
        await user.save();
      }
      return reply.code(200).send({ success: true, status: 'SUCCESS' });
    } else if (status === 'expired' || status === 'cancelled') {
      transaction.status = 'FAILED';
      await transaction.save();
      return reply.code(200).send({ success: false, status: transaction.status });
    } else {
      return reply.code(200).send({ success: false, status: 'PENDING' });
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
