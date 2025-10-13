"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DaySchedule, TRAINING_FOCUS } from "@/types";
import { User, Calendar, MapPin, TrendingDown } from "lucide-react";

interface ManagerAgentViewProps {
  schedule: DaySchedule[];
  avgCAPScore: number;
}

export function ManagerAgentView({
  schedule,
  avgCAPScore,
}: ManagerAgentViewProps) {
  // Group agents by manager
  const managerMap = new Map<
    string,
    {
      agents: Array<{
        name: string;
        adjustedCAPScore: number;
        originalCAPScore: number;
        leadAttainment: number;
        location: string;
        tier: string;
        trainingDay: string;
        trainingTime: string;
        trainingType: string;
      }>;
    }
  >();

  schedule.forEach((day) => {
    day.sessions.forEach((session) => {
      session.agents.forEach((agent) => {
        if (!managerMap.has(agent.manager)) {
          managerMap.set(agent.manager, { agents: [] });
        }

        const trainingType =
          agent.adjustedCAPScore === 0
            ? "Zero CAP Remediation"
            : TRAINING_FOCUS[day.day as keyof typeof TRAINING_FOCUS] ||
              "General Training";

        managerMap.get(agent.manager)!.agents.push({
          name: agent.name,
          adjustedCAPScore: agent.adjustedCAPScore,
          originalCAPScore: agent.capScore,
          leadAttainment: agent.leadAttainment,
          location: session.location,
          tier: agent.tier,
          trainingDay: day.day,
          trainingTime: session.time,
          trainingType: trainingType,
        });
      });
    });
  });

  // Sort managers by number of agents in training
  const sortedManagers = Array.from(managerMap.entries()).sort(
    (a, b) => b[1].agents.length - a[1].agents.length
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manager Training Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Managers</p>
              <p className="text-2xl font-bold">{sortedManagers.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Agents in Training</p>
              <p className="text-2xl font-bold">
                {sortedManagers.reduce(
                  (sum, [_, data]) => sum + data.agents.length,
                  0
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Agents per Manager</p>
              <p className="text-2xl font-bold">
                {sortedManagers.length > 0
                  ? Math.round(
                      sortedManagers.reduce(
                        (sum, [_, data]) => sum + data.agents.length,
                        0
                      ) / sortedManagers.length
                    )
                  : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Adjusted CAP</p>
              <p className="text-2xl font-bold">{avgCAPScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedManagers.map(([manager, data]) => {
          const zeroCAPCount = data.agents.filter(
            (a) => a.adjustedCAPScore === 0
          ).length;
          const belowAvgCount = data.agents.filter(
            (a) => a.adjustedCAPScore > 0 && a.adjustedCAPScore < avgCAPScore
          ).length;

          return (
            <Card key={manager} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {manager}
                  </CardTitle>
                  <Badge variant="outline">
                    {data.agents.length} agent
                    {data.agents.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex gap-2">
                  {zeroCAPCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {zeroCAPCount} Zero CAP
                    </Badge>
                  )}
                  {belowAvgCount > 0 && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      {belowAvgCount} Below Average
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {data.agents.map((agent, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        agent.adjustedCAPScore === 0
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                agent.adjustedCAPScore === 0 ? "destructive" : "outline"
                              }
                              className="text-xs"
                            >
                              Adj CAP: {agent.adjustedCAPScore}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              (Orig: {agent.originalCAPScore} | {agent.leadAttainment.toFixed(0)}%)
                            </span>
                            <Badge
                              className={`text-xs ${
                                agent.location === "CLT"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {agent.location}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {agent.tier}
                            </Badge>
                          </div>
                        </div>
                        <TrendingDown className="h-4 w-4 text-gray-400" />
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {agent.trainingDay} • {agent.trainingTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span className="font-medium">
                            {agent.trainingType}
                          </span>
                        </div>
                      </div>

                      {agent.adjustedCAPScore === 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Critical - Immediate intervention required
                        </p>
                      )}
                      {agent.adjustedCAPScore > 0 && agent.adjustedCAPScore < avgCAPScore && (
                        <p className="text-xs text-orange-600 mt-2">
                          Below company average ({avgCAPScore})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
