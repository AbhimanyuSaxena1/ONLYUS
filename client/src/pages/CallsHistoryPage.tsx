import React, { useEffect, useState } from 'react';
import {
  VideoCameraIcon,
  PhoneIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon,
} from '@heroicons/react/24/solid';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { CallRecord } from '../types';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';

export const CallsHistoryPage: React.FC = () => {
  const { user, partner } = useAuthStore();
  const { initiateCall } = useCallStore();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/calls/history')
      .then((res) => {
        setCalls(res.data.data);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, []);

  const formatDuration = (sec: number): string => {
    if (sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-28">
      {/* Quick Call Bar */}
      {partner && (
        <div className="bg-[#111111] border border-[#292929] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={partner.profilePicture}
              name={partner.name}
              isOnline={partner.isOnline}
            />
            <div>
              <h3 className="text-sm font-bold text-white">{partner.name}</h3>
              <p className="text-xs text-[#A1A1AA]">
                {partner.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => initiateCall(partner, 'video')}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-sm hover:bg-neutral-200 transition-colors"
              title="Video Call"
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => initiateCall(partner, 'audio')}
              className="w-10 h-10 rounded-full bg-[#181818] border border-[#292929] text-white flex items-center justify-center hover:bg-[#202020] transition-colors"
              title="Audio Call"
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Calls History List */}
      <div className="bg-[#111111] border border-[#292929] rounded-3xl p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">
          Call History
        </h2>

        {isLoading ? (
          <p className="text-xs text-[#71717A] text-center py-6">Loading call history...</p>
        ) : calls.length === 0 ? (
          <div className="text-center py-8 text-[#71717A]">
            <PhoneIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-white mb-1">No calls yet</p>
            <p className="text-xs">Your call logs will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#202020]">
            {calls.map((call) => {
              const currentUserId = user?.id || (user as any)?._id;
              const callerId =
                typeof call.caller === 'object' ? (call.caller as any)._id : call.caller;
              const isOutgoing = callerId === currentUserId;
              const isMissed = call.status === 'missed' || (call.status === 'rejected' && !isOutgoing);

              return (
                <div key={call._id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isMissed
                          ? 'bg-[#EF4444]/10 text-[#EF4444]'
                          : 'bg-[#181818] border border-[#292929] text-white'
                      }`}
                    >
                      {call.callType === 'video' ? (
                        <VideoCameraIcon className="w-4 h-4" />
                      ) : (
                        <PhoneIcon className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        {isOutgoing ? (
                          <PhoneArrowUpRightIcon className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        ) : isMissed ? (
                          <PhoneXMarkIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                        ) : (
                          <PhoneArrowDownLeftIcon className="w-3.5 h-3.5 text-[#22C55E]" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isMissed ? 'text-[#EF4444]' : 'text-white'
                          }`}
                        >
                          {call.callType === 'video' ? 'Video' : 'Audio'}{' '}
                          {isMissed ? 'Missed Call' : isOutgoing ? 'Outgoing' : 'Incoming'}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#71717A]">
                        {new Date(call.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#A1A1AA]">
                      {call.duration > 0 ? formatDuration(call.duration) : '--'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
