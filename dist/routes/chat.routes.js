"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chatRoutes;
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
async function chatRoutes(fastify) {
    // Direct text chat message retrieval routes
    fastify.get('/:chatId/messages', { preHandler: [auth_middleware_1.verifyJWT] }, chat_controller_1.getMessages);
}
