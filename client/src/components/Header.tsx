import React from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon } from '@heroicons/react/24/solid';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';

export const Header: React.FC = () => {
  const { partner } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-[#080808]/90 backdrop-blur-md border-b border-[#292929] px-4 py-3 safe-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#292929] flex items-center justify-center text-white group-hover:border-white transition-colors">
            <HeartIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1">
              OnlyUs
            </h1>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {partner && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111111] border border-[#292929]">
              <span
                className={`w-2 h-2 rounded-full ${
                  partner.isOnline ? 'bg-[#22C55E]' : 'bg-[#71717A]'
                }`}
              />
              <span className="text-xs text-[#A1A1AA] truncate max-w-[90px]">
                {partner.name}
              </span>
            </div>
          )}

          <Link
            to="/settings"
            className="w-9 h-9 rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:border-[#404040] transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
