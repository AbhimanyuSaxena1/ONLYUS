import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isInCall?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const dotSizes = {
  sm: 'w-2 h-2 ring-1',
  md: 'w-3 h-3 ring-2',
  lg: 'w-4 h-4 ring-2',
  xl: 'w-5 h-5 ring-4',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  isInCall,
  className = '',
}) => {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-[#181818] border border-[#292929] flex items-center justify-center font-semibold text-white overflow-hidden shadow-sm`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Online/In-Call Indicator */}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-[#080808] ${
            dotSizes[size]
          } ${
            isInCall
              ? 'bg-[#F59E0B] animate-pulse'
              : isOnline
              ? 'bg-[#22C55E]'
              : 'bg-[#71717A]'
          }`}
          title={isInCall ? 'In a call' : isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
