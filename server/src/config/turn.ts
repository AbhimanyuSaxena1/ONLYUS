import { ENV } from './env.js';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const getIceServers = (): IceServerConfig[] => {
  const iceServers: IceServerConfig[] = [
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
  } else {
    // Default fallback to free OpenRelay TURN servers so mobile cellular/NAT calls always connect!
    iceServers.push(
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
  }

  return iceServers;
};
