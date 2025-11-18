"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Stats } from "@/types";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Building2, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface StatsDashboardEnhancedProps {
  stats: Stats;
  weekOf?: string;
  percentiles?: {
    performance: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
    standard: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
  };
}

export function StatsDashboardEnhanced({
  stats,
  weekOf,
  percentiles,
}: StatsDashboardEnhancedProps) {
  const getTrainingPercentage = () => {
    if (stats.eligibleCount === 0) return 0;
    return Math.round((stats.needsTraining / stats.eligibleCount) * 100);
  };

  const getVariant = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      {/* Week Context Banner */}
      {weekOf && (
        <AnimatedCard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Training Schedule for Week of{" "}
              {new Date(weekOf).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </AnimatedCard>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Agents"
          value={stats.totalAgents}
          subtitle={`${stats.excludedCount} excluded by tenure`}
          icon={Users}
          variant="primary"
        />
        
        <StatsCard
          title="Eligible for Training"
          value={stats.eligibleCount}
          subtitle={`${getTrainingPercentage()}% need training`}
          icon={Target}
          variant={getVariant(100 - getTrainingPercentage(), { good: 80, warning: 60 })}
        />
        
        <StatsCard
          title="Avg Adjusted CAP"
          value={stats.avgAdjustedCAPScore}
          subtitle="Company average"
          icon={TrendingUp}
          variant={getVariant(stats.avgAdjustedCAPScore, { good: 70, warning: 50 })}
        />
        
        <StatsCard
          title="Agents in Training"
          value={stats.needsTraining}
          subtitle={`${getTrainingPercentage()}% of eligible`}
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Location Breakdown */}
      <AnimatedCard delay={100} className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Location Performance Breakdown
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Charlotte */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-600">Charlotte (CLT)</h4>
              <Badge variant="outline" className="text-xs">
                {stats.clt.total} agents
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                <span className="text-sm">Performance Tier</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.clt.performance}</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/10">
                <span className="text-sm">Standard Tier</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.clt.standard}</span>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Austin */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-green-600">Austin (ATX)</h4>
              <Badge variant="outline" className="text-xs">
                {stats.atx.total} agents
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10">
                <span className="text-sm">Performance Tier</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.atx.performance}</span>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/10">
                <span className="text-sm">Standard Tier</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.atx.standard}</span>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* 25th Percentile Training Thresholds */}
      {percentiles && (
        <AnimatedCard 
          delay={200} 
          className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 p-6"
        >
          <h3 className="mb-4 text-lg font-semibold text-purple-900 dark:text-purple-100">
            25th Percentile Training Thresholds (Bottom Quartile)
          </h3>
          <p className="mb-4 text-sm text-purple-700 dark:text-purple-300">
            Agents below these thresholds qualify for metric-specific training
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Tier */}
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 p-4">
              <h4 className="mb-3 font-semibold text-purple-800 dark:text-purple-200">
                Performance Tier
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Close Rate Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    {percentiles.performance.closeRate50th.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Annual Premium Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    ${percentiles.performance.annualPremium50th.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    Place Rate Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    {percentiles.performance.placeRate50th.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Standard Tier */}
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 p-4">
              <h4 className="mb-3 font-semibold text-purple-800 dark:text-purple-200">
                Standard Tier
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-green-500" />
                    Close Rate Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    {percentiles.standard.closeRate50th.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-blue-500" />
                    Annual Premium Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    ${percentiles.standard.annualPremium50th.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-purple-500" />
                    Place Rate Threshold
                  </span>
                  <span className="font-mono font-semibold">
                    {percentiles.standard.placeRate50th.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            <Badge variant="outline" className="py-1">
              <span className="mr-1">📚</span> Tue: Close Rate
            </Badge>
            <Badge variant="outline" className="py-1">
              <span className="mr-1">💰</span> Wed: Annual Premium
            </Badge>
            <Badge variant="outline" className="py-1">
              <span className="mr-1">🎯</span> Thu: Place Rate
            </Badge>
            <Badge variant="outline" className="py-1">
              <span className="mr-1">🔧</span> Fri: Remediation
            </Badge>
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}
