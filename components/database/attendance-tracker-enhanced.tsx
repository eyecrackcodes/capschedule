"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTrainingSchedules,
  markAttendance,
  bulkMarkAttendance,
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
  Filter,
  MapPin,
  RefreshCw,
} from "lucide-react";

interface AttendanceFilters {
  location: "all" | "CLT" | "ATX";
  day: "all" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  timeRange: "all" | "morning" | "afternoon";
  status: "all" | "pending" | "attended" | "no-show";
  dateRange: "all" | "today" | "this-week" | "past-due" | "upcoming";
}

export function AttendanceTrackerEnhanced() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState<
    Map<string, { attended: boolean; reason?: string }>
  >(new Map());
  const [isSaving, setIsSaving] = useState(false);
  
  const [filters, setFilters] = useState<AttendanceFilters>({
    location: "all",
    day: "all",
    timeRange: "all",
    status: "pending",
    dateRange: "this-week",
  });

  useEffect(() => {
    loadSchedulesAndAssignments();
  }, []);

  async function loadSchedulesAndAssignments() {
    setIsLoading(true);
    
    // Get all schedules
    const schedulesResult = await getTrainingSchedules();
    if (schedulesResult.success && schedulesResult.data) {
      setSchedules(schedulesResult.data);
      
      // Load all assignments across all schedules
      await loadAllAssignments();
    }
    
    setIsLoading(false);
  }

  async function loadAllAssignments() {
    console.log("🔍 Loading all assignments...");
    
    const { data, error } = await supabase
      .from("agent_assignments")
      .select(
        `
        *,
        training_sessions!session_id (
          day, 
          time_slot, 
          location, 
          training_type,
          schedule_id
        ),
        training_schedules!schedule_id (
          week_of
        )
      `
      )
      .order("created_at");

    console.log("📊 Assignments query result:", { data, error, count: data?.length });

    if (error) {
      console.error("❌ Error loading assignments:", error);
      setAssignments([]);
    } else {
      console.log("✅ Loaded", data?.length || 0, "assignments");
      console.log("Sample assignment:", data?.[0]);
      setAssignments(data || []);
    }
  }

  function handleAttendanceChange(
    assignmentId: string,
    attended: boolean,
    reason?: string
  ) {
    console.log("✏️ Marking attendance:", { assignmentId, attended, reason });
    const newChanges = new Map(attendanceChanges);
    newChanges.set(assignmentId, { attended, reason });
    setAttendanceChanges(newChanges);
    console.log("📝 Total unsaved changes:", newChanges.size);
  }

  async function handleBulkSave() {
    if (attendanceChanges.size === 0) {
      alert("No changes to save");
      return;
    }

    console.log("💾 Saving", attendanceChanges.size, "attendance changes...");
    setIsSaving(true);

    const updates = Array.from(attendanceChanges.entries()).map(
      ([id, data]) => ({
        id,
        attended: data.attended,
        noShowReason: data.reason,
      })
    );
    
    console.log("📝 Updates to save:", updates);

    const result = await bulkMarkAttendance(updates, "Manager");
    
    console.log("💾 Save result:", result);

    if (result.success) {
      alert(result.message);
      setAttendanceChanges(new Map());
      console.log("🔄 Reloading assignments from database...");
      await loadAllAssignments();
      console.log("✅ Reload complete!");
    } else {
      alert(`Error: ${result.error}`);
      console.error("❌ Failed to save attendance:", result.error);
    }

    setIsSaving(false);
  }

  // Debug: Log filtering info
  console.log("🎯 Filtering", assignments.length, "assignments with filters:", filters);
  
  // Smart filtering logic
  const filteredAssignments = assignments.filter((assignment) => {
    const session = assignment.training_sessions;
    const schedule = assignment.training_schedules;
    
    if (!session || !schedule) {
      console.warn("⚠️ Assignment missing session or schedule data:", assignment);
      return false;
    }

    // Location filter
    if (filters.location !== "all" && session.location !== filters.location) {
      return false;
    }

    // Day filter
    if (filters.day !== "all" && session.day !== filters.day) {
      return false;
    }

    // Time range filter
    if (filters.timeRange !== "all") {
      const isMorning = session.time_slot.includes("8:") || 
                        session.time_slot.includes("9:") || 
                        session.time_slot.includes("10:") ||
                        session.time_slot.includes("11:");
      if (filters.timeRange === "morning" && !isMorning) return false;
      if (filters.timeRange === "afternoon" && isMorning) return false;
    }

    // Status filter
    if (filters.status !== "all") {
      const currentStatus = attendanceChanges.get(assignment.id)?.attended ?? assignment.attended;
      if (filters.status === "pending" && currentStatus !== null) return false;
      if (filters.status === "attended" && currentStatus !== true) return false;
      if (filters.status === "no-show" && currentStatus !== false) return false;
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const weekOf = new Date(schedule.week_of + 'T00:00:00'); // Parse as local date
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
      
      // Calculate current week's Monday (normalize to midnight)
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - daysToMonday);
      thisMonday.setHours(0, 0, 0, 0);
      
      // Normalize both to date strings for comparison (YYYY-MM-DD)
      const weekOfStr = schedule.week_of;
      const thisMondayStr = thisMonday.toISOString().split('T')[0];
      
      if (filters.dateRange === "this-week") {
        if (weekOfStr !== thisMondayStr) return false;
      } else if (filters.dateRange === "past-due") {
        if (weekOfStr >= thisMondayStr) return false;
      } else if (filters.dateRange === "upcoming") {
        if (weekOfStr <= thisMondayStr) return false;
      } else if (filters.dateRange === "today") {
        const todayDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
        if (weekOfStr !== thisMondayStr || session.day !== todayDay) return false;
      }
    }

    return true;
  });
  
  console.log("📊 Filtered down to", filteredAssignments.length, "assignments");

  // Calculate stats from ALL assignments (not just filtered) to show true counts
  const allAttendedCount = assignments.filter((a) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === true;
  }).length;
  const allNoShowCount = assignments.filter((a) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === false;
  }).length;
  const allPendingCount = assignments.filter((a) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === null;
  }).length;

  // Group by session for better display
  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const key = `${assignment.training_schedules.week_of}-${assignment.training_sessions.day}-${assignment.training_sessions.time_slot}-${assignment.training_sessions.location}`;
    if (!acc[key]) {
      acc[key] = {
        week_of: assignment.training_schedules.week_of,
        day: assignment.training_sessions.day,
        time_slot: assignment.training_sessions.time_slot,
        location: assignment.training_sessions.location,
        training_type: assignment.training_sessions.training_type,
        agents: [],
      };
    }
    acc[key].agents.push(assignment);
    return acc;
  }, {} as Record<string, any>);

  const sessions = Object.values(groupedAssignments);

  // Sort sessions by week, day, time
  const dayOrder: Record<string, number> = { Tuesday: 0, Wednesday: 1, Thursday: 2, Friday: 3 };
  sessions.sort((a: any, b: any) => {
    if (a.week_of !== b.week_of) return a.week_of.localeCompare(b.week_of);
    if (a.day !== b.day) return (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
    return a.time_slot.localeCompare(b.time_slot);
  });

  // Use the all-assignments stats (calculated before filtering)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading attendance data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Tracker
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadSchedulesAndAssignments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">Filters</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Location Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Location
                </label>
                <select
                  value={filters.location}
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value as any })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Sites</option>
                  <option value="CLT">Charlotte (CLT)</option>
                  <option value="ATX">Austin (ATX)</option>
                </select>
              </div>

              {/* Day Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Day
                </label>
                <select
                  value={filters.day}
                  onChange={(e) =>
                    setFilters({ ...filters, day: e.target.value as any })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Days</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              {/* Time Range Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Time
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) =>
                    setFilters({ ...filters, timeRange: e.target.value as any })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Times</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as any })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="attended">✓ Attended</option>
                  <option value="no-show">✗ No-Show</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Week
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as any })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Weeks</option>
                  <option value="today">📍 Today</option>
                  <option value="this-week">📅 This Week</option>
                  <option value="past-due">⏰ Past Due</option>
                  <option value="upcoming">📆 Upcoming</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({
                    location: "CLT",
                    day: "all",
                    timeRange: "all",
                    status: "pending",
                    dateRange: "this-week",
                  })
                }
              >
                <MapPin className="h-3 w-3 mr-1" />
                CLT This Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({
                    location: "ATX",
                    day: "all",
                    timeRange: "all",
                    status: "pending",
                    dateRange: "this-week",
                  })
                }
              >
                <MapPin className="h-3 w-3 mr-1" />
                ATX This Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({
                    location: "all",
                    day: "all",
                    timeRange: "all",
                    status: "pending",
                    dateRange: "past-due",
                  })
                }
              >
                <Clock className="h-3 w-3 mr-1" />
                Needs Marking
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({
                    location: "all",
                    day: "all",
                    timeRange: "all",
                    status: "all",
                    dateRange: "all",
                  })
                }
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Showing</p>
              <p className="text-2xl font-bold">{totalFiltered}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600">Attended</p>
              <p className="text-2xl font-bold text-green-700">{attendedCount}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-600">No-Show</p>
              <p className="text-2xl font-bold text-red-700">{noShowCount}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
            </div>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No sessions match your filters</p>
              <p className="text-sm text-gray-400">
                Try adjusting the filters above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, idx) => (
                <SessionCard
                  key={idx}
                  session={session}
                  onAttendanceChange={handleAttendanceChange}
                  attendanceChanges={attendanceChanges}
                />
              ))}
            </div>
          )}

          {/* Save Actions */}
          {attendanceChanges.size > 0 && (
            <div className="mt-6 pt-6 border-t flex items-center justify-between bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                {attendanceChanges.size} unsaved change{attendanceChanges.size !== 1 ? "s" : ""}
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
        </CardContent>
      </Card>
    </div>
  );
}

function SessionCard({
  session,
  onAttendanceChange,
  attendanceChanges,
}: {
  session: any;
  onAttendanceChange: (id: string, attended: boolean, reason?: string) => void;
  attendanceChanges: Map<string, { attended: boolean; reason?: string }>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate session stats
  const attended = session.agents.filter((a: any) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === true;
  }).length;
  
  const noShow = session.agents.filter((a: any) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === false;
  }).length;
  
  const pending = session.agents.filter((a: any) => {
    const current = attendanceChanges.get(a.id)?.attended ?? a.attended;
    return current === null;
  }).length;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              className={
                session.location === "CLT"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {session.location}
            </Badge>
            <div>
              <p className="font-semibold">
                {session.day} • {session.time_slot}
              </p>
              <p className="text-xs text-gray-500">{session.training_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-3">
              <p className="text-xs text-gray-500">
                Week of {new Date(session.week_of).toLocaleDateString()}
              </p>
              <div className="flex gap-2 text-xs">
                {attended > 0 && <span className="text-green-600">✓ {attended}</span>}
                {noShow > 0 && <span className="text-red-600">✗ {noShow}</span>}
                {pending > 0 && <span className="text-yellow-600">⏳ {pending}</span>}
              </div>
            </div>
            <Badge variant="outline">{session.agents.length} agents</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {session.agents.map((assignment: any) => (
              <AttendanceRow
                key={assignment.id}
                assignment={assignment}
                onChange={onAttendanceChange}
                pendingChange={attendanceChanges.get(assignment.id)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
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
  const currentStatus = pendingChange?.attended ?? assignment.attended;
  const hasChange = pendingChange !== undefined;

  const handleAttended = () => {
    console.log("✅ Marking attended:", assignment.agent_name);
    onChange(assignment.id, true);
  };

  const handleNoShow = () => {
    console.log("❌ Marking no-show:", assignment.agent_name);
    const reason = prompt("Reason for no-show (optional):");
    onChange(assignment.id, false, reason || undefined);
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-colors ${
        hasChange 
          ? "bg-yellow-50 border-yellow-300 shadow-sm" 
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{assignment.agent_name}</span>
          <Badge variant="outline" className="text-xs">
            {assignment.manager}
          </Badge>
          <Badge className="text-xs bg-purple-100 text-purple-800">
            Adj CAP: {assignment.adjusted_cap_score}
          </Badge>
          {hasChange && (
            <Badge className="text-xs bg-yellow-600 text-white animate-pulse">
              Unsaved
            </Badge>
          )}
        </div>
        {currentStatus !== null && (
          <p className={`text-xs mt-1 ${currentStatus ? "text-green-600" : "text-red-600"}`}>
            {currentStatus ? "✓ Will be marked as attended" : "✗ Will be marked as no-show"}
            {pendingChange?.reason && ` - ${pendingChange.reason}`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={currentStatus === true ? "default" : "outline"}
          className={
            currentStatus === true 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "hover:bg-green-50"
          }
          onClick={handleAttended}
        >
          <CheckCircle2 className={`h-4 w-4 mr-1 ${currentStatus === true ? "fill-white" : ""}`} />
          Attended
        </Button>
        <Button
          size="sm"
          variant={currentStatus === false ? "destructive" : "outline"}
          className={
            currentStatus === false
              ? ""
              : "hover:bg-red-50"
          }
          onClick={handleNoShow}
        >
          <XCircle className={`h-4 w-4 mr-1 ${currentStatus === false ? "fill-white" : ""}`} />
          No-Show
        </Button>
      </div>
    </div>
  );
}

