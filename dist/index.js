"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const db_1 = require("./config/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const sockets_1 = require("./sockets");
// Load environment variables
dotenv_1.default.config();
const server = (0, fastify_1.default)({
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
const io = new socket_io_1.Server(server.server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
(0, sockets_1.initSockets)(io);
// Register routes
server.register(auth_routes_1.default, { prefix: '/api/auth' });
server.register(chat_routes_1.default, { prefix: '/api/chat' });
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
        await (0, db_1.connectDB)();
        // 2. Start fastify listening
        const port = Number(process.env.PORT) || 5000;
        // IMPORTANT: listen on 0.0.0.0 so that Android Emulator (10.0.2.2) and local devices can connect
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Server listening on http://localhost:${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
