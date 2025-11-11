import React from 'react';
import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'mesh' | 'radial' | 'aurora';
}

export function GradientBackground({ 
  children, 
  className,
  variant = 'default' 
}: GradientBackgroundProps) {
  const variants = {
    default: "bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
    mesh: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-black",
    radial: "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100 via-white to-cyan-100 dark:from-indigo-900/20 dark:via-gray-900 dark:to-cyan-900/20",
    aurora: "bg-gradient-to-tr from-pink-100 via-purple-50 to-indigo-100 dark:from-pink-900/10 dark:via-purple-900/10 dark:to-indigo-900/10"
  };

  return (
    <div className={cn("relative min-h-screen", variants[variant], className)}>
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-purple-300 opacity-20 blur-3xl animate-blob" />
        <div className="absolute -right-1/4 top-1/3 h-96 w-96 rounded-full bg-blue-300 opacity-20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-pink-300 opacity-20 blur-3xl animate-blob animation-delay-4000" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
