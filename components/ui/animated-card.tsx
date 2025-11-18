import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  scale?: boolean;
}

export function AnimatedCard({ 
  children, 
  className, 
  delay = 0, 
  scale = true,
  ...props 
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-300 ease-in-out",
        scale && "hover:scale-[1.02] hover:shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-4",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      {...props}
    >
      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity duration-300 hover:opacity-10" />
      {children}
    </div>
  );
}
