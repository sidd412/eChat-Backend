"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInteractions = exports.toggleInteraction = exports.updateProfile = exports.getProfile = exports.loginGoogle = exports.loginGuest = void 0;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const interaction_model_1 = require("../models/interaction.model");
const crypto_1 = __importDefault(require("crypto"));
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const generateToken = (userId, name) => {
    return jsonwebtoken_1.default.sign({ userId, name }, process.env.JWT_SECRET || 'supersecretjwtechatkey123!@#', { expiresIn: '30d' });
};
// 1. Guest Authentication
const loginGuest = async (request, reply) => {
    try {
        const { name } = request.body;
        const guestName = name || 'Guest User';
        // Generate a secure guest UID
        const guestId = `guest_${crypto_1.default.randomBytes(6).toString('hex')}`;
        // Create new guest user in database
        const newUser = new user_model_1.User({
            userId: guestId,
            name: guestName,
            availableMinutes: 30, // 30 Free Minutes
            isOnline: true,
            preferences: {
                gender: 'All',
                minAge: 18,
                maxAge: 99
            }
        });
        await newUser.save();
        const token = generateToken(guestId, guestName);
        return reply.status(200).send({
            success: true,
            token,
            user: {
                userId: newUser.userId,
                name: newUser.name,
                availableMinutes: newUser.availableMinutes,
                preferences: newUser.preferences,
                country: newUser.country
            }
        });
    }
    catch (error) {
        console.error('Guest Auth Error:', error);
        return reply.status(500).send({ error: 'Internal Server Error during Guest Login' });
    }
};
exports.loginGuest = loginGuest;
// 2. Google OAuth Verification
const loginGoogle = async (request, reply) => {
    try {
        const { idToken } = request.body;
        if (!idToken) {
            return reply.status(400).send({ error: 'Google ID Token is required' });
        }
        // Verify ID Token with Google OAuth API
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.sub) {
            return reply.status(400).send({ error: 'Invalid Google ID Token payload' });
        }
        const googleUserId = payload.sub;
        const name = payload.name || 'Google User';
        const email = payload.email;
        const avatar = payload.picture;
        // Check if user exists
        let user = await user_model_1.User.findOne({ userId: googleUserId });
        if (user) {
            // Update status to online and refresh details
            user.isOnline = true;
            if (avatar)
                user.avatar = avatar;
            await user.save();
        }
        else {
            // Create new user with 30 free minutes
            user = new user_model_1.User({
                userId: googleUserId,
                name,
                email,
                avatar,
                availableMinutes: 30, // 30 free minutes
                isOnline: true,
                preferences: {
                    gender: 'All',
                    minAge: 18,
                    maxAge: 99
                }
            });
            await user.save();
        }
        const token = generateToken(user.userId, user.name);
        return reply.status(200).send({
            success: true,
            token,
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                availableMinutes: user.availableMinutes,
                preferences: user.preferences,
                country: user.country
            }
        });
    }
    catch (error) {
        console.error('Google Auth Error:', error);
        return reply.status(401).send({ error: 'Invalid Google Sign-In Token' });
    }
};
exports.loginGoogle = loginGoogle;
// 3. Fetch Self Profile (Authenticated route test)
const getProfile = async (request, reply) => {
    try {
        const requester = request.user;
        const user = await user_model_1.User.findOne({ userId: requester.userId });
        if (!user) {
            return reply.status(404).send({ error: 'User profile not found' });
        }
        return reply.status(200).send({ success: true, user });
    }
    catch (error) {
        return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }
};
exports.getProfile = getProfile;
// 4. Update Profile & Preferences
const updateProfile = async (request, reply) => {
    try {
        const requester = request.user;
        const { name, gender, age, country, longitude, latitude, prefGender, prefMinAge, prefMaxAge, filterType, kmRadius } = request.body;
        const user = await user_model_1.User.findOne({ userId: requester.userId });
        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }
        if (name)
            user.name = name;
        if (gender)
            user.gender = gender;
        if (age !== undefined)
            user.age = Number(age);
        if (country)
            user.country = country;
        if (longitude !== undefined && latitude !== undefined) {
            user.location = {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)]
            };
        }
        user.preferences = {
            gender: prefGender || user.preferences.gender,
            minAge: prefMinAge !== undefined ? Number(prefMinAge) : user.preferences.minAge,
            maxAge: prefMaxAge !== undefined ? Number(prefMaxAge) : user.preferences.maxAge,
            filterType: filterType || user.preferences.filterType,
            kmRadius: kmRadius !== undefined ? Number(kmRadius) : user.preferences.kmRadius
        };
        await user.save();
        return reply.status(200).send({
            success: true,
            message: 'Profile updated successfully',
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                availableMinutes: user.availableMinutes,
                preferences: user.preferences,
                country: user.country
            }
        });
    }
    catch (error) {
        console.error('Update Profile Error:', error);
        return reply.status(500).send({ error: 'Failed to update user profile' });
    }
};
exports.updateProfile = updateProfile;
// 5. Toggle Interaction (Like / Add)
const toggleInteraction = async (request, reply) => {
    try {
        const requester = request.user;
        const { targetUserId, interactionType, isActive } = request.body;
        if (!targetUserId || !interactionType) {
            return reply.status(400).send({ error: 'Target User ID and interaction type are required' });
        }
        const query = { userId: requester.userId, targetUserId };
        const update = { [interactionType]: isActive, timestamp: Date.now() };
        await interaction_model_1.Interaction.findOneAndUpdate(query, update, { upsert: true, new: true });
        return reply.status(200).send({ success: true, message: 'Interaction registered successfully' });
    }
    catch (error) {
        console.error('Toggle Interaction Error:', error);
        return reply.status(500).send({ error: 'Failed to record interaction' });
    }
};
exports.toggleInteraction = toggleInteraction;
// 6. Retrieve Interacted Users List
const getInteractions = async (request, reply) => {
    try {
        const requester = request.user;
        // Find all interactions created by the logged-in user
        const interactions = await interaction_model_1.Interaction.find({ userId: requester.userId });
        const list = await Promise.all(interactions.map(async (item) => {
            const targetUser = await user_model_1.User.findOne({ userId: item.targetUserId });
            return {
                id: item.targetUserId,
                name: targetUser?.name || `User ${item.targetUserId.substring(0, 4)}`,
                lastMessage: item.liked && item.added ? 'Liked & Added' : item.liked ? 'Liked' : 'Added',
                time: 'Just now',
                isLiked: item.liked,
                isAdded: item.added
            };
        }));
        return reply.status(200).send({
            success: true,
            interactions: list
        });
    }
    catch (error) {
        console.error('Get Interactions Error:', error);
        return reply.status(500).send({ error: 'Failed to retrieve interactions' });
    }
};
exports.getInteractions = getInteractions;
