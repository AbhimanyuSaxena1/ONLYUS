import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { CallModal } from '../features/calling/CallModal';
import { VideoCallScreen } from '../features/calling/VideoCallScreen';
import { AudioCallScreen } from '../features/calling/AudioCallScreen';
import { useSocket } from '../hooks/useSocket';
import { useCallStore } from '../store/callStore';

export const AppLayout: React.FC = () => {
  // Connect and maintain Socket.IO real-time event listeners
  useSocket();

  const { callStatus, callType } = useCallStore();

  const isInActiveCall =
    callStatus === 'initiating' ||
    callStatus === 'ringing' ||
    callStatus === 'connecting' ||
    callStatus === 'connected';

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Top Header */}
      <Header />

      {/* Main Page View */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Incoming Call Popup Dialog */}
      <CallModal />

      {/* Full-Screen WebRTC Calling Screens */}
      {isInActiveCall && callType === 'video' && <VideoCallScreen />}
      {isInActiveCall && callType === 'audio' && <AudioCallScreen />}
    </div>
  );
};
