"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DaySchedule } from '@/types';
import { generateScheduleOptimizations, ScheduleOptimization } from '@/lib/ai-service';
import { cn } from '@/lib/utils';

interface ScheduleOptimizerProps {
  schedule: DaySchedule[];
  stats: any;
  className?: string;
}

const impactColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const impactIcons = {
  high: Zap,
  medium: AlertCircle,
  low: CheckCircle2,
};

export function ScheduleOptimizer({ schedule, stats, className }: ScheduleOptimizerProps) {
  const [optimizations, setOptimizations] = useState<ScheduleOptimization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateScheduleOptimizations(schedule, stats);
      setOptimizations(result);
      if (result.length === 0) {
        setError('No optimization suggestions available. Check your OpenAI API key.');
      }
    } catch (err) {
      setError('Failed to generate optimizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Schedule Optimizer
            </CardTitle>
            <CardDescription>
              Get intelligent suggestions to improve your training schedule
            </CardDescription>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Optimize Schedule
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
        
        {optimizations.length > 0 && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4">
            {optimizations.map((opt, i) => {
              const Icon = impactIcons[opt.impact];
              return (
                <div
                  key={i}
                  className="rounded-lg border p-4 transition-all hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      Optimization {i + 1}
                    </h4>
                    <Badge className={cn("text-xs", impactColors[opt.impact])}>
                      {opt.impact} impact
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm">{opt.suggestion}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Reason:</span> {opt.reason}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        
        {!optimizations.length && !error && !loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Click "Optimize Schedule" to get AI-powered scheduling recommendations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
