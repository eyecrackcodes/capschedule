"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Bug,
  Database,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CAPHistoryRecord {
  week_of: string;
  agent_name: string;
  original_cap_score: number;
  adjusted_cap_score: number;
  lead_attainment: number;
  manager: string;
  site: string;
  created_at: string;
}

export function DebugCAPHistory() {
  const [records, setRecords] = useState<CAPHistoryRecord[]>([]);
  const [uniqueWeeks, setUniqueWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCAPHistory();
  }, []);

  async function loadCAPHistory() {
    setLoading(true);
    setError(null);

    try {
      // Get all CAP history records
      const { data, error: fetchError } = await supabase
        .from("cap_score_history")
        .select("*")
        .order("week_of", { ascending: false })
        .order("agent_name");

      if (fetchError) {
        throw fetchError;
      }

      setRecords(data || []);

      // Extract unique weeks
      const weeks = [...new Set(data?.map((r) => r.week_of) || [])]
        .sort()
        .reverse();
      setUniqueWeeks(weeks);

      console.log("=== CAP HISTORY DEBUG ===");
      console.log("Total records:", data?.length || 0);
      console.log("Unique weeks:", weeks);
      console.log("Sample records:", data?.slice(0, 5));
    } catch (err: any) {
      console.error("Error loading CAP history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkDateRangeQuery() {
    setLoading(true);

    try {
      // Test the same query logic as getAgentMetricsTrends
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 12 * 7); // 12 weeks

      console.log("=== DATE RANGE TEST ===");
      console.log("Start date:", startDate.toISOString().split("T")[0]);
      console.log("End date:", endDate.toISOString().split("T")[0]);

      const { data, error } = await supabase
        .from("cap_score_history")
        .select("week_of, COUNT(*)", { count: "exact" })
        .gte("week_of", startDate.toISOString().split("T")[0])
        .lte("week_of", endDate.toISOString().split("T")[0])
        .order("week_of");

      console.log("Date range query result:", data);
      console.log(
        "Weeks in range:",
        data?.map((d) => d.week_of)
      );
    } catch (err: any) {
      console.error("Date range test error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function checkMissingWeeks() {
    setLoading(true);
    try {
      // Get all schedules
      const { data: schedules } = await supabase
        .from("training_schedules")
        .select("week_of")
        .order("week_of", { ascending: true });

      // Get all CAP history weeks
      const { data: capWeeks } = await supabase
        .from("cap_score_history")
        .select("week_of")
        .order("week_of", { ascending: true });

      const scheduleWeeks = [
        ...new Set(schedules?.map((s) => s.week_of) || []),
      ];
      const historyWeeks = [...new Set(capWeeks?.map((c) => c.week_of) || [])];

      const missingWeeks = scheduleWeeks.filter(
        (w) => !historyWeeks.includes(w)
      );

      console.log("=== MISSING WEEKS CHECK ===");
      console.log("Schedule weeks:", scheduleWeeks);
      console.log("CAP history weeks:", historyWeeks);
      console.log("Missing CAP history for weeks:", missingWeeks);

      if (missingWeeks.length > 0) {
        alert(
          `Missing CAP history for weeks: ${missingWeeks.join(
            ", "
          )}. You may need to re-upload the data for these weeks.`
        );
      }
    } catch (err: any) {
      console.error("Missing weeks check error:", err);
    } finally {
      setLoading(false);
    }
  }

  const weekSummary = uniqueWeeks.map((week) => {
    const weekRecords = records.filter((r) => r.week_of === week);
    return {
      week,
      agentCount: weekRecords.length,
      avgOriginalCAP:
        weekRecords.length > 0
          ? Math.round(
              weekRecords.reduce((sum, r) => sum + r.original_cap_score, 0) /
                weekRecords.length
            )
          : 0,
      avgAdjustedCAP:
        weekRecords.length > 0
          ? Math.round(
              weekRecords.reduce((sum, r) => sum + r.adjusted_cap_score, 0) /
                weekRecords.length
            )
          : 0,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            CAP Score History Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={loadCAPHistory}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Data
            </Button>
            <Button
              onClick={checkDateRangeQuery}
              disabled={loading}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Test Date Range Query
            </Button>
            <Button
              onClick={checkMissingWeeks}
              disabled={loading}
              variant="outline"
              className="bg-amber-50 hover:bg-amber-100 border-amber-200"
            >
              <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />
              Check Missing Weeks
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Unique Weeks</p>
              <p className="text-2xl font-bold">{uniqueWeeks.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Date Range</p>
              <p className="text-sm font-medium">
                {uniqueWeeks.length > 0
                  ? `${new Date(
                      uniqueWeeks[uniqueWeeks.length - 1]
                    ).toLocaleDateString()} - ${new Date(
                      uniqueWeeks[0]
                    ).toLocaleDateString()}`
                  : "No data"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Unique Agents</p>
              <p className="text-2xl font-bold">
                {[...new Set(records.map((r) => r.agent_name))].length}
              </p>
            </div>
          </div>

          {/* Week-by-Week Summary */}
          <div>
            <h3 className="font-semibold mb-3">Week-by-Week Summary</h3>
            <div className="space-y-2">
              {weekSummary.map((week) => (
                <div
                  key={week.week}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Week of {new Date(week.week).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {week.week} (raw date value)
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline">{week.agentCount} agents</Badge>
                      <span>Avg CAP: {week.avgOriginalCAP}</span>
                      <span>Avg Adj: {week.avgAdjustedCAP}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Records */}
          <div>
            <h3 className="font-semibold mb-3">Sample Records (First 10)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Week</th>
                    <th className="text-left p-2">Agent</th>
                    <th className="text-left p-2">Manager</th>
                    <th className="text-right p-2">Original CAP</th>
                    <th className="text-right p-2">Adjusted CAP</th>
                    <th className="text-right p-2">Lead Attain</th>
                    <th className="text-left p-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 10).map((record, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">
                        {new Date(record.week_of).toLocaleDateString()}
                      </td>
                      <td className="p-2">{record.agent_name}</td>
                      <td className="p-2">{record.manager}</td>
                      <td className="p-2 text-right">
                        {record.original_cap_score}
                      </td>
                      <td className="p-2 text-right">
                        {record.adjusted_cap_score}
                      </td>
                      <td className="p-2 text-right">
                        {record.lead_attainment?.toFixed(1)}%
                      </td>
                      <td className="p-2 text-xs text-gray-600">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Console Output Note */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Check Browser Console</p>
                <p>
                  Open developer tools (F12) and check the console for detailed
                  debug information about date ranges and query results.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
