import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  PhoneIcon as PhoneIconSolid,
  Cog6ToothIcon as CogIconSolid,
} from '@heroicons/react/24/solid';
import { useChatStore } from '../store/chatStore';

export const BottomNav: React.FC = () => {
  const { unreadCount } = useChatStore();

  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
    },
    {
      to: '/chat',
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      activeIcon: ChatIconSolid,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      to: '/calls',
      label: 'Calls',
      icon: PhoneIcon,
      activeIcon: PhoneIconSolid,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Cog6ToothIcon,
      activeIcon: CogIconSolid,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#080808]/95 backdrop-blur-md border-t border-[#292929] safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-white' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`
            }
          >
            {({ isActive }) => {
              const Icon = isActive ? item.activeIcon : item.icon;
              return (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 bg-white text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium tracking-tight">
                    {item.label}
                  </span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
