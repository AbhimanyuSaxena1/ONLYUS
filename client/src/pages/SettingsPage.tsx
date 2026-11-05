import React, { useState, useEffect, useRef } from 'react';
import {
  UserCircleIcon,
  BellIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../store/authStore';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { getSocket } from '../services/socket';
import { apiClient } from '../services/api';
import { registerPushSubscription, isPushSupported } from '../services/push';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateProfile } = useAuthStore();
  const { cameras, microphones, cameraPermission, micPermission, testMediaStream } =
    useMediaDevices();

  const [name, setName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Diagnostics
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [socketStatus, setSocketStatus] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string>('checking');
  const [iceServerCount, setIceServerCount] = useState<number>(0);

  // Camera preview test
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 1. Check Backend
    apiClient
      .get('/health')
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));

    // 2. Check Socket
    const socket = getSocket();
    setSocketStatus(!!(socket && socket.connected));

    // 3. Check WebRTC ICE servers
    apiClient
      .get('/calls/config')
      .then((res) => {
        setIceServerCount(res.data.data.iceServers?.length || 0);
      })
      .catch(() => setIceServerCount(0));

    // 4. Check Push
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }

    return () => {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      await updateProfile({ name, profilePicture });
      setUpdateMessage('Profile updated successfully!');
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err: any) {
      setUpdateMessage(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestCamera = async () => {
    if (isTestingCamera) {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
        testStreamRef.current = null;
      }
      setIsTestingCamera(false);
    } else {
      try {
        const stream = await testMediaStream('camera');
        testStreamRef.current = stream;
        if (testVideoRef.current) {
          testVideoRef.current.srcObject = stream;
        }
        setIsTestingCamera(true);
      } catch (e) {
        alert('Could not access camera for preview test.');
      }
    }
  };

  const handleSendTestPush = async () => {
    try {
      await apiClient.post('/push/test');
      alert('Test push notification sent! Check your notifications bar.');
    } catch (e) {
      alert('Failed to send test push. Make sure push notifications are enabled.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-28">
      {/* 1. Profile Section */}
      <div className="bg-[#111111] border border-[#292929] rounded-3xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-white" />
          Edit Profile
        </h3>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={profilePicture} name={name || 'User'} size="lg" />
            <div className="flex-1">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          </div>

          <Input
            label="Profile Picture URL"
            value={profilePicture}
            onChange={(e) => setProfilePicture(e.target.value)}
            placeholder="https://... (or data URL)"
          />

          {updateMessage && (
            <p className="text-xs text-[#22C55E] font-medium">{updateMessage}</p>
          )}

          <Button type="submit" size="sm" isLoading={isUpdating} className="w-full">
            Save Profile
          </Button>
        </form>
      </div>

      {/* 2. Device & Media Testing */}
      <div className="bg-[#111111] border border-[#292929] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
          <VideoCameraIcon className="w-4 h-4 text-white" />
          Camera & Audio Hardware
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#202020]">
            <span className="text-[#A1A1AA]">Detected Cameras</span>
            <span className="text-white font-medium">{cameras.length} device(s)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#202020]">
            <span className="text-[#A1A1AA]">Detected Microphones</span>
            <span className="text-white font-medium">{microphones.length} device(s)</span>
          </div>
        </div>

        {isTestingCamera && (
          <div className="rounded-2xl overflow-hidden border border-[#292929] bg-black h-48 relative">
            <video
              ref={testVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleTestCamera}
          className="w-full"
        >
          {isTestingCamera ? 'Stop Camera Test' : 'Test Camera Preview'}
        </Button>
      </div>

      {/* 3. Connection Diagnostics */}
      <div className="bg-[#111111] border border-[#292929] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-white" />
          Connection Diagnostics
        </h3>

        <div className="space-y-2 text-xs divide-y divide-[#202020]">
          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">Backend API</span>
            <span
              className={`flex items-center gap-1 font-medium ${
                backendStatus === 'online' ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {backendStatus === 'online' ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <XCircleIcon className="w-4 h-4" />
              )}
              {backendStatus.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">Socket.IO Real-time</span>
            <span
              className={`flex items-center gap-1 font-medium ${
                socketStatus ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {socketStatus ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <XCircleIcon className="w-4 h-4" />
              )}
              {socketStatus ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">WebRTC STUN/TURN Relays</span>
            <span className="text-[#22C55E] font-medium flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              {iceServerCount} Server(s) Configured
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">Camera Permission</span>
            <span className="text-white capitalize">{cameraPermission}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">Microphone Permission</span>
            <span className="text-white capitalize">{micPermission}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#A1A1AA]">Web Push Notifications</span>
            <span className="text-white capitalize">{pushStatus}</span>
          </div>
        </div>

        {isPushSupported() && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={registerPushSubscription}
              className="flex-1 text-xs"
            >
              Subscribe Push
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSendTestPush}
              className="flex-1 text-xs"
            >
              Send Test Push
            </Button>
          </div>
        )}
      </div>

      {/* 4. Logout Button */}
      <Button
        variant="danger"
        onClick={() => logout()}
        className="w-full gap-2 text-sm"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        Log Out of OnlyUs
      </Button>
    </div>
  );
};
