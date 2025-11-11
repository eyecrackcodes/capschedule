import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

const variants = {
  primary: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-500/25",
  secondary: "bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 shadow-gray-500/25",
  success: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25",
  danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/25",
};

const positions = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
};

export function FloatingActionButton({
  icon: Icon,
  onClick,
  label,
  variant = 'primary',
  position = 'bottom-right',
  className,
}: FloatingActionButtonProps) {
  return (
    <div className={cn('fixed z-50', positions[position])}>
      <button
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-full p-4 text-white shadow-lg transition-all hover:scale-110 hover:shadow-2xl animate-float",
          variants[variant],
          className
        )}
      >
        <Icon className="h-6 w-6" />
        {label && (
          <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all group-hover:max-w-xs">
            {label}
          </span>
        )}
      </button>
      
      {/* Pulse effect */}
      <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-white/20" />
    </div>
  );
}
