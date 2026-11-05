import { create } from 'zustand';
import { User } from '../types';
import { apiClient } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthState {
  user: User | null;
  partner: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; profilePicture?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; profilePicture?: string }) => Promise<void>;
  setPartnerStatus: (isOnline: boolean, lastSeen?: string | Date) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  partner: null,
  token: localStorage.getItem('onlyus_token'),
  isAuthenticated: !!localStorage.getItem('onlyus_token'),
  isLoading: true,
  error: null,

  checkAuth: async () => {
    const token = localStorage.getItem('onlyus_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null, partner: null });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const { data } = await apiClient.get('/auth/me');
      set({
        user: data.data.user,
        partner: data.data.partner,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect WebSocket
      connectSocket(token);
    } catch (err: any) {
      console.warn('Authentication check failed:', err.message);
      localStorage.removeItem('onlyus_token');
      disconnectSocket();
      set({
        token: null,
        user: null,
        partner: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/login', credentials);
      const token = data.data.accessToken;
      localStorage.setItem('onlyus_token', token);

      set({
        token,
        user: data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch partner info
      await get().checkAuth();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Login failed. Please check your credentials.',
      });
      throw err;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/register', registerData);
      const token = data.data.accessToken;
      localStorage.setItem('onlyus_token', token);

      set({
        token,
        user: data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch partner info
      await get().checkAuth();
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Registration failed.',
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('onlyus_token');
      disconnectSocket();
      set({
        user: null,
        partner: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await apiClient.patch('/auth/profile', data);
      set({ user: res.data.data });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update profile' });
      throw err;
    }
  },

  setPartnerStatus: (isOnline: boolean, lastSeen?: string | Date) => {
    const currentPartner = get().partner;
    if (currentPartner) {
      set({
        partner: {
          ...currentPartner,
          isOnline,
          lastSeen: lastSeen || (isOnline ? currentPartner.lastSeen : new Date()),
        },
      });
    }
  },
}));
