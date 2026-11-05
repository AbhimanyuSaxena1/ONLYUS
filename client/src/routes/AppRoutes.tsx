import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { AppLayout } from '../layouts/AppLayout';
import { HomePage } from '../pages/HomePage';
import { ChatWindow } from '../features/chat/ChatWindow';
import { CallsHistoryPage } from '../pages/CallsHistoryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AuthPage } from '../pages/AuthPage';
import { apiClient } from '../services/api';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { receiveCall, acceptCall } = useCallStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle incoming or accepted call from Web Push click parameters
  useEffect(() => {
    const incomingCallId = searchParams.get('incomingCall');
    const acceptCallId = searchParams.get('acceptCall');
    const type = (searchParams.get('type') || 'video') as 'video' | 'audio';

    if (incomingCallId) {
      apiClient
        .get(`/calls/invitation/${incomingCallId}`)
        .then((res) => {
          const inv = res.data.data;
          receiveCall(inv._id, inv.caller, inv.callType);
        })
        .catch((e) => console.warn(e));
    } else if (acceptCallId) {
      apiClient
        .get(`/calls/invitation/${acceptCallId}`)
        .then((res) => {
          const inv = res.data.data;
          receiveCall(inv._id, inv.caller, inv.callType);
          setTimeout(() => {
            acceptCall();
          }, 300);
        })
        .catch((e) => console.warn(e));
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" replace />}
      />

      <Route
        path="/"
        element={isAuthenticated ? <AppLayout /> : <Navigate to="/auth" replace />}
      >
        <Route index element={<HomePage />} />
        <Route path="chat" element={<ChatWindow />} />
        <Route path="calls" element={<CallsHistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
