import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  shimmerColor?: string;
  background?: string;
  className?: string;
}

export function ShimmerButton({
  children,
  shimmerColor = "rgba(255,255,255,0.1)",
  background = "linear-gradient(to right, #4f46e5, #7c3aed, #ec4899)",
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all hover:scale-105 hover:shadow-xl",
        className
      )}
      style={{
        background,
      }}
      {...props}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          backgroundSize: "200% 100%",
        }}
      />
      
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
