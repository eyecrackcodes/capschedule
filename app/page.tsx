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
import {
  calculateStats,
  createCohorts,
  getTrainingEligibleAgents,
  calculateMetricPercentiles,
  assignTrainingRecommendations,
} from "@/lib/business-logic";
import { generateSchedule } from "@/lib/schedule-generator-v2";
import {
  exportToCSV,
  exportToPDF,
  exportEmailFormat,
  copyEmailToClipboard,
} from "@/lib/export-utils";
import { AppState, Filters, ParseResult } from "@/types";

export default function HomePage() {
  const [activeView, setActiveView] = useState<
    "calendar" | "location" | "manager"
  >("calendar");
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
    console.log("50th Percentiles:", {
      closeRate: percentiles.closeRate50th,
      annualPremium: percentiles.annualPremium50th,
      placeRate: percentiles.placeRate50th,
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
    exportToPDF(appState.schedule);
  };

  const handleExportCSV = () => {
    exportToCSV(appState.schedule);
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

  const hasData = appState.eligibleAgents.length > 0;

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

        {/* File Upload */}
        {!hasData && (
          <div className="mb-8">
            <FileUpload onFileProcessed={handleFileProcessed} />
          </div>
        )}

        {/* Dashboard */}
        {hasData && (
          <ErrorBoundary>
            <div className="space-y-8">
              {/* Stats Dashboard */}
              <StatsDashboard
                stats={appState.stats}
                percentiles={appState.percentiles}
              />

              {/* Time Zone Information */}
              <TimeZoneDisplay />

              {/* Cohort Size Summary */}
              {appState.schedule.length > 0 && (
                <CohortSizeSummary schedule={appState.schedule} />
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
