import { create } from 'zustand';
import { CallType, CallStatus, User } from '../types';
import { WebRtcManager } from '../services/webrtc';
import { getSocket } from '../services/socket';
import { apiClient } from '../services/api';
import { soundEffects } from '../services/soundEffects';

interface CallState {
  activeCallId: string | null;
  callType: CallType;
  callStatus: CallStatus;
  caller: User | null;
  remoteUser: User | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isRemoteMuted: boolean;
  isRemoteCameraOff: boolean;
  facingMode: 'user' | 'environment';
  duration: number; // in seconds
  connectionQuality: 'good' | 'poor' | 'disconnected';
  webrtcManager: WebRtcManager | null;
  timerInterval: any;

  // Actions
  initiateCall: (receiver: User, callType: CallType) => Promise<void>;
  receiveCall: (callId: string, caller: User, callType: CallType) => void;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  setRemoteMuted: (isMuted: boolean) => void;
  setRemoteCameraOff: (isOff: boolean) => void;
  handleCallBusy: () => void;
  cleanupCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCallId: null,
  callType: 'video',
  callStatus: 'idle',
  caller: null,
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  isRemoteMuted: false,
  isRemoteCameraOff: false,
  facingMode: 'user',
  duration: 0,
  connectionQuality: 'good',
  webrtcManager: null,
  timerInterval: null,

  initiateCall: async (receiver: User, callType: CallType) => {
    const socket = getSocket();
    if (!socket) {
      alert('Socket connection is offline. Please check connection.');
      return;
    }

    set({
      callStatus: 'initiating',
      callType,
      remoteUser: receiver,
      duration: 0,
      isMuted: false,
      isCameraOff: false,
      isRemoteMuted: false,
      isRemoteCameraOff: false,
    });

    soundEffects.startOutgoingCallingTone();

    // Fetch TURN/STUN ICE configuration
    let iceServers: RTCIceServer[] = [];
    try {
      const { data } = await apiClient.get('/calls/config');
      iceServers = data.data.iceServers;
    } catch (e) {
      console.warn('Using default STUN servers', e);
    }

    const rtcManager = new WebRtcManager(
      {
        onRemoteStream: (stream) => {
          console.log('[Store] onRemoteStream received:', stream.id);
          set({ remoteStream: stream, callStatus: 'connected' });
          soundEffects.stopRingtone();
        },
        onIceCandidate: (candidate) => {
          const callId = get().activeCallId;
          if (callId) {
            socket.emit('call:ice-candidate', { callId, candidate });
          }
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            set({ connectionQuality: 'good', callStatus: 'connected' });
            soundEffects.stopRingtone();

            // Start duration timer
            if (!get().timerInterval) {
              const timer = setInterval(() => {
                set((prev) => ({ duration: prev.duration + 1 }));
              }, 1000);
              set({ timerInterval: timer });
            }
          } else if (state === 'disconnected') {
            set({ connectionQuality: 'poor' });
          } else if (state === 'failed') {
            set({ connectionQuality: 'disconnected' });
          }
        },
        onError: (err) => {
          console.error('[WebRTC] Manager Error:', err);
        },
      },
      iceServers
    );

    try {
      // 1. Get user media
      const localStream = await rtcManager.getLocalMedia(callType);
      set({ localStream, webrtcManager: rtcManager });

      // 2. Emit initiate event to server
      socket.emit('call:initiate', { receiverId: receiver.id || (receiver as any)._id, callType });
    } catch (err: any) {
      soundEffects.stopRingtone();
      set({ callStatus: 'idle' });
      alert('Camera or Microphone access was denied or not available.');
    }
  },

  receiveCall: (callId: string, caller: User, callType: CallType) => {
    soundEffects.startIncomingRingtone();
    set({
      activeCallId: callId,
      callStatus: 'incoming',
      caller,
      remoteUser: caller,
      callType,
      duration: 0,
      isMuted: false,
      isCameraOff: false,
      isRemoteMuted: false,
      isRemoteCameraOff: false,
    });
  },

  acceptCall: async () => {
    soundEffects.stopRingtone();
    const socket = getSocket();
    const { activeCallId, callType } = get();

    if (!activeCallId || !socket) return;

    set({ callStatus: 'connecting' });

    // Fetch TURN/STUN ICE configuration
    let iceServers: RTCIceServer[] = [];
    try {
      const { data } = await apiClient.get('/calls/config');
      iceServers = data.data.iceServers;
    } catch (e) {
      console.warn('Using default STUN servers', e);
    }

    const rtcManager = new WebRtcManager(
      {
        onRemoteStream: (stream) => {
          console.log('[Store] Receiver onRemoteStream:', stream.id);
          set({ remoteStream: stream, callStatus: 'connected' });
        },
        onIceCandidate: (candidate) => {
          socket.emit('call:ice-candidate', { callId: activeCallId, candidate });
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            set({ connectionQuality: 'good', callStatus: 'connected' });
            if (!get().timerInterval) {
              const timer = setInterval(() => {
                set((prev) => ({ duration: prev.duration + 1 }));
              }, 1000);
              set({ timerInterval: timer });
            }
          }
        },
        onError: (err) => console.error(err),
      },
      iceServers
    );

    try {
      const localStream = await rtcManager.getLocalMedia(callType);
      set({ localStream, webrtcManager: rtcManager });

      rtcManager.initPeerConnection();
      socket.emit('call:accept', { callId: activeCallId });
    } catch (err) {
      soundEffects.stopRingtone();
      socket.emit('call:reject', { callId: activeCallId, reason: 'Media device error' });
      get().cleanupCall();
    }
  },

  rejectCall: (reason = 'Call declined') => {
    soundEffects.stopRingtone();
    soundEffects.playCallEndTone();
    const { activeCallId } = get();
    const socket = getSocket();

    if (activeCallId && socket) {
      socket.emit('call:reject', { callId: activeCallId, reason });
    }

    get().cleanupCall();
  },

  endCall: () => {
    soundEffects.stopRingtone();
    soundEffects.playCallEndTone();
    const { activeCallId } = get();
    const socket = getSocket();

    if (activeCallId && socket) {
      socket.emit('call:ended', { callId: activeCallId });
    }

    get().cleanupCall();
  },

  toggleMute: () => {
    const { webrtcManager, isMuted, activeCallId } = get();
    const socket = getSocket();
    const newMuted = !isMuted;

    if (webrtcManager) {
      webrtcManager.setMicrophoneMuted(newMuted);
    }

    set({ isMuted: newMuted });

    if (activeCallId && socket) {
      socket.emit('call:mute', { callId: activeCallId, isMuted: newMuted });
    }
  },

  toggleCamera: () => {
    const { webrtcManager, isCameraOff, activeCallId } = get();
    const socket = getSocket();
    const newCameraOff = !isCameraOff;

    if (webrtcManager) {
      webrtcManager.setCameraDisabled(newCameraOff);
    }

    set({ isCameraOff: newCameraOff });

    if (activeCallId && socket) {
      socket.emit('call:camera', { callId: activeCallId, isCameraOff: newCameraOff });
    }
  },

  switchCamera: async () => {
    const { webrtcManager } = get();
    if (webrtcManager) {
      const newMode = await webrtcManager.switchCamera();
      set({ facingMode: newMode });
    }
  },

  setRemoteMuted: (isRemoteMuted: boolean) => set({ isRemoteMuted }),
  setRemoteCameraOff: (isRemoteCameraOff: boolean) => set({ isRemoteCameraOff }),

  handleCallBusy: () => {
    soundEffects.stopRingtone();
    soundEffects.playCallEndTone();
    set({ callStatus: 'busy' });
    setTimeout(() => {
      get().cleanupCall();
    }, 2500);
  },

  cleanupCall: () => {
    soundEffects.stopRingtone();
    const { webrtcManager, timerInterval, localStream, remoteStream } = get();

    if (timerInterval) clearInterval(timerInterval);
    if (webrtcManager) webrtcManager.close();

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => t.stop());
    }

    set({
      activeCallId: null,
      callStatus: 'idle',
      caller: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      isRemoteMuted: false,
      isRemoteCameraOff: false,
      webrtcManager: null,
      timerInterval: null,
      duration: 0,
    });
  },
}));
