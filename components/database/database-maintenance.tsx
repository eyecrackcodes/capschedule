"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeEmptySchedules, getScheduleHealthCheck } from "@/lib/database-cleanup";
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Trash2,
  RefreshCw,
  Info 
} from "lucide-react";

interface HealthCheckResult {
  week_of: string;
  total_agents_scheduled: number;
  actual_sessions: number;
  actual_assignments: number;
  status: "HEALTHY" | "EMPTY" | "NO_AGENTS" | "MISMATCH";
}

export function DatabaseMaintenance() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthCheckResult[]>([]);
  const [maintenanceLog, setMaintenanceLog] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  async function runHealthCheck() {
    setIsLoading(true);
    setMaintenanceLog([]);
    
    try {
      addLog("🔍 Running database health check...");
      const result = await getScheduleHealthCheck();
      
      if (result.success) {
        setHealthReport(result.report || []);
        addLog(`✅ Found ${result.totalSchedules} schedules`);
        addLog(`✨ ${result.healthySchedules} healthy schedules`);
        
        if (result.issues && result.issues.length > 0) {
          addLog(`⚠️ ${result.issues.length} schedules with issues`);
        }
      } else {
        addLog(`❌ Health check failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function cleanupEmptySchedules() {
    setIsLoading(true);
    
    try {
      addLog("🧹 Starting cleanup of empty schedules...");
      const result = await removeEmptySchedules();
      
      if (result.success) {
        if (result.deletedCount === 0) {
          addLog("✅ No empty schedules found - database is clean!");
        } else {
          addLog(`🗑️ Removed ${result.deletedCount} empty schedules`);
          if (result.deletedSchedules) {
            result.deletedSchedules.forEach(week => {
              addLog(`   - Week of ${new Date(week).toLocaleDateString()}`);
            });
          }
        }
        // Refresh health check
        await runHealthCheck();
      } else {
        addLog(`❌ Cleanup failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function addLog(message: string) {
    setMaintenanceLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "HEALTHY":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case "EMPTY":
        return <Badge className="bg-red-100 text-red-800">Empty</Badge>;
      case "NO_AGENTS":
        return <Badge className="bg-amber-100 text-amber-800">No Agents</Badge>;
      case "MISMATCH":
        return <Badge className="bg-orange-100 text-orange-800">Mismatch</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Database Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  About Database Maintenance
                </p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Health Check: Identifies schedules with missing sessions or data mismatches</li>
                  <li>• Cleanup: Removes empty schedules that may have been created due to errors</li>
                  <li>• Safe to run anytime - only removes truly empty schedules</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={runHealthCheck}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Health Check
            </Button>
            <Button
              onClick={cleanupEmptySchedules}
              disabled={isLoading || healthReport.filter(r => r.status === "EMPTY").length === 0}
              variant="destructive"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clean Empty Schedules
            </Button>
          </div>

          {/* Health Report */}
          {healthReport.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Schedule Health Report</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Hide" : "Show"} Details
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-2">
                  {healthReport.map((schedule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          Week of {new Date(schedule.week_of).toLocaleDateString()}
                        </span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="text-xs text-gray-600 space-x-4">
                        <span>Sessions: {schedule.actual_sessions}</span>
                        <span>Agents: {schedule.actual_assignments}</span>
                        <span>Expected: {schedule.total_agents_scheduled}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {healthReport.filter(r => r.status === "HEALTHY").length}
                  </p>
                  <p className="text-xs text-gray-600">Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {healthReport.filter(r => r.status === "EMPTY").length}
                  </p>
                  <p className="text-xs text-gray-600">Empty</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {healthReport.filter(r => r.status === "NO_AGENTS").length}
                  </p>
                  <p className="text-xs text-gray-600">No Agents</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {healthReport.filter(r => r.status === "MISMATCH").length}
                  </p>
                  <p className="text-xs text-gray-600">Mismatch</p>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Log */}
          {maintenanceLog.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Maintenance Log</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                {maintenanceLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
