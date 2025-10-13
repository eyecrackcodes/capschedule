"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getCompletionRates,
  getManagerStats,
  getAgentTrainingProgress,
} from "@/lib/database";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Award,
  Loader2,
} from "lucide-react";

export function AnalyticsDashboard() {
  const [completionRates, setCompletionRates] = useState<any[]>([]);
  const [managerStats, setManagerStats] = useState<any[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setIsLoading(true);

    const [completionResult, managerResult, progressResult] =
      await Promise.all([
        getCompletionRates(),
        getManagerStats(),
        getAgentTrainingProgress(),
      ]);

    if (completionResult.success && completionResult.data) {
      setCompletionRates(completionResult.data);
    }

    if (managerResult.success && managerResult.data) {
      setManagerStats(managerResult.data);
    }

    if (progressResult.success && progressResult.data) {
      setTrainingProgress(progressResult.data);
    }

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall stats
  const totalCompletionRate =
    completionRates.length > 0
      ? Math.round(
          completionRates.reduce(
            (sum, week) => sum + (parseFloat(week.completion_rate) || 0),
            0
          ) / completionRates.length
        )
      : 0;

  const recentWeeks = completionRates.slice(0, 4);
  const topManagers = managerStats
    .slice()
    .sort((a, b) => parseFloat(b.attendance_rate) - parseFloat(a.attendance_rate))
    .slice(0, 5);

  const agentsWithImprovement = trainingProgress.filter(
    (agent) => agent.cap_improvement > 0
  );

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {totalCompletionRate}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Weeks Tracked</p>
                <p className="text-3xl font-bold">{completionRates.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agents Improved</p>
                <p className="text-3xl font-bold text-purple-600">
                  {agentsWithImprovement.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Managers</p>
                <p className="text-3xl font-bold">
                  {new Set(managerStats.map((m) => m.manager)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Weeks Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completion Rates (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWeeks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No completion data yet. Save schedules and mark attendance to see
              analytics.
            </p>
          ) : (
            <div className="space-y-3">
              {recentWeeks.map((week) => (
                <div
                  key={week.week_of}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Week of {new Date(week.week_of).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>Total: {week.total_assignments}</span>
                      <span className="text-green-600">
                        ✓ Attended: {week.attended_count}
                      </span>
                      <span className="text-red-600">
                        ✗ No-Show: {week.no_show_count}
                      </span>
                      <span className="text-yellow-600">
                        ⏳ Pending: {week.pending_count}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {week.completion_rate}%
                    </p>
                    <p className="text-xs text-gray-500">Completion</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performing Managers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performing Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topManagers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No manager data available yet
              </p>
            ) : (
              <div className="space-y-3">
                {topManagers.map((manager, index) => (
                  <div
                    key={`${manager.manager}-${manager.week_of}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                            ? "bg-gray-100 text-gray-700"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{manager.manager}</p>
                        <p className="text-xs text-gray-500">
                          {manager.unique_agents} agents •{" "}
                          {manager.total_sessions} sessions
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {manager.attendance_rate}% attendance
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Improvements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Agent Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentsWithImprovement.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No improvement data yet. Upload weekly data to track progress.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agentsWithImprovement.slice(0, 10).map((agent) => (
                  <div
                    key={`${agent.agent_name}-${agent.week_of}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{agent.agent_name}</p>
                      <div className="flex gap-2 text-xs text-gray-500 mt-1">
                        <span>{agent.training_type}</span>
                        <span>•</span>
                        <span>
                          Week of {new Date(agent.week_of).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-600 font-bold">
                        <TrendingUp className="h-4 w-4" />
                        +{agent.cap_improvement}
                      </div>
                      <p className="text-xs text-gray-500">
                        {agent.previous_cap_score} → {agent.adjusted_cap_score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Effectiveness by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Training Effectiveness by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingEffectivenessChart data={trainingProgress} />
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingEffectivenessChart({ data }: { data: any[] }) {
  const trainingTypes = [
    "Close Rate Training",
    "Annual Premium Training",
    "Place Rate Training",
    "Zero CAP Remediation",
  ];

  const effectiveness = trainingTypes.map((type) => {
    const typeData = data.filter(
      (d) => d.training_type === type && d.attended === true
    );
    const improved = typeData.filter((d) => d.cap_improvement > 0).length;
    const total = typeData.length;
    const rate = total > 0 ? Math.round((improved / total) * 100) : 0;
    const avgImprovement =
      improved > 0
        ? Math.round(
            typeData
              .filter((d) => d.cap_improvement > 0)
              .reduce((sum, d) => sum + d.cap_improvement, 0) / improved
          )
        : 0;

    return {
      type,
      rate,
      improved,
      total,
      avgImprovement,
    };
  });

  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No training effectiveness data available yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {effectiveness.map((item) => (
        <div key={item.type} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{item.type}</span>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600">
                {item.improved}/{item.total} improved
              </span>
              <Badge
                className={
                  item.rate >= 70
                    ? "bg-green-100 text-green-800"
                    : item.rate >= 50
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {item.rate}% success rate
              </Badge>
              {item.avgImprovement > 0 && (
                <span className="text-green-600 font-medium">
                  +{item.avgImprovement} avg
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                item.rate >= 70
                  ? "bg-green-500"
                  : item.rate >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${item.rate}%` }}
            ></div>
          </div>
        </div>
      ))}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Insight:</strong> Training types with higher success rates
          indicate better curriculum alignment with agent needs. Low success rates
          may require curriculum review or additional follow-up sessions.
        </p>
      </div>
    </div>
  );
}

