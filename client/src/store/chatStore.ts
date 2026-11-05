import { create } from 'zustand';
import { Message, MessageAttachment } from '../types';
import { apiClient } from '../services/api';
import { getSocket } from '../services/socket';
import { soundEffects } from '../services/soundEffects';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isPartnerTyping: boolean;
  replyingTo: Message | null;
  unreadCount: number;

  fetchMessages: () => Promise<void>;
  sendMessage: (receiverId: string, content: string, attachment?: MessageAttachment) => Promise<void>;
  addMessage: (message: Message, currentUserId: string) => void;
  markAsDelivered: (messageId: string, deliveredAt: string | Date) => void;
  markAsRead: (messageId: string, readAt: string | Date) => void;
  setPartnerTyping: (isTyping: boolean) => void;
  sendTyping: (receiverId: string, isTyping: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  deleteMessage: (messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isPartnerTyping: false,
  replyingTo: null,
  unreadCount: 0,

  fetchMessages: async () => {
    try {
      set({ isLoading: true });
      const { data } = await apiClient.get('/messages');
      set({ messages: data.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      console.error('Failed to load messages', err);
    }
  },

  sendMessage: async (receiverId, content, attachment) => {
    const socket = getSocket();
    const replyingTo = get().replyingTo;

    const payload = {
      receiverId,
      content,
      messageType: attachment ? 'image' : 'text',
      attachment,
      replyTo: replyingTo ? replyingTo._id : undefined,
    };

    if (socket && socket.connected) {
      socket.emit('message:send', payload);
    } else {
      // Fallback to REST API
      const { data } = await apiClient.post('/messages', payload);
      set((state) => ({ messages: [...state.messages, data.data] }));
    }

    set({ replyingTo: null });
  },

  addMessage: (message, currentUserId) => {
    const isFromMe = (typeof message.sender === 'object' ? (message.sender as any)._id : message.sender) === currentUserId;

    if (!isFromMe) {
      soundEffects.playMessageChime();
      set((state) => ({ unreadCount: state.unreadCount + 1 }));

      const socket = getSocket();
      if (socket) {
        socket.emit('message:delivered', { messageId: message._id });
      }
    }

    set((state) => {
      // Check if duplicate
      if (state.messages.some((m) => m._id === message._id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });
  },

  markAsDelivered: (messageId, deliveredAt) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, deliveredAt } : m
      ),
    }));
  },

  markAsRead: (messageId, readAt) => {
    set((state) => ({
      unreadCount: 0,
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, readAt, deliveredAt: readAt } : m
      ),
    }));
  },

  setPartnerTyping: (isTyping) => {
    set({ isPartnerTyping: isTyping });
  },

  sendTyping: (receiverId, isTyping) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message:typing', { receiverId, isTyping });
    }
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  deleteMessage: async (messageId) => {
    try {
      await apiClient.delete(`/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  },
}));
