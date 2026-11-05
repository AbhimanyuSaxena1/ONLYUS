import React, { useState, useEffect } from 'react';
import { HeartIcon, LockClosedIcon, EnvelopeIcon, UserIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const AuthPage: React.FC = () => {
  const { login, register, error, isLoading } = useAuthStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [totalRegistered, setTotalRegistered] = useState<number>(0);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/auth/status')
      .then((res) => {
        setTotalRegistered(res.data.data.totalRegistered);
        setIsRegistrationOpen(res.data.data.isRegistrationOpen);
        if (!res.data.data.isRegistrationOpen) {
          setIsRegistering(false);
        }
      })
      .catch((e) => console.warn(e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isRegistering) {
      if (!name.trim()) {
        setFormError('Please enter your name');
        return;
      }
      try {
        await register({ name, email, password, profilePicture });
      } catch (err: any) {
        setFormError(err.response?.data?.message || 'Registration failed');
      }
    } else {
      try {
        await login({ email, password });
      } catch (err: any) {
        setFormError(err.response?.data?.message || 'Invalid email or password');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-center items-center px-4 py-12 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
            <HeartIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">OnlyUs</h1>
          <p className="text-xs text-[#A1A1AA]">
            Private video calling & real-time chat for just the two of us.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#111111] border border-[#292929] rounded-3xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-[#181818] p-1 rounded-2xl mb-6 border border-[#292929]">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setFormError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                !isRegistering
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={!isRegistrationOpen}
              onClick={() => {
                setIsRegistering(true);
                setFormError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                isRegistering
                  ? 'bg-white text-black shadow-sm'
                  : !isRegistrationOpen
                  ? 'text-[#71717A] opacity-40 cursor-not-allowed'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Register {isRegistrationOpen ? `(${totalRegistered}/2)` : '(Closed)'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <Input
                  label="Your Name"
                  type="text"
                  placeholder="e.g. Abhi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={<UserIcon className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Profile Picture URL (Optional)"
                  type="url"
                  placeholder="https://..."
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                />
              </>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@onlyus.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EnvelopeIcon className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockClosedIcon className="w-4 h-4" />}
              required
            />

            {(formError || error) && (
              <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                {formError || error}
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              {isRegistering ? 'Create Private Account' : 'Sign In'}
            </Button>
          </form>

          {/* Privacy badge */}
          <div className="mt-6 pt-4 border-t border-[#202020] text-center">
            <p className="text-[11px] text-[#71717A]">
              🔒 Strictly exclusive to 2 registered members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
