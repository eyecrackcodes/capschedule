"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Users, Calendar } from "lucide-react";
import { Stats, DaySchedule } from "@/types";

interface EdgeCaseHandlerProps {
  stats: Stats;
  schedule: DaySchedule[];
}

export function EdgeCaseHandler({ stats, schedule }: EdgeCaseHandlerProps) {
  // Edge Case 1: Zero Agents Need Training
  if (stats.needsTraining === 0 && stats.totalAgents > 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Trophy className="h-5 w-5" />
            <span>Excellent Performance!</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 mb-4">
            Great news! All agents are performing above the company average CAP
            score of {stats.avgCAPScore}.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-green-600">
              • No training sessions needed this week
            </p>
            <p className="text-sm text-green-600">
              • Consider recognizing top performers
            </p>
            <p className="text-sm text-green-600">
              • Monitor for any future performance dips
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edge Case 2: Too Many Agents for One Week
  const totalSessions = schedule.reduce(
    (sum, day) => sum + day.sessions.length,
    0
  );
  const weeklyCapacity = 30; // 5 days × 6 time slots

  if (totalSessions > weeklyCapacity) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Calendar className="h-5 w-5" />
            <span>Multi-Week Schedule Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 mb-4">
            Training schedule spans multiple weeks due to high volume of agents
            needing training.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-yellow-600">
              • <strong>Week 1:</strong>{" "}
              {Math.min(totalSessions, weeklyCapacity)} sessions scheduled
            </p>
            <p className="text-sm text-yellow-600">
              • <strong>Remaining:</strong>{" "}
              {Math.max(0, totalSessions - weeklyCapacity)} sessions for Week 2+
            </p>
            <p className="text-sm text-yellow-600">
              • Prioritized lowest CAP scores for Week 1
            </p>
            <p className="text-sm text-yellow-600">
              • Consider increasing training frequency if needed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edge Case 3: Unbalanced Distribution
  const cltSessions = schedule.reduce(
    (sum, day) =>
      sum + day.sessions.filter((session) => session.location === "CLT").length,
    0
  );
  const atxSessions = schedule.reduce(
    (sum, day) =>
      sum + day.sessions.filter((session) => session.location === "ATX").length,
    0
  );

  const totalSessionsForBalance = cltSessions + atxSessions;
  const cltRatio =
    totalSessionsForBalance > 0 ? cltSessions / totalSessionsForBalance : 0;
  const atxRatio =
    totalSessionsForBalance > 0 ? atxSessions / totalSessionsForBalance : 0;

  if (totalSessionsForBalance > 0 && Math.abs(cltRatio - atxRatio) > 0.3) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Unbalanced Schedule Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700 mb-4">
            One location has significantly more training needs than the other.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <Badge variant="info" className="mb-2">
                CLT
              </Badge>
              <p className="text-sm text-orange-600">
                {cltSessions} sessions ({Math.round(cltRatio * 100)}%)
              </p>
            </div>
            <div className="text-center">
              <Badge variant="success" className="mb-2">
                ATX
              </Badge>
              <p className="text-sm text-orange-600">
                {atxSessions} sessions ({Math.round(atxRatio * 100)}%)
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-orange-600">
              • Consider adjusting time slot allocation
            </p>
            <p className="text-sm text-orange-600">
              • May assign 2 sessions to heavy location vs 1 to lighter location
            </p>
            <p className="text-sm text-orange-600">
              • Maintain alternation principle but allow flexibility
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edge Case 4: All Agents Same Manager (check for any session with all same manager)
  const sessionsWithSameManager = schedule.flatMap((day) =>
    day.sessions.filter((session) => {
      const managers = [
        ...new Set(session.agents.map((agent) => agent.manager)),
      ];
      return managers.length === 1;
    })
  );

  if (sessionsWithSameManager.length > 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Users className="h-5 w-5" />
            <span>Manager Diversity Recommendation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-4">
            Some training cohorts contain agents from the same manager.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-blue-600">
              • <strong>{sessionsWithSameManager.length}</strong> sessions have
              single-manager cohorts
            </p>
            <p className="text-sm text-blue-600">
              • Consider cross-manager pairing for best practices
            </p>
            <p className="text-sm text-blue-600">
              • Suggest combining with another manager's agents if possible
            </p>
            <p className="text-sm text-blue-600">
              • This promotes knowledge sharing across teams
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No edge cases detected
  return null;
}
