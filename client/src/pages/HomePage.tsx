import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useChatStore } from '../store/chatStore';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { apiClient } from '../services/api';
import { registerPushSubscription, isPushSupported } from '../services/push';
import { CallRecord } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuthStore();
  const { initiateCall } = useCallStore();
  const { messages, fetchMessages } = useChatStore();

  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('prompt');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    fetchMessages();

    // Fetch recent calls
    apiClient
      .get('/calls/history')
      .then((res) => setRecentCalls(res.data.data.slice(0, 3)))
      .catch((e) => console.warn(e));

    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleStartCall = (type: 'video' | 'audio') => {
    if (!partner) {
      alert('Your partner has not registered yet. Share the app URL to invite them!');
      return;
    }
    initiateCall(partner, type);
  };

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    const success = await registerPushSubscription();
    setIsSubscribing(false);
    if (success && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
  };

  const formatLastSeen = (dateInput?: string | Date): string => {
    if (!dateInput) return 'Recently';
    const date = new Date(dateInput);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Partner Presence Card */}
      <div className="bg-[#111111] border border-[#292929] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {partner ? (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar
                src={partner.profilePicture}
                name={partner.name}
                size="xl"
                isOnline={partner.isOnline}
              />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">{partner.name}</h2>
            
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  partner.isOnline ? 'bg-[#22C55E]' : 'bg-[#71717A]'
                }`}
              />
              <span className="text-xs text-[#A1A1AA]">
                {partner.isOnline ? 'Available now' : `Last seen ${formatLastSeen(partner.lastSeen)}`}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-3 w-full mt-6">
              <button
                onClick={() => handleStartCall('video')}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#181818] border border-[#292929] hover:bg-[#202020] hover:border-[#404040] active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                  <VideoCameraIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-white">Video</span>
              </button>

              <button
                onClick={() => handleStartCall('audio')}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#181818] border border-[#292929] hover:bg-[#202020] hover:border-[#404040] active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#202020] text-white border border-[#292929] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <PhoneIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-white">Audio</span>
              </button>

              <button
                onClick={() => navigate('/chat')}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#181818] border border-[#292929] hover:bg-[#202020] hover:border-[#404040] active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#202020] text-white border border-[#292929] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-white">Chat</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Avatar name="Waiting" size="xl" className="mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-1">Awaiting Partner</h3>
            <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto mb-4">
              Your girlfriend hasn't registered her account yet. OnlyUs allows exactly 2 accounts.
            </p>
            <div className="bg-[#181818] p-3 rounded-xl border border-[#292929] text-xs text-[#A1A1AA]">
              Have her open this link and click "Create Account"
            </div>
          </div>
        )}
      </div>

      {/* 2. Web Push Notification Prompt Banner */}
      {isPushSupported() && pushStatus !== 'granted' && (
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#202020] border border-[#292929] flex items-center justify-center text-white shrink-0">
              <BellIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Background Calls & Alerts</h4>
              <p className="text-[11px] text-[#A1A1AA]">
                Receive incoming call ringtones even when OnlyUs is minimized.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleEnablePush}
            isLoading={isSubscribing}
            className="shrink-0 text-xs px-3"
          >
            Enable
          </Button>
        </div>
      )}

      {/* 3. Recent Message Snippet */}
      {lastMessage && (
        <div
          onClick={() => navigate('/chat')}
          className="bg-[#111111] border border-[#292929] rounded-2xl p-4 hover:border-[#404040] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Recent Message
            </span>
            <span className="text-[10px] text-[#71717A]">
              {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <p className="text-sm text-white truncate">
            {lastMessage.attachment ? '📷 Photo' : lastMessage.content}
          </p>
        </div>
      )}

      {/* 4. Recent Calls */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
            Recent Calls
          </span>
          <button
            onClick={() => navigate('/calls')}
            className="text-xs text-white hover:underline"
          >
            View all
          </button>
        </div>

        {recentCalls.length === 0 ? (
          <p className="text-xs text-[#71717A] py-2 text-center">No call history yet.</p>
        ) : (
          <div className="divide-y divide-[#202020]">
            {recentCalls.map((call) => (
              <div key={call._id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#181818] border border-[#292929] flex items-center justify-center text-white">
                    {call.callType === 'video' ? (
                      <VideoCameraIcon className="w-4 h-4" />
                    ) : (
                      <PhoneIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white capitalize">
                      {call.callType} Call ({call.status})
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {new Date(call.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-[#A1A1AA]">
                  {call.duration > 0 ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Missed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
