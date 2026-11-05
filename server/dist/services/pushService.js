import webpush from 'web-push';
import { Device } from '../models/Device.js';
import { logger } from '../utils/logger.js';
import { initializeVapid } from '../config/vapid.js';
initializeVapid();
export const sendPushToUser = async (userId, payload) => {
    try {
        const devices = await Device.find({ user: userId });
        if (!devices || devices.length === 0) {
            logger.info(`No registered push devices found for user ${userId}`);
            return;
        }
        const payloadString = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/badge-72x72.png',
            tag: payload.tag || 'onlyus-notification',
            data: {
                ...payload.data,
                url: payload.data?.url || '/',
            },
            actions: payload.actions || [],
            requireInteraction: payload.data?.type === 'incoming_call',
            vibrate: payload.data?.type === 'incoming_call' ? [500, 250, 500, 250, 500] : [200, 100, 200],
        });
        const sendPromises = devices.map(async (device) => {
            try {
                await webpush.sendNotification(device.pushSubscription, payloadString);
                logger.info(`Push notification sent to device ${device._id} for user ${userId}`);
            }
            catch (err) {
                logger.warn(`Failed to send push to device ${device._id}: ${err.message}`);
                // If status code 404 or 410, subscription is defunct: delete from DB
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await Device.findByIdAndDelete(device._id);
                    logger.info(`Removed stale subscription for device ${device._id}`);
                }
            }
        });
        await Promise.allSettled(sendPromises);
    }
    catch (error) {
        logger.error(`Error in sendPushToUser: ${error.message}`);
    }
};
