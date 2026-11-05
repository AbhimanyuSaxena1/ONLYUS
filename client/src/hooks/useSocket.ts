import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useChatStore } from '../store/chatStore';

export const useSocket = () => {
  const { user, partner, setPartnerStatus } = useAuthStore();
  const callStore = useCallStore();
  const chatStore = useChatStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // Presence events
    const handleUserOnline = (data: { userId: string }) => {
      if (partner && (partner.id === data.userId || (partner as any)._id === data.userId)) {
        setPartnerStatus(true);
      }
    };

    const handleUserOffline = (data: { userId: string; lastSeen: string | Date }) => {
      if (partner && (partner.id === data.userId || (partner as any)._id === data.userId)) {
        setPartnerStatus(false, data.lastSeen);
      }
    };

    // Calling events
    const handleCallIncoming = (data: {
      callId: string;
      caller: any;
      callType: 'video' | 'audio';
    }) => {
      callStore.receiveCall(data.callId, data.caller, data.callType);
    };

    const handleCallAccepted = async (data: { callId: string }) => {
      console.log('[useSocket] call:accepted received for call:', data.callId);
      const rtcManager = useCallStore.getState().webrtcManager;
      if (rtcManager) {
        useCallStore.setState({ activeCallId: data.callId, callStatus: 'connecting' });
        try {
          const offer = await rtcManager.createOffer();
          socket.emit('call:offer', { callId: data.callId, sdp: offer });
        } catch (err) {
          console.error('Failed to create offer:', err);
        }
      }
    };

    const handleCallOffer = async (data: { callId: string; sdp: any }) => {
      console.log('[useSocket] call:offer received for call:', data.callId);
      const rtcManager = useCallStore.getState().webrtcManager;
      if (rtcManager) {
        try {
          const answer = await rtcManager.handleOffer(data.sdp);
          socket.emit('call:answer', { callId: data.callId, sdp: answer });
        } catch (err) {
          console.error('Failed to handle offer and create answer:', err);
        }
      }
    };

    const handleCallAnswer = async (data: { callId: string; sdp: any }) => {
      console.log('[useSocket] call:answer received for call:', data.callId);
      const rtcManager = useCallStore.getState().webrtcManager;
      if (rtcManager) {
        try {
          await rtcManager.handleAnswer(data.sdp);
        } catch (err) {
          console.error('Failed to handle answer:', err);
        }
      }
    };

    const handleIceCandidate = async (data: { callId: string; candidate: any }) => {
      const rtcManager = useCallStore.getState().webrtcManager;
      if (rtcManager && data.candidate) {
        await rtcManager.addIceCandidate(data.candidate);
      }
    };

    const handleCallMute = (data: { isMuted: boolean }) => {
      callStore.setRemoteMuted(data.isMuted);
    };

    const handleCallCamera = (data: { isCameraOff: boolean }) => {
      callStore.setRemoteCameraOff(data.isCameraOff);
    };

    const handleCallBusy = () => {
      callStore.handleCallBusy();
    };

    const handleCallRejected = (data: { reason?: string }) => {
      callStore.rejectCall(data.reason);
    };

    const handleCallEnded = () => {
      callStore.cleanupCall();
    };

    // Chat events
    const handleMessageReceived = (message: any) => {
      chatStore.addMessage(message, user.id || (user as any)._id);
    };

    const handleMessageDelivered = (data: { messageId: string; deliveredAt: string | Date }) => {
      chatStore.markAsDelivered(data.messageId, data.deliveredAt);
    };

    const handleMessageRead = (data: { messageId: string; readAt: string | Date }) => {
      chatStore.markAsRead(data.messageId, data.readAt);
    };

    const handleMessageTyping = (data: { userId: string; isTyping: boolean }) => {
      if (partner && (partner.id === data.userId || (partner as any)._id === data.userId)) {
        chatStore.setPartnerTyping(data.isTyping);
      }
    };

    // Register listeners
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    socket.on('call:incoming', handleCallIncoming);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:mute', handleCallMute);
    socket.on('call:camera', handleCallCamera);
    socket.on('call:busy', handleCallBusy);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);

    socket.on('message:received', handleMessageReceived);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('message:typing', handleMessageTyping);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('call:incoming', handleCallIncoming);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:mute', handleCallMute);
      socket.off('call:camera', handleCallCamera);
      socket.off('call:busy', handleCallBusy);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('message:received', handleMessageReceived);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('message:typing', handleMessageTyping);
    };
  }, [user, partner]);
};
