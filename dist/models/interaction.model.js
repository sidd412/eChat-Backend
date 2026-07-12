"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interaction = void 0;
const mongoose_1 = require("mongoose");
const InteractionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    liked: { type: Boolean, default: false },
    added: { type: Boolean, default: false },
    timestamp: { type: Number, default: () => Date.now() }
}, {
    collection: 'echat_interactions'
});
// Compound index to quickly check if an interaction already exists between A and B
InteractionSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });
exports.Interaction = (0, mongoose_1.model)('Interaction', InteractionSchema);
