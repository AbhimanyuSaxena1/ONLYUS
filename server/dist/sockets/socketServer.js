import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { Call } from '../models/Call.js';
import { Message } from '../models/Message.js';
import { sendPushToUser } from '../services/pushService.js';
import { logger } from '../utils/logger.js';
const activeCalls = new Map();
// Map user ID to set of socket IDs (to support multiple tabs/devices)
const userSockets = new Map();
export const setupSocketServer = (httpServer, clientUrl) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 30000,
        pingInterval: 15000,
    });
    // Authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.id);
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }
            socket.data.userId = user._id.toString();
            socket.data.email = user.email;
            socket.data.name = user.name;
            next();
        }
        catch (err) {
            logger.warn(`Socket authentication failed: ${err.message}`);
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const userId = socket.data.userId;
        const userName = socket.data.name;
        logger.info(`Socket connected: ${userName} (User: ${userId}, Socket: ${socket.id})`);
        // Join personal room for targeting messages/calls to this user
        socket.join(`user:${userId}`);
        // Track active socket connections for this user
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        // Update DB online status and broadcast
        await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
        });
        // Notify other users
        socket.broadcast.emit('user:online', { userId });
        // ---------------------------------------------------------------------
        // PRESENCE EVENTS
        // ---------------------------------------------------------------------
        socket.on('user:status', (data) => {
            socket.broadcast.emit('user:status', { userId, status: data.status });
        });
        // ---------------------------------------------------------------------
        // CALLING EVENTS
        // ---------------------------------------------------------------------
        socket.on('call:initiate', async ({ receiverId, callType }) => {
            try {
                logger.info(`Call initiated by ${userId} to ${receiverId} (${callType})`);
                // Check if receiver is already in an active call
                const receiver = await User.findById(receiverId);
                if (!receiver) {
                    socket.emit('call:rejected', { callId: '', reason: 'User not found' });
                    return;
                }
                if (receiver.currentCallId) {
                    logger.info(`Receiver ${receiverId} is busy on call ${receiver.currentCallId}`);
                    socket.emit('call:busy', { callId: '' });
                    return;
                }
                // Create call record in DB
                const callDoc = await Call.create({
                    caller: userId,
                    receiver: receiverId,
                    callType,
                    status: 'ringing',
                    startedAt: new Date(),
                });
                const callId = callDoc._id.toString();
                activeCalls.set(callId, {
                    callId,
                    callerId: userId,
                    receiverId,
                    callType,
                    startedAt: new Date(),
                    status: 'ringing',
                });
                const callerUser = await User.findById(userId);
                // Notify receiver via Socket if online
                io.to(`user:${receiverId}`).emit('call:incoming', {
                    callId,
                    caller: {
                        id: userId,
                        name: callerUser?.name || 'Partner',
                        profilePicture: callerUser?.profilePicture || '',
                    },
                    callType,
                });
                // Trigger Web Push Notification
                await sendPushToUser(receiverId, {
                    title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
                    body: `${callerUser?.name || 'Your partner'} is calling you...`,
                    data: {
                        type: 'incoming_call',
                        callId,
                        callerId: userId,
                        callerName: callerUser?.name || 'Partner',
                        callType,
                        url: `/?incomingCall=${callId}&type=${callType}`,
                    },
                    actions: [
                        { action: 'accept', title: 'Accept' },
                        { action: 'decline', title: 'Decline' },
                    ],
                });
            }
            catch (err) {
                logger.error(`Error in call:initiate: ${err.message}`);
            }
        });
        socket.on('call:accept', async ({ callId }) => {
            try {
                const activeCall = activeCalls.get(callId);
                if (!activeCall) {
                    logger.warn(`Call accept failed: Call ${callId} not found in active calls`);
                    return;
                }
                activeCall.status = 'connected';
                logger.info(`Call ${callId} accepted by ${userId}`);
                await Call.findByIdAndUpdate(callId, {
                    status: 'accepted',
                    startedAt: new Date(),
                });
                await User.updateMany({ _id: { $in: [activeCall.callerId, activeCall.receiverId] } }, { currentCallId: callId });
                // Notify both parties that the call is accepted and ready for WebRTC negotiation
                io.to(`user:${activeCall.callerId}`).emit('call:accepted', { callId });
                io.to(`user:${activeCall.receiverId}`).emit('call:accepted', { callId });
            }
            catch (err) {
                logger.error(`Error in call:accept: ${err.message}`);
            }
        });
        socket.on('call:reject', async ({ callId, reason }) => {
            try {
                const activeCall = activeCalls.get(callId);
                logger.info(`Call ${callId} rejected by ${userId}`);
                if (activeCall) {
                    activeCalls.delete(callId);
                    await Call.findByIdAndUpdate(callId, {
                        status: 'rejected',
                        endedAt: new Date(),
                    });
                    await User.updateMany({ _id: { $in: [activeCall.callerId, activeCall.receiverId] } }, { currentCallId: null });
                    io.to(`user:${activeCall.callerId}`).emit('call:rejected', { callId, reason });
                    io.to(`user:${activeCall.receiverId}`).emit('call:rejected', { callId, reason });
                }
            }
            catch (err) {
                logger.error(`Error in call:reject: ${err.message}`);
            }
        });
        socket.on('call:ended', async ({ callId }) => {
            try {
                const activeCall = activeCalls.get(callId);
                logger.info(`Call ${callId} ended by ${userId}`);
                let duration = 0;
                if (activeCall) {
                    duration = Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000);
                    activeCalls.delete(callId);
                    await Call.findByIdAndUpdate(callId, {
                        status: 'ended',
                        endedAt: new Date(),
                        duration,
                    });
                    await User.updateMany({ _id: { $in: [activeCall.callerId, activeCall.receiverId] } }, { currentCallId: null });
                    io.to(`user:${activeCall.callerId}`).emit('call:ended', { callId, duration });
                    io.to(`user:${activeCall.receiverId}`).emit('call:ended', { callId, duration });
                }
                else {
                    // Fallback if not in memory
                    const callDoc = await Call.findById(callId);
                    if (callDoc && callDoc.status !== 'ended') {
                        callDoc.status = 'ended';
                        callDoc.endedAt = new Date();
                        if (callDoc.startedAt) {
                            callDoc.duration = Math.round((Date.now() - callDoc.startedAt.getTime()) / 1000);
                        }
                        await callDoc.save();
                        duration = callDoc.duration;
                        io.to(`user:${callDoc.caller}`).emit('call:ended', { callId, duration });
                        io.to(`user:${callDoc.receiver}`).emit('call:ended', { callId, duration });
                    }
                }
            }
            catch (err) {
                logger.error(`Error in call:ended: ${err.message}`);
            }
        });
        // ---------------------------------------------------------------------
        // WEBRTC SIGNALING (OFFER, ANSWER, ICE CANDIDATES)
        // ---------------------------------------------------------------------
        socket.on('call:offer', ({ callId, sdp }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                logger.info(`Relaying SDP offer for call ${callId} to ${targetUserId}`);
                io.to(`user:${targetUserId}`).emit('call:offer', { callId, sdp });
            }
        });
        socket.on('call:answer', ({ callId, sdp }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                logger.info(`Relaying SDP answer for call ${callId} to ${targetUserId}`);
                io.to(`user:${targetUserId}`).emit('call:answer', { callId, sdp });
            }
        });
        socket.on('call:ice-candidate', ({ callId, candidate }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                io.to(`user:${targetUserId}`).emit('call:ice-candidate', { callId, candidate });
            }
        });
        socket.on('call:mute', ({ callId, isMuted }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                io.to(`user:${targetUserId}`).emit('call:mute', { callId, isMuted });
            }
        });
        socket.on('call:camera', ({ callId, isCameraOff }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                io.to(`user:${targetUserId}`).emit('call:camera', { callId, isCameraOff });
            }
        });
        socket.on('call:reconnect', ({ callId }) => {
            const activeCall = activeCalls.get(callId);
            const targetUserId = activeCall
                ? (activeCall.callerId === userId ? activeCall.receiverId : activeCall.callerId)
                : null;
            if (targetUserId) {
                io.to(`user:${targetUserId}`).emit('call:reconnected', { callId });
            }
        });
        // ---------------------------------------------------------------------
        // REAL-TIME MESSAGING EVENTS
        // ---------------------------------------------------------------------
        socket.on('message:send', async ({ receiverId, content, messageType, attachment, replyTo }) => {
            try {
                const messageDoc = await Message.create({
                    sender: userId,
                    receiver: receiverId,
                    content: content || '',
                    messageType: messageType || 'text',
                    attachment: attachment || undefined,
                    replyTo: replyTo || null,
                    deliveredAt: null,
                    readAt: null,
                });
                const populated = await Message.findById(messageDoc._id)
                    .populate('replyTo', 'content sender messageType attachment')
                    .lean();
                // Emit to receiver's active sockets
                io.to(`user:${receiverId}`).emit('message:received', populated);
                // Also emit back to sender (in case they have multiple tabs open)
                io.to(`user:${userId}`).emit('message:received', populated);
                // Check if receiver is online; if so, mark delivered
                const receiverSockets = userSockets.get(receiverId);
                if (receiverSockets && receiverSockets.size > 0) {
                    const deliveredAt = new Date();
                    await Message.findByIdAndUpdate(messageDoc._id, { deliveredAt });
                    io.to(`user:${userId}`).emit('message:delivered', {
                        messageId: messageDoc._id.toString(),
                        deliveredAt,
                    });
                }
                else {
                    // Receiver offline: send push notification
                    const senderUser = await User.findById(userId);
                    await sendPushToUser(receiverId, {
                        title: senderUser?.name || 'New Message',
                        body: messageType === 'image' ? '📷 Sent a photo' : (content || 'Sent a message'),
                        data: {
                            type: 'new_message',
                            messageId: messageDoc._id.toString(),
                            senderId: userId,
                            url: '/chat',
                        },
                    });
                }
            }
            catch (err) {
                logger.error(`Error in message:send: ${err.message}`);
            }
        });
        socket.on('message:delivered', async ({ messageId }) => {
            try {
                const deliveredAt = new Date();
                const msg = await Message.findByIdAndUpdate(messageId, { deliveredAt }, { new: true });
                if (msg) {
                    io.to(`user:${msg.sender}`).emit('message:delivered', {
                        messageId,
                        deliveredAt,
                    });
                }
            }
            catch (err) {
                logger.error(`Error in message:delivered: ${err.message}`);
            }
        });
        socket.on('message:read', async ({ messageId }) => {
            try {
                const readAt = new Date();
                const msg = await Message.findByIdAndUpdate(messageId, { readAt, deliveredAt: readAt }, { new: true });
                if (msg) {
                    io.to(`user:${msg.sender}`).emit('message:read', {
                        messageId,
                        readAt,
                    });
                }
            }
            catch (err) {
                logger.error(`Error in message:read: ${err.message}`);
            }
        });
        socket.on('message:typing', ({ receiverId, isTyping }) => {
            io.to(`user:${receiverId}`).emit('message:typing', {
                userId,
                isTyping,
            });
        });
        socket.on('message:delete', async ({ messageId }) => {
            try {
                const msg = await Message.findById(messageId);
                if (msg && msg.sender.toString() === userId) {
                    msg.isDeleted = true;
                    await msg.save();
                    io.to(`user:${msg.receiver}`).emit('message:deleted', { messageId });
                    io.to(`user:${msg.sender}`).emit('message:deleted', { messageId });
                }
            }
            catch (err) {
                logger.error(`Error in message:delete: ${err.message}`);
            }
        });
        // ---------------------------------------------------------------------
        // DISCONNECT HANDLING
        // ---------------------------------------------------------------------
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${userName} (Socket: ${socket.id})`);
            const userSocketSet = userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.delete(socket.id);
                if (userSocketSet.size === 0) {
                    userSockets.delete(userId);
                    const lastSeen = new Date();
                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen,
                        currentCallId: null,
                    });
                    // Check if user was in an active call and terminate it cleanly
                    for (const [callId, call] of activeCalls.entries()) {
                        if (call.callerId === userId || call.receiverId === userId) {
                            activeCalls.delete(callId);
                            const duration = Math.round((Date.now() - call.startedAt.getTime()) / 1000);
                            await Call.findByIdAndUpdate(callId, {
                                status: 'ended',
                                endedAt: lastSeen,
                                duration,
                            });
                            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
                            io.to(`user:${otherUserId}`).emit('call:ended', { callId, duration });
                        }
                    }
                    // Broadcast offline event to all clients
                    socket.broadcast.emit('user:offline', { userId, lastSeen });
                }
            }
        });
    });
    return io;
};
