"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPendingAttendance,
  markAttendance,
  bulkMarkAttendance,
  getTrainingSchedules,
} from "@/lib/database";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Calendar,
  Loader2,
  Save,
} from "lucide-react";

export function AttendanceTracker() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState<
    Map<string, { attended: boolean; reason?: string }>
  >(new Map());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    const result = await getTrainingSchedules();
    if (result.success && result.data) {
      setSchedules(result.data);
    }
  }

  async function loadAssignments(scheduleId: string) {
    setIsLoading(true);
    
    // Get assignments for this specific schedule
    const { data, error } = await supabase
      .from("agent_assignments")
      .select(
        `
        *,
        training_sessions!session_id (day, time_slot, location, training_type)
      `
      )
      .eq("schedule_id", scheduleId)
      .order("created_at");

    if (error) {
      console.error("Error loading assignments:", error);
      setAssignments([]);
    } else {
      setAssignments(data || []);
    }
    
    setIsLoading(false);
  }

  function handleAttendanceChange(
    assignmentId: string,
    attended: boolean,
    reason?: string
  ) {
    const newChanges = new Map(attendanceChanges);
    newChanges.set(assignmentId, { attended, reason });
    setAttendanceChanges(newChanges);
  }

  async function handleBulkSave() {
    if (attendanceChanges.size === 0) {
      alert("No changes to save");
      return;
    }

    setIsSaving(true);

    const updates = Array.from(attendanceChanges.entries()).map(
      ([id, data]) => ({
        id,
        attended: data.attended,
        noShowReason: data.reason,
      })
    );

    const result = await bulkMarkAttendance(updates, "System"); // You'd get actual user name

    if (result.success) {
      alert(result.message);
      setAttendanceChanges(new Map());
      if (selectedScheduleId) {
        loadAssignments(selectedScheduleId);
      }
    } else {
      alert(`Error: ${result.error}`);
    }

    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Schedule Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Select Schedule
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => {
                setSelectedScheduleId(e.target.value);
                if (e.target.value) {
                  loadAssignments(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">-- Choose a schedule --</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  Week of {new Date(schedule.week_of).toLocaleDateString()} (
                  {schedule.total_agents_scheduled} agents)
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedScheduleId
                  ? "No pending attendance to mark"
                  : "Select a schedule to view attendance"}
              </p>
            </div>
          ) : (
            <div>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{assignments.length}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600">Attended</p>
                  <p className="text-2xl font-bold text-green-700">
                    {
                      assignments.filter((a) => a.attended === true).length
                    }
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-600">No-Show</p>
                  <p className="text-2xl font-bold text-red-700">
                    {
                      assignments.filter((a) => a.attended === false).length
                    }
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {
                      assignments.filter((a) => a.attended === null).length
                    }
                  </p>
                </div>
              </div>

              {/* Assignments List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assignments.map((assignment) => (
                  <AttendanceRow
                    key={assignment.id}
                    assignment={assignment}
                    onChange={handleAttendanceChange}
                    pendingChange={attendanceChanges.get(assignment.id)}
                  />
                ))}
              </div>

              {/* Actions */}
              {attendanceChanges.size > 0 && (
                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {attendanceChanges.size} unsaved changes
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAttendanceChanges(new Map())}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkSave}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save All Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceRow({
  assignment,
  onChange,
  pendingChange,
}: {
  assignment: any;
  onChange: (id: string, attended: boolean, reason?: string) => void;
  pendingChange?: { attended: boolean; reason?: string };
}) {
  const [reason, setReason] = useState("");
  const currentStatus = pendingChange?.attended ?? assignment.attended;
  const hasChange = pendingChange !== undefined;

  return (
    <div
      className={`border rounded-lg p-3 ${
        hasChange ? "bg-yellow-50 border-yellow-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium">{assignment.agent_name}</span>
            <Badge variant="outline" className="text-xs">
              {assignment.manager}
            </Badge>
            <Badge
              className={`text-xs ${
                assignment.training_sessions.location === "CLT"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {assignment.training_sessions.location}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>{assignment.training_sessions.day}</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{assignment.training_sessions.time_slot}</span>
            <span>•</span>
            <span>{assignment.training_sessions.training_type}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentStatus === true ? "default" : "outline"}
            className={
              currentStatus === true
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
            onClick={() => onChange(assignment.id, true)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Attended
          </Button>
          <Button
            size="sm"
            variant={currentStatus === false ? "destructive" : "outline"}
            onClick={() => {
              if (currentStatus !== false) {
                const reason = prompt("Reason for no-show (optional):");
                onChange(assignment.id, false, reason || undefined);
              }
            }}
          >
            <XCircle className="h-4 w-4 mr-1" />
            No-Show
          </Button>
        </div>
      </div>

      {currentStatus === false && pendingChange?.reason && (
        <div className="mt-2 text-xs text-red-600">
          Reason: {pendingChange.reason}
        </div>
      )}
    </div>
  );
}

