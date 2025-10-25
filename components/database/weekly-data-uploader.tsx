"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCAPFile } from "@/lib/file-parser";
import {
  calculateStats,
  calculateMetricPercentiles,
  assignTrainingRecommendations,
  createCohorts,
} from "@/lib/business-logic";
import { generateSchedule } from "@/lib/schedule-generator-v4";
import { saveTrainingSchedule, saveCAPScoreHistory } from "@/lib/database";
import {
  Upload,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface WeeklyDataUploaderProps {
  onUploadComplete?: () => void;
}

export function WeeklyDataUploader({
  onUploadComplete,
}: WeeklyDataUploaderProps) {
  const [weekOf, setWeekOf] = useState(getNextMonday());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<any>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus({ type: "info", message: "Processing file..." });

    try {
      // 1. Parse the file
      const parseResult = await parseCAPFile(file);
      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || "Failed to parse file");
      }

      setStatus({ type: "info", message: "Calculating metrics..." });

      // 2. Calculate stats and generate schedule
      const eligibleAgents = parseResult.data;
      const stats = calculateStats(eligibleAgents);
      const percentiles = calculateMetricPercentiles(eligibleAgents);
      const agentsWithRecommendations = assignTrainingRecommendations(
        eligibleAgents,
        percentiles
      );
      const cohorts = createCohorts(agentsWithRecommendations);
      const schedule = generateSchedule(cohorts, stats.avgCAPScore);

      setStatus({ type: "info", message: "Saving to database..." });

      // Fix timezone issue: parse as local date at noon to avoid UTC shifts
      const weekDate = new Date(weekOf + "T12:00:00");

      // Store schedule data in case we need to confirm update
      const scheduleData = {
        schedule,
        weekDate,
        stats,
        agentsWithRecommendations,
      };

      // 3. Save everything to database
      const saveResult = await saveTrainingSchedule(
        schedule,
        weekDate,
        stats.avgCAPScore,
        stats.avgAdjustedCAPScore,
        {
          totalAgents: stats.totalAgents,
          excludedCount: stats.excludedCount,
          eligibleCount: stats.eligibleCount,
        }
      );

      if (!saveResult.success) {
        // Check if it's because schedule already exists
        if (saveResult.error?.includes("already exists")) {
          setPendingSchedule(scheduleData);
          setShowUpdateConfirm(true);
          setIsProcessing(false);
          return;
        }
        throw new Error(saveResult.error);
      }

      // 4. Save CAP history
      await saveCAPScoreHistory(agentsWithRecommendations, weekDate);

      setStatus({
        type: "success",
        message: `Successfully saved schedule for week of ${new Date(
          weekOf
        ).toLocaleDateString()}! Generated ${schedule.reduce(
          (sum, day) => sum + day.sessions.length,
          0
        )} training sessions for ${schedule.reduce(
          (sum, day) =>
            sum +
            day.sessions.reduce(
              (daySum, session) => daySum + session.agents.length,
              0
            ),
          0
        )} agents.`,
      });

      // Reset file input
      event.target.value = "";

      // Notify parent
      setTimeout(() => {
        onUploadComplete?.();
      }, 2000);
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Failed to process and save data",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmUpdate() {
    if (!pendingSchedule) return;

    setShowUpdateConfirm(false);
    setIsProcessing(true);
    setStatus({ type: "info", message: "Updating existing schedule..." });

    try {
      const { schedule, weekDate, stats, agentsWithRecommendations } =
        pendingSchedule;

      // Save with update flag
      const saveResult = await saveTrainingSchedule(
        schedule,
        weekDate,
        stats.avgCAPScore,
        stats.avgAdjustedCAPScore,
        {
          totalAgents: stats.totalAgents,
          excludedCount: stats.excludedCount,
          eligibleCount: stats.eligibleCount,
        },
        true // updateExisting
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      // Save CAP history
      await saveCAPScoreHistory(agentsWithRecommendations, weekDate);

      setStatus({
        type: "success",
        message: `Successfully updated schedule for week of ${weekDate.toLocaleDateString()}!`,
      });

      setPendingSchedule(null);
      setTimeout(() => {
        onUploadComplete?.();
      }, 2000);
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Failed to update schedule",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload New Weekly Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>📋 What happens when you upload:</strong>
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>✓ File is parsed and metrics calculated</li>
            <li>✓ Training schedule is automatically generated</li>
            <li>✓ Schedule is saved to database immediately</li>
            <li>✓ Agent performance history is recorded</li>
            <li>✓ No manual "Save" button needed!</li>
          </ul>
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
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">
            This will be saved as the schedule for this week
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label
            htmlFor="weekly-upload"
            className={`block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              isProcessing
                ? "bg-gray-50 border-gray-300 cursor-not-allowed"
                : "hover:bg-gray-50 border-gray-300 hover:border-blue-400"
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <p className="text-gray-600">Processing...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop TSV file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    CAP performance report with Leads Per Day column
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={isProcessing}>
                  Choose File
                </Button>
              </div>
            )}
            <input
              id="weekly-upload"
              type="file"
              accept=".tsv,.csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
          </label>
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
                  Would you like to replace the existing schedule? This will
                  delete the old schedule and its attendance records.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConfirmUpdate}
                    className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                  >
                    Yes, Update Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowUpdateConfirm(false);
                      setPendingSchedule(null);
                      setStatus(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status && !showUpdateConfirm && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              status.type === "success"
                ? "bg-green-50 border border-green-200"
                : status.type === "error"
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : status.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
            )}
            <p
              className={
                status.type === "success"
                  ? "text-green-800"
                  : status.type === "error"
                  ? "text-red-800"
                  : "text-blue-800"
              }
            >
              {status.message}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">
            📈 After uploading, you can:
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• View the generated schedule in "Saved Schedules"</li>
            <li>• Mark attendance as training happens</li>
            <li>• See week-over-week improvements in Analytics</li>
            <li>• Compare this week's CAP scores to previous weeks</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}
