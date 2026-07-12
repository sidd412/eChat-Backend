"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const MessageSchema = new mongoose_1.Schema({
    messageId: { type: String, required: true, unique: true, index: true },
    chatId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Number, default: () => Date.now(), index: true }
}, {
    collection: 'echat_messages'
});
exports.Message = (0, mongoose_1.model)('Message', MessageSchema);
