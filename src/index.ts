import fastify from 'fastify';
import { connectDB } from './config/db';
import './config/firebase'; // Initialize Firebase Admin
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import consentRoutes from './routes/consent.routes';
import blockRoutes from './routes/block.routes';
import paymentRoutes from './routes/payment.routes';
import { initSockets } from './sockets';

// Load environment variables
dotenv.config();

const server = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Setup Socket.io
const io = new Server(server.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSockets(io);

// Register routes
server.register(authRoutes, { prefix: '/api/auth' });
server.register(chatRoutes, { prefix: '/api/chat' });
server.register(consentRoutes, { prefix: '/api/consent' });
server.register(blockRoutes, { prefix: '/api/block' });
server.register(paymentRoutes, { prefix: '/api/payment' });

// Global Error Handler
server.setErrorHandler((error, _request, reply) => {
  server.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message || 'Internal Server Error'
  });
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'OK', uptime: process.uptime() };
});

const start = async () => {
  try {
    // 1. Connect database
    await connectDB();

    // 2. Start fastify listening
    const port = Number(process.env.PORT) || 5000;
    
    // IMPORTANT: listen on 0.0.0.0 so that Android Emulator (10.0.2.2) and local devices can connect
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
