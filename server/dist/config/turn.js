import { ENV } from './env.js';
export const getIceServers = () => {
    const iceServers = [
        {
            urls: ENV.STUN_SERVERS,
        },
        // Public free backup STUN servers
        {
            urls: [
                'stun:stun.services.mozilla.com',
                'stun:global.stun.twilio.com:3478',
            ],
        },
    ];
    if (ENV.TURN_SERVER_URL) {
        iceServers.push({
            urls: ENV.TURN_SERVER_URL,
            username: ENV.TURN_USERNAME,
            credential: ENV.TURN_CREDENTIAL,
        });
    }
    return iceServers;
};
