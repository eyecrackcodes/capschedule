import { AgentRecord, DaySchedule } from '@/types';

export interface AgentInsight {
  agentName: string;
  strengths: string[];
  areasForImprovement: string[];
  personalizedTips: string[];
  priorityFocus: string;
}

export interface ScheduleOptimization {
  suggestion: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Generate personalized insights for an agent based on their performance metrics
 */
export async function generateAgentInsights(agent: AgentRecord): Promise<AgentInsight | null> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'agent-insights',
        data: { agent },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate insights');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating agent insights:', error);
    return null;
  }
}

/**
 * Generate schedule optimization suggestions using AI
 */
export async function generateScheduleOptimizations(
  schedule: DaySchedule[],
  stats: any
): Promise<ScheduleOptimization[]> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'schedule-optimization',
        data: { schedule, stats },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate optimizations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating schedule optimizations:', error);
    return [];
  }
}

