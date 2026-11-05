import { Device } from '../models/Device.js';
import { getVapidPublicKey } from '../config/vapid.js';
import { sendPushToUser } from '../services/pushService.js';
import { logger } from '../utils/logger.js';
export const getVapidKey = (_req, res) => {
    const publicKey = getVapidPublicKey();
    res.json({
        success: true,
        data: {
            publicKey,
        },
    });
};
export const subscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription, deviceName } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            res.status(400).json({ success: false, message: 'Invalid push subscription payload' });
            return;
        }
        // Upsert device subscription
        const device = await Device.findOneAndUpdate({
            user: userId,
            'pushSubscription.endpoint': subscription.endpoint,
        }, {
            user: userId,
            deviceName: deviceName || req.headers['user-agent'] || 'Web Browser',
            pushSubscription: subscription,
            lastActive: new Date(),
        }, { upsert: true, new: true });
        logger.info(`Push subscription registered for user ${userId} (device ${device._id})`);
        res.status(201).json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const unsubscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { endpoint } = req.body;
        if (endpoint) {
            await Device.findOneAndDelete({ user: userId, 'pushSubscription.endpoint': endpoint });
        }
        else {
            await Device.deleteMany({ user: userId });
        }
        res.json({ success: true, message: 'Push subscription removed' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const testPushNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        await sendPushToUser(userId, {
            title: 'OnlyUs Test Notification',
            body: 'Push notifications are working perfectly on this device! ❤️',
            data: {
                type: 'new_message',
                url: '/',
            },
        });
        res.json({ success: true, message: 'Test notification sent' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
