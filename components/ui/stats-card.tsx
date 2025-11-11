import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700",
  primary: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700",
  success: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700",
  warning: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700",
  danger: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700",
};

const iconColors = {
  default: "text-gray-600 dark:text-gray-400",
  primary: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  danger: "text-red-600 dark:text-red-400",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className
}: StatsCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-6",
      "transition-all duration-200 hover:shadow-lg",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                trend.value > 0 ? "text-green-600" : "text-red-600"
              )}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg p-3",
            "bg-white/50 dark:bg-gray-900/50",
            "shadow-sm"
          )}>
            <Icon className={cn("h-6 w-6", iconColors[variant])} />
          </div>
        )}
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 dark:bg-white/5" />
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 dark:bg-white/10" />
    </div>
  );
}
