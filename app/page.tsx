"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { StatsDashboard } from "@/components/stats-dashboard";
import { ScheduleDisplay } from "@/components/schedule-display";
import { ExportControls } from "@/components/export-controls";
import { ErrorBoundary } from "@/components/error-boundary";
import { EdgeCaseHandler } from "@/components/edge-case-handler";
import { LocationScheduleView } from "@/components/location-schedule-view";
import { ManagerAgentView } from "@/components/manager-agent-view";
import { TimeZoneDisplay } from "@/components/time-zone-display";
import { CohortSizeSummary } from "@/components/cohort-size-summary";
import { ScheduleConstraints } from "@/components/schedule-constraints";
import { PhoneOutageForecast } from "@/components/phone-outage-forecast";
import { SaveScheduleDialog } from "@/components/database/save-schedule-dialog";
import { SavedSchedulesView } from "@/components/database/saved-schedules-view";
import { AttendanceTrackerEnhanced } from "@/components/database/attendance-tracker-enhanced";
import { AnalyticsDashboard } from "@/components/database/analytics-dashboard";
import { AgentPerformanceTrends } from "@/components/database/agent-performance-trends";
import { WeeklyDataUploader } from "@/components/database/weekly-data-uploader";
import {
  calculateStats,
  createCohorts,
  getTrainingEligibleAgents,
  calculateMetricPercentiles,
  assignTrainingRecommendations,
} from "@/lib/business-logic";
import {
  generateSchedule,
  validateSchedule,
} from "@/lib/schedule-generator-v4"; // Using v4 with conflict prevention and Friday overfill
import {
  exportToCSV,
  exportToPDF,
  exportEmailFormat,
  copyEmailToClipboard,
} from "@/lib/export-utils";
import { AppState, Filters, DaySchedule, TrainingSession, AgentRecord } from "@/types";
import { ParseResult } from "@/lib/file-parser";
import { getTrainingSchedules, getScheduleById } from "@/lib/database";
import { useEffect } from "react";

export default function HomePage() {
  const [activeView, setActiveView] = useState<
    "calendar" | "location" | "manager" | "database"
  >("calendar");
  const [databaseView, setDatabaseView] = useState<
    "upload" | "save" | "history" | "attendance" | "analytics" | "trends"
  >("upload");
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true);
  const [appState, setAppState] = useState<AppState>({
    file: null,
    rawData: [],
    eligibleAgents: [],
    stats: {
      totalAgents: 0,
      eligibleCount: 0,
      excludedCount: 0,
      avgCAPScore: 0,
      needsTraining: 0,
      clt: { performance: 0, standard: 0, total: 0 },
      atx: { performance: 0, standard: 0, total: 0 },
    },
    cohorts: {
      cltPerformance: [],
      cltStandard: [],
      atxPerformance: [],
      atxStandard: [],
    },
    schedule: [],
    filters: {
      location: "all",
      tier: "all",
    },
  });
  
  const [loadedWeekOf, setLoadedWeekOf] = useState<string | undefined>();

  // Load latest schedule from database on mount
  useEffect(() => {
    loadLatestSchedule();
  }, []);

  async function loadLatestSchedule() {
    setIsLoadingFromDB(true);
    
    try {
      console.log("🔍 Attempting to load schedule from database...");
      
      const schedulesResult = await getTrainingSchedules();
      
      console.log("📊 Schedules query result:", schedulesResult);
      
      if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
        console.log(`✅ Found ${schedulesResult.data.length} schedules in database`);
        
        // Get the most recent schedule
        const latestSchedule = schedulesResult.data[0];
        console.log("📅 Loading latest schedule:", latestSchedule.week_of);
        
        // Load full schedule details
        const detailsResult = await getScheduleById(latestSchedule.id);
        
        console.log("📋 Schedule details result:", detailsResult);
        
        if (detailsResult.success && detailsResult.data) {
          // Convert database format to app format
          const dbSchedule = convertDatabaseScheduleToAppFormat(detailsResult.data);
          
          if (dbSchedule) {
            console.log("✨ Successfully loaded schedule with", dbSchedule.schedule.length, "days");
            setAppState((prev) => ({
              ...prev,
              schedule: dbSchedule.schedule,
              stats: dbSchedule.stats,
            }));
            setLoadedWeekOf(dbSchedule.weekOf);
          } else {
            console.warn("⚠️ Failed to convert database schedule to app format");
          }
        } else {
          console.warn("⚠️ Failed to load schedule details:", detailsResult.error);
        }
      } else {
        console.log("📭 No schedules found in database - showing file upload");
      }
    } catch (error) {
      console.error("❌ Error loading schedule from database:", error);
    } finally {
      setIsLoadingFromDB(false);
    }
  }

  function convertDatabaseScheduleToAppFormat(data: any): { schedule: DaySchedule[], stats: any, weekOf?: string } | null {
    try {
      const { schedule: scheduleData, sessions } = data;
      
      // Collect all unique agents from all sessions
      const allAgents: AgentRecord[] = [];
      const agentMap = new Map<string, AgentRecord>();
      
      // Group sessions by day
      const dayMap = new Map<string, TrainingSession[]>();
      
      sessions.forEach((session: any) => {
        if (!dayMap.has(session.day)) {
          dayMap.set(session.day, []);
        }
        
        const agents = session.agent_assignments.map((a: any) => {
          const agent: AgentRecord = {
            name: a.agent_name,
            manager: a.manager,
            site: a.site,
            tier: a.tier_code,
            capScore: a.original_cap_score,
            adjustedCAPScore: a.adjusted_cap_score,
            leadsPerDay: a.leads_per_day,
            leadAttainment: a.lead_attainment,
            tenure: a.tenure,
            closeRate: a.close_rate,
            annualPremium: a.annual_premium,
            placeRate: a.place_rate,
            recommendedTraining: a.recommended_training,
            wowDelta: 0,
            priorRank: 0,
            currentRank: 0,
          };
          
          // Store unique agents
          if (!agentMap.has(agent.name)) {
            agentMap.set(agent.name, agent);
            allAgents.push(agent);
          }
          
          return agent;
        });
        
        const trainingSession: TrainingSession = {
          time: session.time_slot,
          location: session.location,
          tier: session.tier as any,
          agents: agents,
          priority: session.priority,
          cohortNumber: session.cohort_number,
        };
        
        dayMap.get(session.day)!.push(trainingSession);
      });
      
      // Convert to DaySchedule array
      const schedule: DaySchedule[] = Array.from(dayMap.entries()).map(([day, sessions]) => ({
        day,
        sessions,
      }));
      
      // Sort by day order
      const dayOrder = ["Tuesday", "Wednesday", "Thursday", "Friday"];
      schedule.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
      
      // Calculate stats from actual loaded agents
      console.log("📊 Calculating stats from", allAgents.length, "unique agents");
      console.log("Sample agents:", allAgents.slice(0, 3).map(a => ({ name: a.name, site: a.site, tier: a.tier })));
      
      const cltAgents = allAgents.filter((a) => a.site === "CHA");
      const atxAgents = allAgents.filter((a) => a.site === "AUS");
      
      console.log("CLT agents:", cltAgents.length, "ATX agents:", atxAgents.length);
      
      // Extract full dataset info from metadata if available
      const metadata = scheduleData.metadata || {};
      const totalCompanyAgents = metadata.total_company_agents || allAgents.length;
      const excludedCount = metadata.excluded_by_tenure || 0;
      const eligibleCount = metadata.eligible_agents || allAgents.length;
      
      const stats = {
        totalAgents: totalCompanyAgents, // Full company count from metadata
        eligibleCount: eligibleCount, // Eligible after tenure filter
        excludedCount: excludedCount, // Excluded by tenure
        avgCAPScore: scheduleData.avg_adjusted_cap_score,
        needsTraining: allAgents.length, // Agents scheduled for training
        clt: {
          performance: cltAgents.filter((a) => a.tier === "P").length,
          standard: cltAgents.filter((a) => a.tier === "S").length,
          total: cltAgents.length,
        },
        atx: {
          performance: atxAgents.filter((a) => a.tier === "P").length,
          standard: atxAgents.filter((a) => a.tier === "S").length,
          total: atxAgents.length,
        },
      };
      
      console.log("Final stats:", stats);
      
      return { schedule, stats, weekOf: scheduleData.week_of };
    } catch (error) {
      console.error("Error converting database schedule:", error);
      return null;
    }
  }

  const handleFileProcessed = (result: ParseResult) => {
    if (!result.success || !result.data) {
      alert(result.error || "Failed to process file");
      return;
    }

    const eligibleAgents = result.data;
    const stats = calculateStats(eligibleAgents);

    // Update excluded count from parsing stats
    if (result.stats) {
      stats.excludedCount = result.stats.excludedByTenure;
    }

    // Calculate metric percentiles and assign training recommendations
    const percentiles = calculateMetricPercentiles(eligibleAgents);
    const agentsWithRecommendations = assignTrainingRecommendations(
      eligibleAgents,
      percentiles
    );

    // Log percentiles for debugging
    console.log("25th Percentiles (Bottom Quartile):", {
      performance: {
        closeRate: percentiles.performance.closeRate50th,
        annualPremium: percentiles.performance.annualPremium50th,
        placeRate: percentiles.performance.placeRate50th,
      },
      standard: {
        closeRate: percentiles.standard.closeRate50th,
        annualPremium: percentiles.standard.annualPremium50th,
        placeRate: percentiles.standard.placeRate50th,
      },
    });

    // Debug: Check how many agents need Place Rate training
    const placeRateTrainingCount = agentsWithRecommendations.filter((agent) =>
      agent.recommendedTraining?.includes("Place Rate Training")
    ).length;

    const placeRateATX = agentsWithRecommendations.filter(
      (agent) =>
        agent.site === "AUS" &&
        agent.recommendedTraining?.includes("Place Rate Training")
    ).length;

    const placeRateCLT = agentsWithRecommendations.filter(
      (agent) =>
        agent.site === "CHA" &&
        agent.recommendedTraining?.includes("Place Rate Training")
    ).length;

    console.log(
      `Agents needing Place Rate Training: Total=${placeRateTrainingCount}, CLT=${placeRateCLT}, ATX=${placeRateATX}`
    );

    const cohorts = createCohorts(agentsWithRecommendations);
    const schedule = generateSchedule(cohorts, stats.avgCAPScore);

    // Validate the generated schedule
    const validation = validateSchedule(schedule);
    if (validation.warnings.length > 0) {
      console.log("Schedule warnings:", validation.warnings);
    }
    if (validation.errors.length > 0) {
      console.error("Schedule errors:", validation.errors);
    }

    setAppState((prev) => ({
      ...prev,
      eligibleAgents: agentsWithRecommendations,
      stats,
      cohorts,
      schedule,
      percentiles, // Add this
    }));
  };

  const handleFiltersChange = (filters: Filters) => {
    setAppState((prev) => ({
      ...prev,
      filters,
    }));
  };

  const handleExportPDF = () => {
    exportToPDF(appState.schedule, appState.filters, loadedWeekOf);
  };

  const handleExportCSV = () => {
    exportToCSV(appState.schedule, appState.filters, loadedWeekOf);
  };

  const handleExportManager = () => {
    const managerName = prompt("Enter manager name to filter by:");
    if (managerName) {
      // This would need to be implemented in export-utils
      alert(`Manager view export for ${managerName} - Feature coming soon!`);
    }
  };

  const handleExportEmail = () => {
    copyEmailToClipboard(appState.schedule);
  };

  // Check if we have data from either file upload OR database
  const hasData = appState.eligibleAgents.length > 0 || appState.schedule.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            CAP Training Schedule Generator
          </h1>
          <p className="text-lg text-gray-600">
            Upload your weekly CAP performance report to generate optimized
            training schedules
          </p>
        </div>

        {/* File Upload - Only show if no data AND not loading from DB */}
        {!hasData && !isLoadingFromDB && (
          <div className="mb-8">
            <FileUpload onFileProcessed={handleFileProcessed} />
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                Or go to{" "}
                <button
                  onClick={() => setActiveView("database")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Database & Analytics
                </button>{" "}
                to upload weekly data
              </p>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isLoadingFromDB && (
          <div className="mb-8 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading schedule from database...</p>
          </div>
        )}

        {/* Dashboard */}
        {hasData && (
          <ErrorBoundary>
            <div className="space-y-8">
              {/* Stats Dashboard */}
              <StatsDashboard
                stats={appState.stats}
                weekOf={loadedWeekOf}
                percentiles={appState.percentiles}
              />

              {/* Time Zone Information */}
              <TimeZoneDisplay />

              {/* Schedule Constraints */}
              <ScheduleConstraints />

              {/* Cohort Size Summary */}
              {appState.schedule.length > 0 && (
                <CohortSizeSummary schedule={appState.schedule} />
              )}

              {/* Phone Outage Forecast for Marketing */}
              {appState.schedule.length > 0 && (
                <PhoneOutageForecast schedule={appState.schedule} />
              )}

              {/* Edge Case Handler */}
              <EdgeCaseHandler
                stats={appState.stats}
                schedule={appState.schedule}
              />

              {/* Export Controls */}
              <ExportControls
                schedule={appState.schedule}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportManager={handleExportManager}
                onExportEmail={handleExportEmail}
              />

              {/* View Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView("calendar")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === "calendar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Calendar View
                </button>
                <button
                  onClick={() => setActiveView("location")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === "location"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Location Separation
                </button>
                <button
                  onClick={() => setActiveView("manager")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === "manager"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Manager View
                </button>
                <button
                  onClick={() => setActiveView("database")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === "database"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Database & Analytics
                </button>
              </div>

              {/* Schedule Display */}
              {activeView === "calendar" && (
                <ScheduleDisplay
                  schedule={appState.schedule}
                  filters={appState.filters}
                  onFiltersChange={handleFiltersChange}
                  avgCAPScore={appState.stats.avgCAPScore}
                />
              )}

              {activeView === "location" && (
                <LocationScheduleView schedule={appState.schedule} />
              )}

              {activeView === "manager" && (
                <ManagerAgentView
                  schedule={appState.schedule}
                  avgCAPScore={appState.stats.avgCAPScore}
                />
              )}

              {activeView === "database" && (
                <div className="space-y-6">
                  {/* Database Sub-Tabs */}
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setDatabaseView("upload")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "upload"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Upload New Week
                    </button>
                    <button
                      onClick={() => setDatabaseView("save")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "save"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Save Current
                    </button>
                    <button
                      onClick={() => setDatabaseView("history")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "history"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Saved Schedules
                    </button>
                    <button
                      onClick={() => setDatabaseView("attendance")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "attendance"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => setDatabaseView("analytics")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "analytics"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Analytics
                    </button>
                    <button
                      onClick={() => setDatabaseView("trends")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        databaseView === "trends"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Performance Trends
                    </button>
                  </div>

                  {/* Upload New Week View */}
                  {databaseView === "upload" && (
                    <WeeklyDataUploader
                      onUploadComplete={() => {
                        setDatabaseView("history");
                      }}
                    />
                  )}

                  {/* Save Schedule View */}
                  {databaseView === "save" && appState.schedule.length > 0 && (
                    <div className="text-center py-12">
                      <SaveScheduleDialog
                        schedule={appState.schedule}
                        avgCAPScore={
                          appState.eligibleAgents.filter((a) => a.capScore > 0)
                            .length > 0
                            ? Math.round(
                                (appState.eligibleAgents
                                  .filter((a) => a.capScore > 0)
                                  .reduce((sum, a) => sum + a.capScore, 0) /
                                  appState.eligibleAgents.filter((a) => a.capScore > 0)
                                    .length) *
                                  10
                              ) / 10
                            : 0
                        }
                        avgAdjustedCAPScore={appState.stats.avgCAPScore}
                        eligibleAgents={appState.eligibleAgents}
                        fullStats={appState.stats}
                        onSaveComplete={() => {
                          alert("Schedule saved successfully!");
                          setDatabaseView("history");
                        }}
                      />
                      <p className="text-gray-500 mt-4">
                        Save this schedule to track attendance and view analytics
                      </p>
                    </div>
                  )}

                  {databaseView === "save" && appState.schedule.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        Generate a schedule first, then you can save it to the database
                      </p>
                    </div>
                  )}

                  {/* Saved Schedules View */}
                  {databaseView === "history" && <SavedSchedulesView />}

                  {/* Attendance Tracking View */}
                  {databaseView === "attendance" && <AttendanceTrackerEnhanced />}

                  {/* Analytics Dashboard View */}
                  {databaseView === "analytics" && <AnalyticsDashboard />}

                  {/* Performance Trends View */}
                  {databaseView === "trends" && <AgentPerformanceTrends />}
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* Implementation Tips */}
        {hasData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Implementation Tips & Notes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Coordinate with managers before sessions</li>
              <li>• Keep training discrete (call it "coaching")</li>
              <li>• Track attendance and reschedule no-shows</li>
              <li>
                • Each agent receives 1 hour/day training until improvement
              </li>
              <li>• Never schedule both locations simultaneously</li>
              <li>• Avoid lunch hour (12-1 PM) and peak times</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            CAP Training Schedule Generator - Optimizing agent performance
            through data-driven training
          </p>
        </div>
      </div>
    </div>
  );
}
