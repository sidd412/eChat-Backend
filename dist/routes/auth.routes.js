"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
async function authRoutes(fastify) {
    // Public auth routes
    fastify.post('/guest', auth_controller_1.loginGuest);
    fastify.post('/google', auth_controller_1.loginGoogle);
    // Authenticated profile verification checks
    fastify.get('/profile', { preHandler: [auth_middleware_1.verifyJWT] }, auth_controller_1.getProfile);
    fastify.put('/profile', { preHandler: [auth_middleware_1.verifyJWT] }, auth_controller_1.updateProfile);
    fastify.post('/interaction', { preHandler: [auth_middleware_1.verifyJWT] }, auth_controller_1.toggleInteraction);
    fastify.get('/interactions', { preHandler: [auth_middleware_1.verifyJWT] }, auth_controller_1.getInteractions);
}
