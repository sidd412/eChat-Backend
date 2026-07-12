import { Server, Socket } from 'socket.io';
import { UserState, MatchmakingService } from '../services/matchmaking.service';
import { User } from '../models/user.model';
import { Message } from '../models/message.model';
import { Consent } from '../models/consent.model';
import { Interaction } from '../models/interaction.model';
import { redis } from '../config/redis';
import { admin, getIsFirebaseInitialized } from '../config/firebase';
import { getMessaging } from 'firebase-admin/messaging';
import crypto from 'crypto';

// Mappings for User Connections
const socketToUserRegistry = new Map<string, string>();
const userToSocketRegistry = new Map<string, string>();
const activeMatchIntervals = new Map<string, NodeJS.Timeout>();

// Helper function to safely end an active call
const handleEndCall = async (io: Server, userId: string) => {
  try {
    const matchDataStr = await redis.get(`match:active:${userId}`);
    if (matchDataStr) {
      const { partnerId } = JSON.parse(matchDataStr);

      // Clear active coin deduction interval
      const matchId = [userId, partnerId].sort().join('_');
      if (activeMatchIntervals.has(matchId)) {
        clearInterval(activeMatchIntervals.get(matchId)!);
        activeMatchIntervals.delete(matchId);
      }

      // Clear locks & active mappings in Redis
      await redis.del(`match:active:${userId}`);
      await redis.del(`match:active:${partnerId}`);
      await redis.del(`user:busy:${userId}`);
      await redis.del(`user:busy:${partnerId}`);

      // Inform the partner that the call has been ended
      const partnerSocketId = userToSocketRegistry.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_left', { message: 'Call ended by stranger' });
      }

      console.log(`❌ Call ended: ${userId} disconnected call with ${partnerId}`);
    }
  } catch (error) {
    console.error('End Call Error:', error);
  }
};

export const initSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // DEBUG: Log ALL incoming socket events
    socket.onAny((eventName: string, ...args: any[]) => {
      console.log(`📡 [DEBUG] Event received: "${eventName}" from socket ${socket.id}`, JSON.stringify(args).substring(0, 200));
    });

    // Register User with socket connection
    socket.on('register_user', async ({ userId, fcmToken }: { userId: string; fcmToken?: string }) => {
      if (userId) {
        socketToUserRegistry.set(socket.id, userId);
        userToSocketRegistry.set(userId, socket.id);
        
        if (fcmToken) {
          try {
            await User.updateOne(
              { userId }, 
              { fcmToken, isOnline: true }
            );
            console.log(`📱 Updated FCM token and online status for ${userId}`);
            
            // Broadcast status to connected friends/chats could be added here later
            io.emit('user_status_changed', { userId, isOnline: true });
          } catch (e) {
            console.error('Error updating fcmToken:', e);
          }
        } else {
          try {
            await User.updateOne({ userId }, { isOnline: true });
            io.emit('user_status_changed', { userId, isOnline: true });
          } catch (e) {
            console.error('Error updating online status:', e);
          }
        }
        
        console.log(`👤 User registered: ${userId} to socket ${socket.id}`);
      }
    });

    // Handle Join Match Queue
    socket.on('join_match_queue', async (data: any) => {
      console.log(`🎯 [DEBUG] join_match_queue RECEIVED from socket ${socket.id}, data:`, JSON.stringify(data).substring(0, 300));
      try {
        const {
          userId,
          name,
          gender,
          age,
          country,
          longitude,
          latitude,
          prefGender,
          prefMinAge,
          prefMaxAge,
          filterType,
          kmRadius
        } = data;

        if (!userId) {
          socket.emit('match_error', { message: 'Missing User ID' });
          return;
        }

        // RACE CONDITION FIX: If the user is rapidly clicking "Next", join_match_queue
        // might arrive before end_active_call finishes (or instead of it).
        // Ensure any existing call is properly terminated and partner is notified first.
        await handleEndCall(io, userId);

        // Fetch user completely to get the latest balance and state
        const userDb = await User.findOne({ userId });
        if (!userDb || userDb.coinsBalance < 10) {
          socket.emit('match_error', { message: 'Insufficient coins to join call' });
          return;
        }

        // Map socket ID just in case register_user wasn't called
        socketToUserRegistry.set(socket.id, userId);
        userToSocketRegistry.set(userId, socket.id);

        const userState: UserState = {
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
        const match = await MatchmakingService.findMatch(userState, name || 'Stranger');

        if (match) {
          // Send match settings to both users
          const partnerSocketId = match.partner.socketId;

          // Save active matching pair in Redis
          await redis.set(`match:active:${userId}`, JSON.stringify({ partnerId: match.partner.userId, channelName: match.channelName }), 'EX', 3600);
          await redis.set(`match:active:${match.partner.userId}`, JSON.stringify({ partnerId: userId, channelName: match.channelName }), 'EX', 3600);

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
              gender: gender || 'Not Specified',
              age: Number(age) || 18,
              country: country || 'Global'
            }
          });

          console.log(`✅ Match Connected: ${userId} <-> ${match.partner.userId}`);

          // --- COIN DEDUCTION LOGIC ---
          const matchId = [userId, match.partner.userId].sort().join('_');
          
          const deductCoins = async () => {
            try {
              const u1 = await User.findOne({ userId });
              const u2 = await User.findOne({ userId: match.partner.userId });
              
              if (!u1 || !u2) {
                if (activeMatchIntervals.has(matchId)) {
                  clearInterval(activeMatchIntervals.get(matchId)!);
                  activeMatchIntervals.delete(matchId);
                }
                return;
              }

              if (u1.coinsBalance < 10) {
                socket.emit('insufficient_funds', { message: 'Out of coins! Please recharge.' });
                handleEndCall(io, userId);
                return;
              }
              if (u2.coinsBalance < 10) {
                io.to(partnerSocketId).emit('insufficient_funds', { message: 'Out of coins! Please recharge.' });
                handleEndCall(io, match.partner.userId);
                return;
              }

              u1.coinsBalance -= 10;
              u2.coinsBalance -= 10;
              
              await u1.save();
              await u2.save();
              
              socket.emit('wallet_update', { coinsBalance: u1.coinsBalance });
              io.to(partnerSocketId).emit('wallet_update', { coinsBalance: u2.coinsBalance });
              
              if (u1.coinsBalance < 10) {
                socket.emit('insufficient_funds', { message: 'Out of coins! Please recharge.' });
                handleEndCall(io, userId);
              } else if (u2.coinsBalance < 10) {
                io.to(partnerSocketId).emit('insufficient_funds', { message: 'Out of coins! Please recharge.' });
                handleEndCall(io, match.partner.userId);
              }
            } catch (err) {
              console.error('Coin deduction error:', err);
            }
          };

          // Deduct for the first minute immediately
          deductCoins();

          // Then deduct every subsequent 60 seconds
          const intervalId = setInterval(deductCoins, 60000);

          activeMatchIntervals.set(matchId, intervalId);
        }
      } catch (error) {
        console.error('Matchmaking Error:', error);
        socket.emit('match_error', { message: 'Failed to join queue' });
      }
    });

    // Handle Leave Match Queue (User cancels matchmaking before finding anyone)
    socket.on('leave_match_queue', async ({ userId, gender, country }) => {
      if (userId) {
        await MatchmakingService.removeUser(userId, gender, country);
        socket.emit('match_left', { success: true });
        console.log(`🚫 User voluntarily left queue: ${userId}`);
      }
    });

    // Handle Skip / Call Ended (User clicks "Next" or leaves active video call)
    socket.on('end_active_call', async () => {
      const userId = socketToUserRegistry.get(socket.id);
      if (userId) {
        await handleEndCall(io, userId);
      }
    });

    // Handle Direct Text Messaging
    socket.on('send_message', async (data: { chatId: string; senderId: string; text: string; receiverId: string; messageId?: string }) => {
      const { chatId, senderId, text, receiverId } = data;
      const messageId = data.messageId || crypto.randomUUID();
      if (!chatId || !senderId || !text || !receiverId) {
        socket.emit('message_error', { message: 'Invalid message payload' });
        return;
      }

      try {
        const timestamp = Date.now();

        // 1. Save message to MongoDB
        const newMessage = new Message({
          messageId,
          chatId,
          senderId,
          text,
          timestamp
        });
        await newMessage.save();

        // 2. Send receipt delivery confirmation back to sender
        socket.emit('message_delivered', { messageId, chatId, senderId, text, timestamp });
        console.log(`📨 [MSG] Message saved & delivered receipt sent. chatId=${chatId}, sender=${senderId}, receiver=${receiverId}`);

        // 3. Check if receiver has blocked the sender or already added them
        const receiverInteraction = await Interaction.findOne({ userId: receiverId, targetUserId: senderId });
        console.log(`📨 [MSG] Receiver interaction check: exists=${!!receiverInteraction}, isBlocked=${receiverInteraction?.isBlocked}`);
        if (receiverInteraction && receiverInteraction.isBlocked) {
           console.log(`🚫 Message saved, but sender ${senderId} is blocked by ${receiverId}. No notification sent.`);
           return;
        }

        // If interaction exists (and is not blocked), consent is implicitly granted because sender is in receiver's chat list.
        let isAllowed = !!receiverInteraction;
        let isPending = false;
        let isNewConsentRequest = false;
        const receiverSocketId = userToSocketRegistry.get(receiverId);
        console.log(`📨 [MSG] isAllowed=${isAllowed}, receiverSocketId=${receiverSocketId || 'NONE (offline)'}`);

        if (!isAllowed) {
            let consent = await Consent.findOne({ senderId, receiverId });
            
            if (consent && consent.status === 'denied') {
              // If denied previously, resetting to pending so receiver gets notified again per requirement
              consent.status = 'pending';
              await consent.save();
              isNewConsentRequest = true;
            }

            if (!consent) {
              // Create pending consent request
              consent = new Consent({ senderId, receiverId, status: 'pending' });
              await consent.save();
              isNewConsentRequest = true;
            }

            if (consent.status === 'pending') {
              isPending = true;
            } else if (consent.status === 'allowed') {
              isAllowed = true;
            }
        }

        if (isPending) {
          // Emit a consent notification rather than the direct message
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('consent_notification', {
              senderId,
              message: 'You have a new message request'
            });
            console.log(`🔔 Consent socket notification sent from ${senderId} to ${receiverId}`);
          }
          
          // Send FCM Push Notification
          console.log(`📨 [MSG] Checking FCM for consent notification. isFirebaseInitialized=${getIsFirebaseInitialized()}, isNewConsentRequest=${isNewConsentRequest}`);
          if (getIsFirebaseInitialized() && isNewConsentRequest) {
            try {
              const receiverDb = await User.findOne({ userId: receiverId });
              const senderDb = await User.findOne({ userId: senderId });
              console.log(`📨 [MSG] FCM lookup: receiverFcmToken=${receiverDb?.fcmToken ? 'YES' : 'NO'}, senderName=${senderDb?.name}`);
              
              if (receiverDb && receiverDb.fcmToken && senderDb) {
                const notificationPayload: any = {
                  title: 'New Message Request',
                  body: `${senderDb.name} wants to connect with you.`
                };
                if (senderDb.avatar) {
                  notificationPayload.imageUrl = senderDb.avatar;
                }
                const messagePayload = {
                  notification: notificationPayload,
                  data: {
                    type: 'CONSENT_REQUEST',
                    senderId: senderId,
                    senderName: senderDb.name
                  },
                  token: receiverDb.fcmToken
                };
                
                const fcmResult = await getMessaging().send(messagePayload);
                console.log(`📱 FCM Consent Push sent to ${receiverId}, result: ${fcmResult}`);
              } else {
                console.log(`📨 [MSG] FCM skipped: missing receiver token or sender data`);
              }
            } catch (err) {
              console.error('FCM Push Error:', err);
            }
          } else {
            console.log(`📨 [MSG] FCM not initialized, skipping push notification`);
          }
          return; // Do NOT emit receive_message yet
        }

        // 4. Deliver to receiver in real-time if allowed
        if (isAllowed) {
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('receive_message', {
                messageId,
                chatId,
                senderId,
                text,
                timestamp
              });
              console.log(`💬 Real-time message delivered from ${senderId} to ${receiverId}`);
            } else {
              console.log(`📥 Message saved to DB (receiver ${receiverId} offline)`);
            }

            // Send FCM Push Notification for normal messages if allowed
            console.log(`📨 [MSG] Checking FCM for chat message push. isFirebaseInitialized=${getIsFirebaseInitialized()}`);
            if (getIsFirebaseInitialized()) {
              try {
                const receiverDb = await User.findOne({ userId: receiverId });
                const senderDb = await User.findOne({ userId: senderId });
                console.log(`📨 [MSG] FCM chat lookup: receiverFcmToken=${receiverDb?.fcmToken ? 'YES' : 'NO'}, senderName=${senderDb?.name}`);
                
                if (receiverDb && receiverDb.fcmToken && senderDb) {
                  const notificationPayload: any = {
                    title: senderDb.name,
                    body: text
                  };
                  if (senderDb.avatar) {
                    notificationPayload.imageUrl = senderDb.avatar;
                  }
                  const messagePayload = {
                    notification: notificationPayload,
                    data: {
                      type: 'CHAT_MESSAGE',
                      chatId: chatId,
                      senderId: senderId,
                      senderName: senderDb.name
                    },
                    token: receiverDb.fcmToken
                  };
                  
                  const fcmResult = await getMessaging().send(messagePayload);
                  console.log(`📱 FCM Chat Push sent to ${receiverId}, result: ${fcmResult}`);
                } else {
                  console.log(`📨 [MSG] FCM chat skipped: missing receiver token or sender data`);
                }
              } catch (err) {
                console.error('FCM Chat Push Error:', err);
              }
            } else {
              console.log(`📨 [MSG] FCM not initialized, skipping chat push notification`);
            }
        }
      } catch (error) {
        console.error('Send Message Error:', error);
        socket.emit('message_error', { message: 'Failed to deliver message' });
      }
    });
    // Handle Mark as Read
    socket.on('mark_as_read', async ({ chatId, senderId, receiverId }: { chatId: string, senderId: string, receiverId: string }) => {
      try {
        await Message.updateMany(
          { chatId, senderId, readStatus: false },
          { readStatus: true }
        );
        console.log(`👁️ Messages marked as read in ${chatId} by ${receiverId}`);
        
        // Notify the original sender that their messages were read
        const senderSocketId = userToSocketRegistry.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_read', { chatId, readerId: receiverId });
        }
      } catch (error) {
        console.error('Mark as Read Error:', error);
      }
    });

    // Handle Disconnect (App crash, internet issue, tab close)
    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const userId = socketToUserRegistry.get(socket.id);
      
      if (userId) {
        try {
          // 1. Fetch user's profile to clear them from lists
          const userDb = await User.findOne({ userId });
          const gender = userDb?.gender || 'Not Specified';
          const country = userDb?.country || 'Global';

          // 2. Remove user from matchmaking queues
          await MatchmakingService.removeUser(userId, gender, country);

          // 3. Check if user was in an active call
          const matchDataStr = await redis.get(`match:active:${userId}`);
          if (matchDataStr) {
            const { partnerId } = JSON.parse(matchDataStr);

            // Clean active match pairs and unlock users
            await redis.del(`match:active:${userId}`);
            await redis.del(`match:active:${partnerId}`);
            await redis.del(`user:busy:${userId}`);
            await redis.del(`user:busy:${partnerId}`);

            // Notify partner
            const partnerSocketId = userToSocketRegistry.get(partnerId);
            if (partnerSocketId) {
              io.to(partnerSocketId).emit('partner_left', { message: 'Stranger disconnected' });
            }

            console.log(`⚠️ Disconnect Cleanup: Cleaned active call pair between ${userId} and ${partnerId}`);
          }
          // 4. Update online status
          await User.updateOne({ userId }, { isOnline: false, lastSeen: Date.now() });
          io.emit('user_status_changed', { userId, isOnline: false, lastSeen: Date.now() });

        } catch (error) {
          console.error('Disconnect Cleanup Error:', error);
        } finally {
          // Clean registry mappings
          socketToUserRegistry.delete(socket.id);
          userToSocketRegistry.delete(userId);
        }
      }
    });
  });
};
