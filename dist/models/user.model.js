"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Not Specified'], default: 'Not Specified' },
    age: { type: Number },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            default: [0, 0]
        }
    },
    country: { type: String, default: 'Global' },
    availableMinutes: { type: Number, default: 30, required: true },
    preferences: {
        gender: { type: String, enum: ['Male', 'Female', 'All'], default: 'All' },
        minAge: { type: Number, default: 18 },
        maxAge: { type: Number, default: 99 },
        filterType: { type: String, enum: ['km', 'country'], default: 'country' },
        kmRadius: { type: Number, default: 50 }
    },
    isOnline: { type: Boolean, default: false }
}, {
    collection: 'echat_users',
    timestamps: true
});
// Create 2dsphere index for geolocation queries
UserSchema.index({ location: '2dsphere' });
exports.User = (0, mongoose_1.model)('User', UserSchema);
