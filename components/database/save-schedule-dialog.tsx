"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DaySchedule } from "@/types";
import {
  saveTrainingSchedule,
  saveCAPScoreHistory,
  getScheduledWeeks,
} from "@/lib/database";
import {
  Database,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";

interface SaveScheduleDialogProps {
  schedule: DaySchedule[];
  avgCAPScore: number;
  avgAdjustedCAPScore: number;
  eligibleAgents: any[];
  fullStats?: any;
  onSaveComplete?: () => void;
}

export function SaveScheduleDialog({
  schedule,
  avgCAPScore,
  avgAdjustedCAPScore,
  eligibleAgents,
  fullStats,
  onSaveComplete,
}: SaveScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [weekOf, setWeekOf] = useState(getNextMonday());
  const [isSaving, setIsSaving] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [scheduledWeeks, setScheduledWeeks] = useState<string[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  const totalAgents = schedule.reduce(
    (sum, day) =>
      sum +
      day.sessions.reduce(
        (daySum, session) => daySum + session.agents.length,
        0
      ),
    0
  );

  const totalSessions = schedule.reduce(
    (sum, day) => sum + day.sessions.length,
    0
  );

  // Load scheduled weeks when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      loadScheduledWeeks();
    }
  }, [isOpen]);

  async function loadScheduledWeeks() {
    setLoadingWeeks(true);
    const result = await getScheduledWeeks();
    if (result.success) {
      setScheduledWeeks(result.weeks);
    }
    setLoadingWeeks(false);
  }

  async function handleSave(forceUpdate: boolean = false) {
    setIsSaving(true);
    setSaveStatus(null);
    setShowUpdateConfirm(false);

    try {
      // Save the schedule with full stats
      const scheduleResult = await saveTrainingSchedule(
        schedule,
        new Date(weekOf),
        avgCAPScore,
        avgAdjustedCAPScore,
        fullStats,
        forceUpdate
      );

      if (!scheduleResult.success) {
        // Check if error is about existing schedule
        if (scheduleResult.error?.includes("already exists") && !forceUpdate) {
          setShowUpdateConfirm(true);
          setIsSaving(false);
          return;
        }
        throw new Error(scheduleResult.error);
      }

      // Save CAP score history
      const historyResult = await saveCAPScoreHistory(
        eligibleAgents,
        new Date(weekOf)
      );

      if (!historyResult.success) {
        console.warn("Failed to save CAP history:", historyResult.error);
      }

      setSaveStatus({
        success: true,
        message: `Schedule saved successfully for week of ${new Date(
          weekOf
        ).toLocaleDateString()}!`,
      });

      setTimeout(() => {
        setIsOpen(false);
        onSaveComplete?.();
      }, 2000);
    } catch (error: any) {
      setSaveStatus({
        success: false,
        message: error.message || "Failed to save schedule",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-green-600 hover:bg-green-700"
        size="lg"
      >
        <Database className="mr-2 h-4 w-4" />
        Save Schedule to Database
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Save Training Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Schedule Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold">{totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Agents</p>
                    <p className="text-2xl font-bold">{totalAgents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg CAP Score</p>
                    <p className="text-2xl font-bold">{avgCAPScore}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Adjusted CAP</p>
                    <p className="text-2xl font-bold">{avgAdjustedCAPScore}</p>
                  </div>
                </div>
              </div>

              {/* Week Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Week Of (Monday)
                </label>
                <input
                  type="date"
                  value={weekOf}
                  onChange={(e) => setWeekOf(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Schedule will be saved for the week starting on this date
                </p>

                {/* Existing Schedules Info */}
                {!loadingWeeks && scheduledWeeks.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-blue-900 mb-1">
                          Existing schedules:
                        </p>
                        <div className="text-blue-800 space-y-0.5">
                          {scheduledWeeks.slice(0, 5).map((week) => (
                            <div key={week} className="flex items-center gap-1">
                              <span>•</span>
                              <span>
                                Week of {new Date(week).toLocaleDateString()}
                                {week === weekOf && (
                                  <Badge
                                    className="ml-2 text-xs"
                                    variant="destructive"
                                  >
                                    Will be replaced
                                  </Badge>
                                )}
                              </span>
                            </div>
                          ))}
                          {scheduledWeeks.length > 5 && (
                            <div className="text-blue-600">
                              ...and {scheduledWeeks.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Day Breakdown */}
              <div>
                <h3 className="font-semibold mb-2">Days Included</h3>
                <div className="space-y-2">
                  {schedule.map((day) => (
                    <div
                      key={day.day}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="font-medium">{day.day}</span>
                      <Badge variant="outline">
                        {day.sessions.length} sessions,{" "}
                        {day.sessions.reduce(
                          (sum, s) => sum + s.agents.length,
                          0
                        )}{" "}
                        agents
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Confirmation */}
              {showUpdateConfirm && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-amber-800 font-medium">
                        A schedule already exists for this week
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        Would you like to replace the existing schedule? This
                        will delete the old schedule and its attendance records.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(true)}
                          className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                        >
                          Yes, Update Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowUpdateConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {saveStatus && !showUpdateConfirm && (
                <div
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    saveStatus.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {saveStatus.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <p
                    className={
                      saveStatus.success ? "text-green-800" : "text-red-800"
                    }
                  >
                    {saveStatus.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSave()}
                  disabled={isSaving || !weekOf || showUpdateConfirm}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Save to Database
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  What happens when you save?
                </p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>✓ Schedule is stored permanently in the database</li>
                  <li>✓ You can track attendance later</li>
                  <li>✓ Analytics and reporting become available</li>
                  <li>✓ Can't save duplicate schedules for the same week</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If Sunday, add 1 day; otherwise add days to next Monday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}
