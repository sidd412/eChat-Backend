"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = void 0;
const message_model_1 = require("../models/message.model");
// Fetch message history for a specific chatId
const getMessages = async (request, reply) => {
    try {
        const { chatId } = request.params;
        if (!chatId) {
            return reply.status(400).send({ error: 'Chat ID is required' });
        }
        // Load message history from MongoDB, sorted from oldest to newest
        const messages = await message_model_1.Message.find({ chatId })
            .sort({ timestamp: 1 })
            .limit(100); // Fetch latest 100 messages
        return reply.status(200).send({
            success: true,
            messages
        });
    }
    catch (error) {
        console.error('Get Messages Error:', error);
        return reply.status(500).send({ error: 'Failed to retrieve messages' });
    }
};
exports.getMessages = getMessages;
