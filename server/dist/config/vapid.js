import webpush from 'web-push';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';
let vapidKeys = {
    publicKey: ENV.VAPID_PUBLIC_KEY,
    privateKey: ENV.VAPID_PRIVATE_KEY,
};
export const initializeVapid = () => {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        logger.warn('VAPID keys not found in environment. Generating development VAPID keys...');
        const generated = webpush.generateVAPIDKeys();
        vapidKeys = generated;
        logger.info('Generated Dev VAPID Public Key:', generated.publicKey);
    }
    webpush.setVapidDetails(ENV.VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey);
    return vapidKeys;
};
export const getVapidPublicKey = () => {
    return vapidKeys.publicKey;
};
