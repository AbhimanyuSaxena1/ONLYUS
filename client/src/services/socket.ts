import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const getServerUrl = (): string => {
  const envServer = import.meta.env.VITE_SERVER_URL;
  if (envServer) return envServer.replace(/\/+$/, '');

  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && envApi.startsWith('http')) {
    return envApi.replace(/\/api\/?$/, '');
  }

  return '';
};

export const connectSocket = (token: string): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const serverUrl = getServerUrl();
  const socketOptions = {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  };

  socket = serverUrl ? io(serverUrl, socketOptions) : io(socketOptions);

  socket.on('connect', () => {
    console.log('[Socket] Connected with ID:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
