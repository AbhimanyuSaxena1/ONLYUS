import React, { useEffect, useRef, useState } from 'react';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  PhoneXMarkIcon,
  ArrowsRightLeftIcon,
  SignalIcon,
} from '@heroicons/react/24/solid';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../../components/Avatar';

export const VideoCallScreen: React.FC = () => {
  const {
    callStatus,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isRemoteMuted,
    isRemoteCameraOff,
    duration,
    connectionQuality,
    toggleMute,
    toggleCamera,
    switchCamera,
    endCall,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [pipPosition, setPipPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isCameraOff]);

  // Attach remote stream to remote video and audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => console.log('Remote video autoplay:', e));
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((e) => console.log('Remote audio autoplay:', e));
      }
    }
  }, [remoteStream, isRemoteCameraOff]);

  const formatDuration = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const cyclePipPosition = () => {
    const positions: Array<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'> = [
      'top-right',
      'bottom-right',
      'bottom-left',
      'top-left',
    ];
    const currentIndex = positions.indexOf(pipPosition);
    setPipPosition(positions[(currentIndex + 1) % positions.length]);
  };

  const getPipClass = () => {
    switch (pipPosition) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-28 right-4';
      case 'bottom-left':
        return 'bottom-28 left-4';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#080808] flex flex-col justify-between overflow-hidden select-none">
      {/* Dedicated audio element ensures unblocked remote audio playback on all mobile browsers */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* 1. Remote Video Background (always mounted to preserve ref and hardware decoder) */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${(!remoteStream || isRemoteCameraOff) ? 'hidden' : 'block'}`}
        />

        {(!remoteStream || isRemoteCameraOff) && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Avatar
              src={remoteUser?.profilePicture}
              name={remoteUser?.name || 'Partner'}
              size="xl"
            />
            <div>
              <h2 className="text-xl font-bold text-white">{remoteUser?.name || 'Partner'}</h2>
              <p className="text-sm text-[#A1A1AA] mt-1">
                {callStatus === 'initiating' && 'Calling...'}
                {callStatus === 'ringing' && 'Ringing...'}
                {callStatus === 'connecting' && 'Connecting video...'}
                {callStatus === 'connected' && isRemoteCameraOff && 'Partner camera is off'}
              </p>
            </div>
          </div>
        )}

        {/* Remote Mute Indicator overlay */}
        {isRemoteMuted && callStatus === 'connected' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 border border-[#292929] backdrop-blur-md flex items-center gap-1.5 text-xs text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            {remoteUser?.name || 'Partner'} is muted
          </div>
        )}

        {/* Floating Local Video Preview (Draggable / Tappable PIP) */}
        {localStream && (
          <div
            onClick={cyclePipPosition}
            className={`absolute z-10 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-[#292929] bg-[#111111] cursor-pointer transition-all duration-200 ${getPipClass()}`}
          >
            {!isCameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#181818] text-[#71717A] p-2 text-center">
                <VideoCameraSlashIcon className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Camera Off</span>
              </div>
            )}
            {isMuted && (
              <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1 text-[#EF4444]">
                <MicrophoneIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Top Header Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <Avatar
            src={remoteUser?.profilePicture}
            name={remoteUser?.name || 'Partner'}
            size="sm"
          />
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">
              {remoteUser?.name || 'Partner'}
            </h3>
            <span className="text-xs text-[#A1A1AA]">
              {callStatus === 'connected' ? formatDuration(duration) : callStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 border border-[#292929] backdrop-blur-md">
          <SignalIcon
            className={`w-4 h-4 ${
              connectionQuality === 'good'
                ? 'text-[#22C55E]'
                : connectionQuality === 'poor'
                ? 'text-[#F59E0B]'
                : 'text-[#EF4444]'
            }`}
          />
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-wider">
            {connectionQuality}
          </span>
        </div>
      </div>

      {/* 3. Bottom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-center gap-4 safe-bottom">
        {/* Toggle Microphone */}
        <button
          onClick={toggleMute}
          className={`w-13 h-13 rounded-full flex items-center justify-center p-3.5 transition-all ${
            isMuted
              ? 'bg-[#EF4444] text-white shadow-lg'
              : 'bg-[#181818] border border-[#292929] text-white hover:bg-[#202020]'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          <MicrophoneIcon className="w-6 h-6" />
        </button>

        {/* Toggle Camera */}
        <button
          onClick={toggleCamera}
          className={`w-13 h-13 rounded-full flex items-center justify-center p-3.5 transition-all ${
            isCameraOff
              ? 'bg-[#EF4444] text-white shadow-lg'
              : 'bg-[#181818] border border-[#292929] text-white hover:bg-[#202020]'
          }`}
          title={isCameraOff ? 'Enable Camera' : 'Disable Camera'}
        >
          {isCameraOff ? (
            <VideoCameraSlashIcon className="w-6 h-6" />
          ) : (
            <VideoCameraIcon className="w-6 h-6" />
          )}
        </button>

        {/* Switch Front/Rear Camera */}
        <button
          onClick={switchCamera}
          className="w-13 h-13 rounded-full flex items-center justify-center p-3.5 bg-[#181818] border border-[#292929] text-white hover:bg-[#202020] active:scale-95 transition-all"
          title="Switch Camera"
        >
          <ArrowsRightLeftIcon className="w-6 h-6" />
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="w-15 h-15 rounded-full bg-[#EF4444] text-white flex items-center justify-center p-4 hover:bg-red-600 shadow-xl active:scale-90 transition-transform"
          title="End Call"
        >
          <PhoneXMarkIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
