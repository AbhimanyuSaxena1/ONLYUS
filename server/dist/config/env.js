import dotenv from 'dotenv';
dotenv.config();
export const ENV = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onlyus',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'onlyus-super-secret-access-key-change-in-prod-12345',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'onlyus-super-secret-refresh-key-change-in-prod-67890',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@onlyus.app',
    MAX_ALLOWED_USERS: 2, // strictly 2 users for OnlyUs private app
    TURN_SERVER_URL: process.env.TURN_SERVER_URL || '',
    TURN_USERNAME: process.env.TURN_USERNAME || '',
    TURN_CREDENTIAL: process.env.TURN_CREDENTIAL || '',
    STUN_SERVERS: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
    ],
};
