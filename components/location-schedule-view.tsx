"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DaySchedule,
  TRAINING_FOCUS,
  ATX_TIME_SLOTS,
  CLT_TIME_SLOTS,
} from "@/types";
import { getLocationTime } from "@/lib/business-logic";
import { Clock, Users, AlertCircle } from "lucide-react";

interface LocationScheduleViewProps {
  schedule: DaySchedule[];
}

export function LocationScheduleView({ schedule }: LocationScheduleViewProps) {
  // Group sessions by time slot to check for overlaps
  const timeSlotMap = new Map<string, { clt: any[]; atx: any[] }>();

  schedule.forEach((day) => {
    day.sessions.forEach((session) => {
      const key = `${day.day}-${session.time}`;
      if (!timeSlotMap.has(key)) {
        timeSlotMap.set(key, { clt: [], atx: [] });
      }
      const slot = timeSlotMap.get(key)!;
      if (session.location === "CLT") {
        slot.clt.push({ ...session, day: day.day });
      } else {
        slot.atx.push({ ...session, day: day.day });
      }
    });
  });

  // Check for conflicts
  const conflicts: string[] = [];
  timeSlotMap.forEach((slot, key) => {
    if (slot.clt.length > 0 && slot.atx.length > 0) {
      conflicts.push(key);
    }
  });

  return (
    <div className="space-y-6">
      {conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Schedule Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              Both locations are scheduled for training at the same time:
            </p>
            <ul className="mt-2 space-y-1">
              {conflicts.map((conflict) => (
                <li key={conflict} className="text-red-600 text-sm">
                  • {conflict}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CLT Schedule */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900">
              Charlotte (CLT) Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day) => {
                const daySessions =
                  schedule
                    .find((d) => d.day === day)
                    ?.sessions.filter((s) => s.location === "CLT") || [];

                return (
                  <div key={day} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{day}</h4>
                      {TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS] && (
                        <Badge variant="outline" className="text-xs">
                          {TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]}
                        </Badge>
                      )}
                    </div>
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No training scheduled
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySessions.map((session, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-blue-50 rounded border border-blue-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-medium">
                                  {getLocationTime(session.time, "CLT")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-blue-600" />
                                <span className="text-xs">
                                  {session.agents.length} agents
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {session.agents.map((agent, agentIdx) => (
                                <div
                                  key={agentIdx}
                                  className="text-xs bg-white p-1 rounded flex justify-between"
                                >
                                  <span className="font-medium">
                                    {agent.name}
                                  </span>
                                  <span className="text-gray-600">
                                    Manager: {agent.manager}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>

        {/* ATX Schedule */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">
              Austin (ATX) Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day) => {
                const daySessions =
                  schedule
                    .find((d) => d.day === day)
                    ?.sessions.filter((s) => s.location === "ATX") || [];

                return (
                  <div key={day} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{day}</h4>
                      {TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS] && (
                        <Badge variant="outline" className="text-xs">
                          {TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]}
                        </Badge>
                      )}
                    </div>
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No training scheduled
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySessions.map((session, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-green-50 rounded border border-green-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium">
                                  {getLocationTime(session.time, "ATX")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-green-600" />
                                <span className="text-xs">
                                  {session.agents.length} agents
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {session.agents.map((agent, agentIdx) => (
                                <div
                                  key={agentIdx}
                                  className="text-xs bg-white p-1 rounded flex justify-between"
                                >
                                  <span className="font-medium">
                                    {agent.name}
                                  </span>
                                  <span className="text-gray-600">
                                    Manager: {agent.manager}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Slot Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Site Alternation Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from(timeSlotMap.entries()).map(([key, slot]) => {
              const hasConflict = slot.clt.length > 0 && slot.atx.length > 0;
              const [day, time] = key.split("-");

              if (slot.clt.length === 0 && slot.atx.length === 0) return null;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-2 rounded ${
                    hasConflict
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-sm">{day}</span>
                    <span className="text-sm">{time}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {slot.clt.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800">
                        CLT:{" "}
                        {slot.clt.reduce((sum, s) => sum + s.agents.length, 0)}{" "}
                        agents
                      </Badge>
                    )}
                    {slot.atx.length > 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        ATX:{" "}
                        {slot.atx.reduce((sum, s) => sum + s.agents.length, 0)}{" "}
                        agents
                      </Badge>
                    )}
                    {hasConflict && (
                      <Badge variant="destructive">CONFLICT</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
