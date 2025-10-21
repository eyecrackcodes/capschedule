"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DaySchedule,
  Filters,
  TRAINING_FOCUS,
  ATX_TIME_SLOTS,
  CLT_TIME_SLOTS,
} from "@/types";
import {
  ChevronDown,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  Target,
} from "lucide-react";

interface ScheduleDisplayProps {
  schedule: DaySchedule[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  avgAdjustedCAPScore?: number;
}

export function ScheduleDisplay({
  schedule,
  filters,
  onFiltersChange,
  avgAdjustedCAPScore = 0,
}: ScheduleDisplayProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(["Tuesday"])
  );
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set()
  );

  const toggleDayExpansion = (day: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  // Helper function to extract hour from time string for sorting
  const getTimeValue = (timeStr: string): number => {
    // Extract first time and AM/PM (e.g., "8:30 AM" from "8:30-9:30 AM CST")
    const match = timeStr.match(/(\d+):(\d+)[^\d]*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === "PM";

      // Convert to 24-hour format
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }

      return hours * 60 + minutes; // Convert to minutes for comparison
    }
    return 0;
  };

  const filteredSchedule = schedule
    .map((day) => ({
      ...day,
      sessions: day.sessions
        .filter((session) => {
          if (
            filters.location !== "all" &&
            session.location !== filters.location
          )
            return false;
          if (
            filters.tier !== "all" &&
            session.tier.toLowerCase() !== filters.tier
          )
            return false;
          return true;
        })
        .sort((a, b) => getTimeValue(a.time) - getTimeValue(b.time)), // Sort chronologically
    }))
    .filter((day) => day.sessions.length > 0);

  const getLocationColor = (location: "CLT" | "ATX") => {
    return location === "CLT" ? "bg-blue-500" : "bg-green-500";
  };

  const getTierColor = (
    tier: "Performance" | "Standard" | "Zero CAP Remediation"
  ) => {
    if (tier === "Performance") return "bg-purple-500";
    if (tier === "Standard") return "bg-orange-500";
    return "bg-red-500"; // For Zero CAP Remediation
  };

  const getPriorityColor = (priority: string) => {
    if (priority.includes("Pre-peak") || priority.includes("Post-lunch"))
      return "text-green-600";
    if (priority.includes("Early morning") || priority.includes("Afternoon"))
      return "text-yellow-600";
    return "text-gray-600";
  };

  // Calculate total agents in schedule
  const totalAgentsScheduled = schedule.reduce(
    (total, day) =>
      total +
      day.sessions.reduce(
        (dayTotal, session) => dayTotal + session.agents.length,
        0
      ),
    0
  );

  const zeroCAPCount = schedule.reduce(
    (total, day) =>
      total +
      day.sessions
        .filter((session) => session.tier === ("Zero CAP Remediation" as any))
        .reduce((dayTotal, session) => dayTotal + session.agents.length, 0),
    0
  );

  const regularTrainingCount = totalAgentsScheduled - zeroCAPCount;

  return (
    <div className="space-y-4">
      {/* Training Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900">
            Training Schedule Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-700">
                Total Agents Scheduled
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {totalAgentsScheduled}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Across all training days
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-700">
                Zero CAP Remediation
              </h3>
              <p className="text-3xl font-bold text-red-600">{zeroCAPCount}</p>
              <p className="text-sm text-gray-500 mt-1">Friday sessions</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-700">
                Metric-Focused Training
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {regularTrainingCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Tuesday, Wednesday, Thursday
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800">
              Training Eligibility Criteria:
            </p>
            <div className="text-sm text-yellow-700 mt-1">
              <p>
                • <strong>Company Average Adjusted CAP:</strong>{" "}
                {avgAdjustedCAPScore} (with Lead Attainment)
              </p>
              <p>
                • <strong>Zero CAP Agents:</strong> Immediate remediation on
                Friday
              </p>
              <p>
                • <strong>Below Average Agents:</strong> Metric-specific
                training Tue-Thu based on lowest performing area
              </p>
            </div>
          </div>

          <div className="mt-6 bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">
              Weekly Training Focus
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              All times shown in both CST (ATX: 8-5) and EST (CLT: 9-6) • CLT is
              1 hour ahead of ATX
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-2">
                <div>
                  <p className="font-medium text-sm">
                    Zero CAP Score Remediation
                  </p>
                  <p className="text-xs text-gray-600">
                    Critical performance intervention
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Badge className="bg-blue-100 text-blue-800">Tuesday</Badge>
                <div>
                  <p className="font-medium text-sm">Close Rate Training</p>
                  <p className="text-xs text-gray-600">
                    For agents below 50th percentile
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Badge className="bg-green-100 text-green-800">Wednesday</Badge>
                <div>
                  <p className="font-medium text-sm">Annual Premium Training</p>
                  <p className="text-xs text-gray-600">
                    For agents below 50th percentile
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Badge className="bg-purple-100 text-purple-800">
                  Thursday
                </Badge>
                <div>
                  <p className="font-medium text-sm">Place Rate Training</p>
                  <p className="text-xs text-gray-600">
                    For agents below 50th percentile
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Badge className="bg-red-100 text-red-800">Friday</Badge>
                <div>
                  <p className="font-medium text-sm">Zero CAP Overflow</p>
                  <p className="text-xs text-gray-600">
                    If needed for additional agents
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schedule Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    location: e.target.value as any,
                  })
                }
                className="ml-2 px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Locations</option>
                <option value="CLT">Charlotte (CLT)</option>
                <option value="ATX">Austin (ATX)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) =>
                  onFiltersChange({ ...filters, tier: e.target.value as any })
                }
                className="ml-2 px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Tiers</option>
                <option value="performance">Performance</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <div className="space-y-4">
        {filteredSchedule.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">
                No training sessions match the current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSchedule.map((day) => (
            <Card key={day.day}>
              <CardHeader>
                <CardTitle
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleDayExpansion(day.day)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedDays.has(day.day) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>{day.day}</span>
                    {TRAINING_FOCUS[day.day as keyof typeof TRAINING_FOCUS] && (
                      <Badge variant="secondary" className="ml-2">
                        {TRAINING_FOCUS[day.day as keyof typeof TRAINING_FOCUS]}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {day.sessions.length} sessions
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>

              {expandedDays.has(day.day) && (
                <CardContent className="space-y-3">
                  {day.sessions.map((session, index) => {
                    const sessionId = `${day.day}-${index}`;
                    const isExpanded = expandedSessions.has(sessionId);

                    return (
                      <div key={sessionId} className="border rounded-lg p-4">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleSessionExpansion(sessionId)}
                        >
                          <div className="flex items-center space-x-3">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{session.time}</span>
                            <div
                              className={`w-3 h-3 rounded-full ${getLocationColor(
                                session.location
                              )}`}
                            ></div>
                            <span className="text-sm font-medium">
                              {session.location}
                            </span>
                            <div
                              className={`w-3 h-3 rounded-full ${getTierColor(
                                session.tier
                              )}`}
                            ></div>
                            <span className="text-sm">{session.tier}</span>
                            <Badge
                              variant={
                                session.agents.length < 2
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {session.agents.length}
                              {session.agents.length < 2 && " (Below Min)"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs ${getPriorityColor(
                                session.priority
                              )}`}
                            >
                              {session.priority}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {/* Training Focus Info */}
                            {TRAINING_FOCUS[
                              day.day as keyof typeof TRAINING_FOCUS
                            ] && (
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <h4 className="font-medium text-sm text-blue-900 mb-1">
                                  {
                                    TRAINING_FOCUS[
                                      day.day as keyof typeof TRAINING_FOCUS
                                    ]
                                  }
                                </h4>
                                <p className="text-xs text-blue-700">
                                  {day.day === "Tuesday" &&
                                    "Agents below the 25th percentile in Close Rate for their tier"}
                                  {day.day === "Wednesday" &&
                                    "Agents below the 25th percentile in Annual Premium for their tier"}
                                  {day.day === "Thursday" &&
                                    "Agents below the 25th percentile in Place Rate for their tier"}
                                  {day.day === "Friday" &&
                                    "Agents with Zero CAP Score or needing additional support"}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">
                                  Agents in Cohort
                                </h4>
                                <div className="space-y-2">
                                  {session.agents.map((agent, agentIndex) => (
                                    <div
                                      key={agentIndex}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <div>
                                        <span className="font-medium text-sm">
                                          {agent.name}
                                        </span>
                                        <p className="text-xs text-gray-500">
                                          {agent.manager}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <Badge
                                          variant={
                                            agent.adjustedCAPScore === 0
                                              ? "destructive"
                                              : "outline"
                                          }
                                          className="text-xs"
                                        >
                                          Adj CAP: {agent.adjustedCAPScore}
                                        </Badge>
                                        <p className="text-xs text-gray-500">
                                          Orig: {agent.capScore} |{" "}
                                          {agent.leadAttainment.toFixed(0)}%
                                          Attain
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Tenure: {agent.tenure}y
                                        </p>

                                        {/* Display agent metrics */}
                                        <div className="mt-1 space-y-1">
                                          {agent.closeRate !== undefined && (
                                            <div className="text-xs">
                                              <span className="text-gray-600">
                                                Close Rate:
                                              </span>
                                              <span
                                                className={`ml-1 font-medium ${
                                                  agent.recommendedTraining?.includes(
                                                    "Close Rate Training"
                                                  )
                                                    ? "text-red-600"
                                                    : "text-gray-700"
                                                }`}
                                              >
                                                {agent.closeRate}%
                                                {agent.recommendedTraining?.includes(
                                                  "Close Rate Training"
                                                ) && " ⚠️"}
                                              </span>
                                            </div>
                                          )}
                                          {agent.annualPremium !==
                                            undefined && (
                                            <div className="text-xs">
                                              <span className="text-gray-600">
                                                Annual Premium:
                                              </span>
                                              <span
                                                className={`ml-1 font-medium ${
                                                  agent.recommendedTraining?.includes(
                                                    "Annual Premium Training"
                                                  )
                                                    ? "text-red-600"
                                                    : "text-gray-700"
                                                }`}
                                              >
                                                ${agent.annualPremium}
                                                {agent.recommendedTraining?.includes(
                                                  "Annual Premium Training"
                                                ) && " ⚠️"}
                                              </span>
                                            </div>
                                          )}
                                          {agent.placeRate !== undefined && (
                                            <div className="text-xs">
                                              <span className="text-gray-600">
                                                Place Rate:
                                              </span>
                                              <span
                                                className={`ml-1 font-medium ${
                                                  agent.recommendedTraining?.includes(
                                                    "Place Rate Training"
                                                  )
                                                    ? "text-red-600"
                                                    : "text-gray-700"
                                                }`}
                                              >
                                                {agent.placeRate}%
                                                {agent.recommendedTraining?.includes(
                                                  "Place Rate Training"
                                                ) && " ⚠️"}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {agent.adjustedCAPScore === 0 && (
                                          <p className="text-xs text-red-600 font-medium mt-1">
                                            Zero CAP - Critical
                                          </p>
                                        )}
                                        {agent.adjustedCAPScore > 0 &&
                                          agent.adjustedCAPScore <
                                            avgAdjustedCAPScore && (
                                            <p className="text-xs text-orange-600 mt-1">
                                              Below avg ({avgAdjustedCAPScore})
                                            </p>
                                          )}
                                        {agent.recommendedTraining &&
                                          agent.recommendedTraining.length >
                                            0 && (
                                            <div className="mt-2">
                                              <p className="text-xs text-gray-600 mb-1">
                                                Needs Training:
                                              </p>
                                              {agent.recommendedTraining.map(
                                                (training, idx) => (
                                                  <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="text-xs mr-1 mb-1"
                                                  >
                                                    {training}
                                                  </Badge>
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">
                                  Session Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    <span>Location: {session.location}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Target className="h-4 w-4 text-gray-500" />
                                    <span>Tier: {session.tier}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    <span>Cohort #{session.cohortNumber}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span>Priority: {session.priority}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
