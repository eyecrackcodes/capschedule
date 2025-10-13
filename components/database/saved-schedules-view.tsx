"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTrainingSchedules,
  deleteSchedule,
  getScheduleById,
} from "@/lib/database";
import {
  Database,
  Calendar,
  Users,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";

export function SavedSchedulesView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setIsLoading(true);
    const result = await getTrainingSchedules();
    if (result.success && result.data) {
      setSchedules(result.data);
    }
    setIsLoading(false);
  }

  async function handleDelete(scheduleId: string, weekOf: string) {
    if (
      !confirm(
        `Are you sure you want to delete the schedule for week of ${new Date(
          weekOf
        ).toLocaleDateString()}? This cannot be undone.`
      )
    ) {
      return;
    }

    const result = await deleteSchedule(scheduleId);
    if (result.success) {
      alert("Schedule deleted successfully");
      loadSchedules();
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleViewDetails(scheduleId: string) {
    const result = await getScheduleById(scheduleId);
    if (result.success && result.data) {
      setSelectedSchedule(result.data);
      setIsViewingDetails(true);
    } else {
      alert(`Error loading schedule: ${result.error}`);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading saved schedules...</p>
        </CardContent>
      </Card>
    );
  }

  if (isViewingDetails && selectedSchedule) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setIsViewingDetails(false)}>
          ← Back to List
        </Button>
        <ScheduleDetailsView schedule={selectedSchedule} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Saved Training Schedules
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadSchedules}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No saved schedules yet</p>
            <p className="text-sm text-gray-400">
              Generate a schedule and click "Save to Database" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">
                        Week of{" "}
                        {new Date(schedule.week_of).toLocaleDateString()}
                      </span>
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {schedule.total_agents_scheduled} agents
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Avg CAP: {schedule.avg_cap_score}</span>
                      <span>Adj CAP: {schedule.avg_adjusted_cap_score}</span>
                      <span>
                        Created:{" "}
                        {new Date(schedule.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(schedule.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(schedule.id, schedule.week_of)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleDetailsView({ schedule }: { schedule: any }) {
  const { schedule: scheduleData, sessions } = schedule;

  // Group sessions by day
  const sessionsByDay = sessions.reduce((acc: any, session: any) => {
    if (!acc[session.day]) {
      acc[session.day] = [];
    }
    acc[session.day].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Schedule Details - Week of{" "}
            {new Date(scheduleData.week_of).toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold">
                {scheduleData.total_agents_scheduled}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg CAP Score</p>
              <p className="text-2xl font-bold">{scheduleData.avg_cap_score}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Adjusted CAP</p>
              <p className="text-2xl font-bold">
                {scheduleData.avg_adjusted_cap_score}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(sessionsByDay)
              .sort()
              .map((day) => (
                <div key={day} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{day}</h3>
                  <div className="space-y-2">
                    {sessionsByDay[day].map((session: any) => (
                      <div
                        key={session.id}
                        className="bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium">{session.time_slot}</span>
                            <span className="mx-2">•</span>
                            <Badge
                              className={
                                session.location === "CLT"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }
                            >
                              {session.location}
                            </Badge>
                            <span className="mx-2">•</span>
                            <span className="text-sm text-gray-600">
                              {session.training_type}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {session.agent_assignments.length} agents
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          Agents:{" "}
                          {session.agent_assignments
                            .map((a: any) => a.agent_name)
                            .join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

