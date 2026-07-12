"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = void 0;
const matchmaking_service_1 = require("../services/matchmaking.service");
const user_model_1 = require("../models/user.model");
const message_model_1 = require("../models/message.model");
const redis_1 = require("../config/redis");
const crypto_1 = __importDefault(require("crypto"));
// Keep track of connected sockets to user IDs
const socketToUserRegistry = new Map();
const userToSocketRegistry = new Map();
const initSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // Register User with socket connection
        socket.on('register_user', ({ userId }) => {
            if (userId) {
                socketToUserRegistry.set(socket.id, userId);
                userToSocketRegistry.set(userId, socket.id);
                console.log(`👤 User registered: ${userId} to socket ${socket.id}`);
            }
        });
        // Handle Join Match Queue
        socket.on('join_match_queue', async (data) => {
            try {
                const { userId, name, gender, age, country, longitude, latitude, prefGender, prefMinAge, prefMaxAge, filterType, kmRadius } = data;
                if (!userId) {
                    socket.emit('match_error', { message: 'Missing User ID' });
                    return;
                }
                // 1. Validate if user has available minutes (Wallet Check)
                const userDb = await user_model_1.User.findOne({ userId });
                if (!userDb || userDb.availableMinutes <= 0) {
                    socket.emit('match_error', { message: 'Insufficient minutes. Please top up.' });
                    return;
                }
                // Map socket ID just in case register_user wasn't called
                socketToUserRegistry.set(socket.id, userId);
                userToSocketRegistry.set(userId, socket.id);
                const userState = {
                    userId,
                    socketId: socket.id,
                    gender: gender || 'Not Specified',
                    age: Number(age) || 18,
                    country: country || 'Global',
                    longitude: Number(longitude) || 0,
                    latitude: Number(latitude) || 0,
                    prefGender: prefGender || 'All',
                    prefMinAge: Number(prefMinAge) || 18,
                    prefMaxAge: Number(prefMaxAge) || 99,
                    filterType: filterType || 'country',
                    kmRadius: Number(kmRadius) || 50
                };
                socket.emit('searching', { status: 'Searching for a stranger...' });
                // 2. Perform Matchmaking search
                const match = await matchmaking_service_1.MatchmakingService.findMatch(userState, name || 'Stranger');
                if (match) {
                    // Send match settings to both users
                    const partnerSocketId = match.partner.socketId;
                    // Save active matching pair in Redis
                    await redis_1.redis.set(`match:active:${userId}`, JSON.stringify({ partnerId: match.partner.userId, channelName: match.channelName }), 'EX', 3600);
                    await redis_1.redis.set(`match:active:${match.partner.userId}`, JSON.stringify({ partnerId: userId, channelName: match.channelName }), 'EX', 3600);
                    // Emit to Self
                    socket.emit('match_found', {
                        channelName: match.channelName,
                        token: match.token,
                        partner: {
                            userId: match.partner.userId,
                            name: match.partner.name,
                            gender: match.partner.gender,
                            age: match.partner.age,
                            country: match.partner.country
                        }
                    });
                    // Emit to Partner (Target Socket)
                    io.to(partnerSocketId).emit('match_found', {
                        channelName: match.channelName,
                        token: match.token,
                        partner: {
                            userId: userId,
                            name: name || 'Stranger',
                            gender: userState.gender,
                            age: userState.age,
                            country: userState.country
                        }
                    });
                    console.log(`🔗 Match Successful: ${userId} paired with ${match.partner.userId} in channel ${match.channelName}`);
                }
            }
            catch (error) {
                console.error('Queue Join Error:', error);
                socket.emit('match_error', { message: 'Failed to join matching queue' });
            }
        });
        // Handle Leave Match Queue (User cancels matchmaking before finding anyone)
        socket.on('leave_match_queue', async (data) => {
            const { userId, gender, country } = data;
            if (userId) {
                await matchmaking_service_1.MatchmakingService.removeUser(userId, gender, country);
                socket.emit('match_left', { success: true });
                console.log(`🚫 User voluntarily left queue: ${userId}`);
            }
        });
        // Handle Skip / Call Ended (User clicks "Next" or leaves active video call)
        socket.on('end_active_call', async () => {
            const userId = socketToUserRegistry.get(socket.id);
            if (!userId)
                return;
            try {
                // Find active partner
                const matchDataStr = await redis_1.redis.get(`match:active:${userId}`);
                if (matchDataStr) {
                    const { partnerId } = JSON.parse(matchDataStr);
                    // Clear locks & active mappings in Redis
                    await redis_1.redis.del(`match:active:${userId}`);
                    await redis_1.redis.del(`match:active:${partnerId}`);
                    await redis_1.redis.del(`user:busy:${userId}`);
                    await redis_1.redis.del(`user:busy:${partnerId}`);
                    // Inform the partner that the call has been ended
                    const partnerSocketId = userToSocketRegistry.get(partnerId);
                    if (partnerSocketId) {
                        io.to(partnerSocketId).emit('partner_left', { message: 'Call ended by stranger' });
                    }
                    console.log(`❌ Call ended: ${userId} disconnected call with ${partnerId}`);
                }
            }
            catch (error) {
                console.error('End Call Error:', error);
            }
        });
        // Handle Direct Text Messaging
        socket.on('send_message', async (data) => {
            const { chatId, senderId, text, receiverId } = data;
            if (!chatId || !senderId || !text || !receiverId) {
                socket.emit('message_error', { message: 'Invalid message payload' });
                return;
            }
            try {
                const messageId = crypto_1.default.randomUUID();
                const timestamp = Date.now();
                // 1. Save message to MongoDB
                const newMessage = new message_model_1.Message({
                    messageId,
                    chatId,
                    senderId,
                    text,
                    timestamp
                });
                await newMessage.save();
                // 2. Send receipt delivery confirmation back to sender
                socket.emit('message_delivered', { messageId, chatId, senderId, text, timestamp });
                // 3. Deliver to receiver in real-time if they are online
                const receiverSocketId = userToSocketRegistry.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', {
                        messageId,
                        chatId,
                        senderId,
                        text,
                        timestamp
                    });
                    console.log(`💬 Real-time message delivered from ${senderId} to ${receiverId}`);
                }
                else {
                    console.log(`📥 Message saved to DB (receiver ${receiverId} offline)`);
                }
            }
            catch (error) {
                console.error('Send Message Error:', error);
                socket.emit('message_error', { message: 'Failed to deliver message' });
            }
        });
        // Handle Disconnect (App crash, internet issue, tab close)
        socket.on('disconnect', async () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            const userId = socketToUserRegistry.get(socket.id);
            if (userId) {
                try {
                    // 1. Fetch user's profile to clear them from lists
                    const userDb = await user_model_1.User.findOne({ userId });
                    const gender = userDb?.gender || 'Not Specified';
                    const country = userDb?.country || 'Global';
                    // 2. Remove user from matchmaking queues
                    await matchmaking_service_1.MatchmakingService.removeUser(userId, gender, country);
                    // 3. Check if user was in an active call
                    const matchDataStr = await redis_1.redis.get(`match:active:${userId}`);
                    if (matchDataStr) {
                        const { partnerId } = JSON.parse(matchDataStr);
                        // Clean active match pairs and unlock users
                        await redis_1.redis.del(`match:active:${userId}`);
                        await redis_1.redis.del(`match:active:${partnerId}`);
                        await redis_1.redis.del(`user:busy:${userId}`);
                        await redis_1.redis.del(`user:busy:${partnerId}`);
                        // Notify partner
                        const partnerSocketId = userToSocketRegistry.get(partnerId);
                        if (partnerSocketId) {
                            io.to(partnerSocketId).emit('partner_left', { message: 'Stranger disconnected' });
                        }
                        console.log(`⚠️ Disconnect Cleanup: Cleaned active call pair between ${userId} and ${partnerId}`);
                    }
                }
                catch (error) {
                    console.error('Disconnect Cleanup Error:', error);
                }
                finally {
                    // Clean registry mappings
                    socketToUserRegistry.delete(socket.id);
                    userToSocketRegistry.delete(userId);
                }
            }
        });
    });
};
exports.initSockets = initSockets;
