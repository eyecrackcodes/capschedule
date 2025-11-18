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
  console.log('🤖 AI Dashboard - Agents received:', agents.length);
  console.log('🤖 AI Dashboard - Schedule days:', schedule.length);
  
  // Get all agents from the schedule if no agents provided
  let allAgents = agents;
  if (agents.length === 0 && schedule.length > 0) {
    console.log('🤖 AI Dashboard - No agents provided, extracting from schedule');
    const agentMap = new Map<string, any>();
    schedule.forEach(day => {
      day.sessions.forEach(session => {
        session.agents.forEach(agent => {
          agentMap.set(agent.name, agent);
        });
      });
    });
    allAgents = Array.from(agentMap.values());
    console.log('🤖 AI Dashboard - Extracted agents from schedule:', allAgents.length);
  }
  
  // Get top and bottom performers for insights
  const sortedAgents = [...allAgents]
    .filter(a => a.capScore > 0)
    .sort((a, b) => b.adjustedCAPScore - a.adjustedCAPScore);
  
  console.log('🤖 AI Dashboard - Sorted agents:', sortedAgents.length);
  
  const topPerformers = sortedAgents.slice(0, 3);
  const needsSupport = sortedAgents.length > 3 
    ? sortedAgents.slice(-3).reverse() 
    : sortedAgents;

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
          
          {topPerformers.length > 0 ? (
            topPerformers.map((agent, i) => (
              <AnimatedCard key={agent.name} delay={i * 100}>
                <AgentInsights agent={agent} />
              </AnimatedCard>
            ))
          ) : (
            <AnimatedCard className="p-8 text-center">
              <p className="text-muted-foreground">
                No agents available for analysis. Please ensure you have loaded agent data with CAP scores greater than 0.
              </p>
            </AnimatedCard>
          )}
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
          
          {needsSupport.length > 0 ? (
            needsSupport.map((agent, i) => (
              <AnimatedCard key={agent.name} delay={i * 100}>
                <AgentInsights agent={agent} />
              </AnimatedCard>
            ))
          ) : (
            <AnimatedCard className="p-8 text-center">
              <p className="text-muted-foreground">
                No agents available for analysis. Please ensure you have loaded agent data with CAP scores greater than 0.
              </p>
            </AnimatedCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
