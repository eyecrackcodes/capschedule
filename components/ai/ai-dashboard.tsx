"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedCard } from '@/components/ui/animated-card';
import { ScheduleOptimizer } from './schedule-optimizer';
import { AgentInsights } from './agent-insights';
import { Sparkles, Brain, Users, Target } from 'lucide-react';
import { DaySchedule, AgentRecord, Stats } from '@/types';

interface AIDashboardProps {
  schedule: DaySchedule[];
  agents: AgentRecord[];
  stats: Stats;
}

export function AIDashboard({ schedule, agents, stats }: AIDashboardProps) {
  // Get top and bottom performers for insights
  const sortedAgents = [...agents]
    .filter(a => a.capScore > 0)
    .sort((a, b) => b.adjustedCAPScore - a.adjustedCAPScore);
  
  const topPerformers = sortedAgents.slice(0, 3);
  const needsSupport = sortedAgents.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedCard className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-blue-900/10 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 p-3 shadow-md">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Training Intelligence</h2>
            <p className="text-sm text-muted-foreground">
              Powered insights and recommendations to optimize your training program
            </p>
          </div>
        </div>
      </AnimatedCard>

      <Tabs defaultValue="optimizer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="optimizer" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Schedule Optimizer
          </TabsTrigger>
          <TabsTrigger value="top-performers" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Top Performers
          </TabsTrigger>
          <TabsTrigger value="needs-support" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Needs Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimizer" className="mt-6">
          <ScheduleOptimizer
            schedule={schedule}
            stats={stats}
          />
        </TabsContent>

        <TabsContent value="top-performers" className="mt-6 space-y-4">
          <AnimatedCard className="p-4">
            <h3 className="mb-2 text-lg font-semibold text-green-700 dark:text-green-400">
              🏆 Top Performers - Learn from the Best
            </h3>
            <p className="text-sm text-muted-foreground">
              Analyze what makes these agents successful
            </p>
          </AnimatedCard>
          
          {topPerformers.map((agent, i) => (
            <AnimatedCard key={agent.name} delay={i * 100}>
              <AgentInsights agent={agent} />
            </AnimatedCard>
          ))}
        </TabsContent>

        <TabsContent value="needs-support" className="mt-6 space-y-4">
          <AnimatedCard className="p-4">
            <h3 className="mb-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
              🎯 Agents Needing Support
            </h3>
            <p className="text-sm text-muted-foreground">
              Personalized coaching recommendations for improvement
            </p>
          </AnimatedCard>
          
          {needsSupport.map((agent, i) => (
            <AnimatedCard key={agent.name} delay={i * 100}>
              <AgentInsights agent={agent} />
            </AnimatedCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
