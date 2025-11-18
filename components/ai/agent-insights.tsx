"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { AgentRecord } from '@/types';
import { generateAgentInsights, AgentInsight } from '@/lib/ai-service';
import { cn } from '@/lib/utils';

interface AgentInsightsProps {
  agent: AgentRecord;
  className?: string;
}

export function AgentInsights({ agent, className }: AgentInsightsProps) {
  const [insights, setInsights] = useState<AgentInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = async () => {
    console.log('🎯 Generate Insights clicked for:', agent.name);
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateAgentInsights(agent);
      console.log('🎯 Insights result:', result);
      if (result) {
        setInsights(result);
      } else {
        setError('Unable to generate insights. Please check your OpenAI API key.');
      }
    } catch (err) {
      setError('Failed to generate insights');
      console.error('🎯 Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="relative bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {agent.name}
            </CardTitle>
            <CardDescription>
              <div className="mt-1 flex items-center gap-4">
                <span>Adj CAP: {agent.adjustedCAPScore}</span>
                <span>Close Rate: {agent.closeRate}%</span>
                <span>AP: ${agent.annualPremium}</span>
                <span>Place Rate: {agent.placeRate}%</span>
              </div>
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateInsights}
            disabled={loading}
            size="sm"
            className="relative z-10 cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ pointerEvents: loading ? 'none' : 'auto' }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        
        {insights && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4">
            {/* Strengths */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                Key Strengths
              </h4>
              <div className="space-y-2">
                {insights.strengths.map((strength, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <p className="text-sm text-muted-foreground">{strength}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <Target className="h-4 w-4" />
                Areas for Improvement
              </h4>
              <div className="space-y-2">
                {insights.areasForImprovement.map((area, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-sm text-muted-foreground">{area}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalized Tips */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                <Lightbulb className="h-4 w-4" />
                Personalized Action Items
              </h4>
              <div className="space-y-2">
                {insights.personalizedTips.map((tip, i) => (
                  <div key={i} className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                    <span className="font-medium">Tip {i + 1}:</span> {tip}
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Focus */}
            <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4 dark:from-purple-900/20 dark:to-pink-900/20">
              <h4 className="mb-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                Priority Focus Area
              </h4>
              <p className="text-sm text-muted-foreground">{insights.priorityFocus}</p>
            </div>
          </div>
        )}
        
        {!insights && !error && !loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Click "Generate Insights" to get AI-powered coaching recommendations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
