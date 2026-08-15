import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Interaction } from '../models/interaction.model';
import { Message } from '../models/message.model';
import crypto from 'crypto';
import { uploadFile, deleteFile } from '../services/storage.service';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId: string, name: string) => {
  return jwt.sign(
    { userId, name },
    process.env.JWT_SECRET || 'supersecretjwtechatkey123!@#',
    { expiresIn: '30d' }
  );
};

// 1. Guest Authentication
export const loginGuest = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { name, fcmToken } = request.body as { name?: string; fcmToken?: string };
    const guestName = name || 'Guest User';
    
    // Generate a secure guest UID
    const guestId = `guest_${crypto.randomBytes(6).toString('hex')}`;
    
    // Create new guest user in database
    const newUser = new User({
      userId: guestId,
      name: guestName,
      coinsBalance: 1000, // 1000 Free Coins for Google Review Testing
      isOnline: true,
      fcmToken,
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
      user: newUser
    });
  } catch (error: any) {
    console.error('Guest Auth Error:', error);
    return reply.status(500).send({ error: 'Internal Server Error during Guest Login' });
  }
};

// 2. Google OAuth Verification
export const loginGoogle = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { idToken, fcmToken } = request.body as { idToken: string; fcmToken?: string };
    
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
    let user = await User.findOne({ userId: googleUserId });
    
    if (user) {
      // Update status to online and refresh details
      user.isOnline = true;
      if (avatar) user.avatar = avatar;
      if (fcmToken) user.fcmToken = fcmToken;
      await user.save();
    } else {
      // Create new user with 30 free minutes
      user = new User({
        userId: googleUserId,
        name,
        email,
        avatar,
        coinsBalance: 1000, // 1000 free coins for Google review testing
        isOnline: true,
        fcmToken,
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
        gender: user.gender,
        age: user.age,
        dob: user.dob,
        bio: user.bio,
        contactNumber: user.contactNumber,
        coinsBalance: user.coinsBalance,
        preferences: user.preferences,
        country: user.country,
        referralCode: user.referralCode
      }
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return reply.status(401).send({ error: 'Invalid Google Sign-In Token' });
  }
};

// 3. Fetch Self Profile (Authenticated route test)
export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const user = await User.findOne({ userId: requester.userId });
    
    if (!user) {
      return reply.status(404).send({ error: 'User profile not found' });
    }
    
    return reply.status(200).send({ success: true, user });
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to fetch user profile' });
  }
};

// 4. Update Profile & Preferences
export const updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const {
      name,
      gender,
      age,
      dob,
      bio,
      contactNumber,
      avatar,
      country,
      longitude,
      latitude,
      prefGender,
      prefMinAge,
      prefMaxAge,
      filterType,
      kmRadius
    } = request.body as any;

    const user = await User.findOne({ userId: requester.userId });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (age !== undefined) user.age = Number(age);
    if (dob !== undefined) user.dob = dob;
    if (bio !== undefined) user.bio = bio;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (avatar && avatar.startsWith('data:image')) {
      const parts = avatar.split(';base64,');
      if (parts.length === 2) {
        const header = parts[0];
        const data = parts[1];
        const ext = header.split('/')[1] || 'jpg';
        const buffer = Buffer.from(data, 'base64');
        const filename = `${user.userId}_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
        const contentType = header.split(':')[1] || 'image/jpeg';
        
        // Delete old avatar from GCS if it exists
        if (user.avatar) {
          await deleteFile(user.avatar);
        }

        // Upload to Google Cloud Storage
        const gcsUrl = await uploadFile(filename, buffer, contentType);
        user.avatar = gcsUrl;
      }
    } else if (avatar) {
      user.avatar = avatar;
    }
    if (country) user.country = country;

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
        gender: user.gender,
        age: user.age,
        dob: user.dob,
        bio: user.bio,
        contactNumber: user.contactNumber,
        coinsBalance: user.coinsBalance,
        preferences: user.preferences,
        country: user.country,
        referralCode: user.referralCode
      }
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return reply.status(500).send({ error: 'Failed to update user profile' });
  }
};

// 5. Toggle Interaction (Like / Add / Block)
export const toggleInteraction = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    const { targetUserId, interactionType, isActive } = request.body as {
      targetUserId: string;
      interactionType: 'liked' | 'added' | 'consent';
      isActive: boolean;
    };

    if (!targetUserId || !interactionType) {
      return reply.status(400).send({ error: 'Target User ID and interaction type are required' });
    }

    const query = { userId: requester.userId, targetUserId };
    const updateOp = isActive
      ? { $addToSet: { categories: interactionType }, $set: { timestamp: Date.now() } }
      : { $pull: { categories: interactionType }, $set: { timestamp: Date.now() } };

    await Interaction.findOneAndUpdate(query, updateOp, { upsert: true, new: true });

    return reply.status(200).send({ success: true, message: 'Interaction registered successfully' });
  } catch (error: any) {
    console.error('Toggle Interaction Error:', error);
    return reply.status(500).send({ error: 'Failed to record interaction' });
  }
};

// 6. Retrieve Interacted Users List
const formatWhatsAppTime = (timestamp: number): string => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const getInteractions = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const requester = (request as any).user;
    
    // Find all interactions created by the logged-in user that are not blocked
    // and have at least one category
    const interactions = await Interaction.find({
      userId: requester.userId,
      isBlocked: false,
      'categories.0': { $exists: true }
    });
    
    const list = await Promise.all(
      interactions.map(async (item) => {
        const targetUser = await User.findOne({ userId: item.targetUserId });
        
        const chatId = requester.userId < item.targetUserId 
          ? `chat_${requester.userId}_${item.targetUserId}`
          : `chat_${item.targetUserId}_${requester.userId}`;

        const unreadCount = await Message.countDocuments({
          chatId,
          senderId: item.targetUserId, // sender is the other person
          readStatus: false
        });

        // Query the latest message in this conversation
        const latestMsg = await Message.findOne({ chatId }).sort({ timestamp: -1 });

        let lastMessageText = 'Tap to start conversation';
        let lastMessageSenderId: string | null = null;
        let lastMessageReadStatus: boolean | null = null;
        let msgTimestamp: number = item.timestamp || Date.now();

        if (latestMsg) {
          lastMessageText = latestMsg.text;
          msgTimestamp = latestMsg.timestamp;
          lastMessageSenderId = latestMsg.senderId;
          lastMessageReadStatus = latestMsg.readStatus;
        }
        
        return {
          id: item.targetUserId,
          name: targetUser?.name || `User ${item.targetUserId.substring(0, 4)}`,
          avatar: targetUser?.avatar || '',
          lastMessage: lastMessageText,
          time: formatWhatsAppTime(msgTimestamp),
          timestamp: msgTimestamp,
          lastMessageSenderId,
          lastMessageReadStatus,
          categories: item.categories,
          unreadCount,
          isLiked: item.categories.includes('liked'),
          isAdded: item.categories.includes('added') || item.categories.includes('consent') || item.categories.includes('friend'),
          isOnline: targetUser?.isOnline || false,
          lastSeen: targetUser?.lastSeen || 0
        };
      })
    );

    // Sort conversations: newest message at the top
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return reply.send({ success: true, interactions: list });
  } catch (error) {
    console.error('Get interactions error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};

export const getUserProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { userId } = request.params as { userId: string };
    const user = await User.findOne({ userId });
    
    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    return reply.send({
      success: true,
      profile: {
        userId: user.userId,
        name: user.name,
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        coinsBalance: user.coinsBalance
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
};
