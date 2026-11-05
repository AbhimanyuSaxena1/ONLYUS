import React, { useEffect, useRef } from 'react';
import {
  MicrophoneIcon,
  PhoneXMarkIcon,
  SignalIcon,
} from '@heroicons/react/24/solid';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../../components/Avatar';

export const AudioCallScreen: React.FC = () => {
  const {
    callStatus,
    remoteUser,
    remoteStream,
    isMuted,
    isRemoteMuted,
    duration,
    connectionQuality,
    toggleMute,
    endCall,
  } = useCallStore();

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteStream) {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  const formatDuration = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#080808] flex flex-col justify-between p-6 select-none safe-top safe-bottom">
      {/* Hidden audio & video elements for WebRTC audio playback across iOS Safari and Android Chrome */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <video ref={remoteVideoRef} autoPlay playsInline className="fixed -top-full -left-full w-1 h-1 opacity-0 pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] border border-[#292929]">
          <SignalIcon
            className={`w-4 h-4 ${
              connectionQuality === 'good'
                ? 'text-[#22C55E]'
                : connectionQuality === 'poor'
                ? 'text-[#F59E0B]'
                : 'text-[#EF4444]'
            }`}
          />
          <span className="text-xs text-[#A1A1AA] uppercase tracking-wider">
            {connectionQuality}
          </span>
        </div>

        <span className="text-sm font-medium text-white">
          {callStatus === 'connected' ? formatDuration(duration) : 'Audio Call'}
        </span>
      </div>

      {/* Center Section: Partner Avatar & Audio Ripple Waves */}
      <div className="flex flex-col items-center justify-center my-auto text-center">
        <div className="relative inline-block mb-6">
          {/* Subtle concentric ripple waves */}
          <div className="absolute inset-0 -m-3 rounded-full border border-white/10 animate-ping duration-1000" />
          <div className="absolute inset-0 -m-8 rounded-full border border-white/5 animate-pulse" />
          <Avatar
            src={remoteUser?.profilePicture}
            name={remoteUser?.name || 'Partner'}
            size="xl"
            className="relative scale-125"
          />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {remoteUser?.name || 'Partner'}
        </h2>

        <p className="text-sm text-[#A1A1AA]">
          {callStatus === 'initiating' && 'Calling...'}
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'connecting' && 'Connecting audio...'}
          {callStatus === 'connected' && formatDuration(duration)}
        </p>

        {isRemoteMuted && callStatus === 'connected' && (
          <div className="mt-4 px-3 py-1 rounded-full bg-[#181818] border border-[#292929] text-xs text-[#EF4444] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            {remoteUser?.name || 'Partner'} is muted
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-8 mb-4">
        {/* Toggle Mute */}
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center p-3.5 transition-all ${
            isMuted
              ? 'bg-[#EF4444] text-white shadow-lg'
              : 'bg-[#181818] border border-[#292929] text-white hover:bg-[#202020]'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <MicrophoneIcon className="w-6 h-6" />
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-[#EF4444] text-white flex items-center justify-center hover:bg-red-600 shadow-xl active:scale-95 transition-transform"
          title="End Call"
        >
          <PhoneXMarkIcon className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
