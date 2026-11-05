import React from 'react';
import { VideoCameraIcon, PhoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../../components/Avatar';

export const CallModal: React.FC = () => {
  const { callStatus, caller, callType, acceptCall, rejectCall } = useCallStore();

  if (callStatus !== 'incoming' || !caller) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#111111] border border-[#292929] rounded-3xl p-6 text-center shadow-2xl">
        <div className="relative inline-block my-4">
          {/* Subtle ripple wave */}
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping duration-1000" />
          <Avatar
            src={caller.profilePicture}
            name={caller.name}
            size="xl"
            className="relative"
          />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">{caller.name}</h3>
        <p className="text-sm text-[#A1A1AA] flex items-center justify-center gap-1.5 mb-8">
          {callType === 'video' ? (
            <>
              <VideoCameraIcon className="w-4 h-4 text-white" />
              Incoming Video Call...
            </>
          ) : (
            <>
              <PhoneIcon className="w-4 h-4 text-white" />
              Incoming Audio Call...
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => rejectCall('Call declined by receiver')}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-[#EF4444] flex items-center justify-center text-white shadow-lg group-hover:scale-105 active:scale-95 transition-transform">
              <PhoneXMarkIcon className="w-7 h-7" />
            </div>
            <span className="text-xs text-[#A1A1AA]">Decline</span>
          </button>

          <button
            onClick={() => acceptCall()}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center text-white shadow-lg group-hover:scale-105 active:scale-95 transition-transform animate-bounce">
              <PhoneIcon className="w-7 h-7" />
            </div>
            <span className="text-xs text-[#A1A1AA]">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
