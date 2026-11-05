import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[#71717A] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#111111] text-white border border-[#292929] rounded-xl text-sm placeholder-[#71717A] transition-colors focus:outline-none focus:border-white focus:ring-1 focus:ring-white h-11 ${
              icon ? 'pl-10 pr-3.5' : 'px-3.5'
            } ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-[#EF4444]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
