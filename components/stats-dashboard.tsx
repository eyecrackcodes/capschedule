"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stats } from "@/types";

interface StatsDashboardProps {
  stats: Stats;
  weekOf?: string; // Optional week date for context
  percentiles?: {
    performance: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
    standard: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
  };
}

export function StatsDashboard({ stats, weekOf, percentiles }: StatsDashboardProps) {
  const getCAPScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrainingPercentage = () => {
    if (stats.totalAgents === 0) return 0;
    return Math.round((stats.needsTraining / stats.totalAgents) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Week Context Banner */}
      {weekOf && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900">
            📅 Viewing Schedule for Week of {new Date(weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            All metrics below are specific to this week's scheduled training sessions
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stats.excludedCount > 0 ? "Total Agents" : "Agents in Training"}
            </CardTitle>
            <Badge variant="info">{stats.totalAgents}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.excludedCount > 0 
                ? "Eligible for analysis" 
                : "Scheduled this week"}
            </p>
          </CardContent>
        </Card>

        {/* Average Raw CAP Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CAP Score</CardTitle>
            <Badge variant="secondary">{stats.avgCAPScore}</Badge>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getCAPScoreColor(
                stats.avgCAPScore
              )}`}
            >
              {stats.avgCAPScore}
            </div>
            <p className="text-xs text-muted-foreground">Raw CAP Score</p>
          </CardContent>
        </Card>

        {/* Average Adjusted CAP Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Adjusted CAP</CardTitle>
            <Badge variant="secondary">{stats.avgAdjustedCAPScore}</Badge>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getCAPScoreColor(
                stats.avgAdjustedCAPScore
              )}`}
            >
              {stats.avgAdjustedCAPScore}
            </div>
            <p className="text-xs text-muted-foreground">With Lead Attainment</p>
          </CardContent>
        </Card>

        {/* Training Needed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stats.excludedCount > 0 ? "Need Training" : "Scheduled"}
            </CardTitle>
            <Badge variant="warning">{stats.needsTraining}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.needsTraining}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.excludedCount > 0 
                ? `${getTrainingPercentage()}% of eligible agents`
                : "Below company average"}
            </p>
          </CardContent>
        </Card>

        {/* Excluded Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excluded</CardTitle>
            <Badge variant="outline">{stats.excludedCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.excludedCount}
            </div>
            <p className="text-xs text-muted-foreground">Tenure ≤ 1.9 years</p>
          </CardContent>
        </Card>
      </div>

      {/* Location Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CLT Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Badge variant="info">CLT</Badge>
              <span>Charlotte</span>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Agents scheduled for training {weekOf ? 'this week' : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Performance Tier
              </span>
              <Badge variant="default">{stats.clt.performance}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Standard Tier
              </span>
              <Badge variant="secondary">{stats.clt.standard}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total</span>
              <Badge variant="info">{stats.clt.total}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ATX Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Badge variant="success">ATX</Badge>
              <span>Austin</span>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Agents scheduled for training {weekOf ? 'this week' : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Performance Tier
              </span>
              <Badge variant="default">{stats.atx.performance}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Standard Tier
              </span>
              <Badge variant="secondary">{stats.atx.standard}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total</span>
              <Badge variant="success">{stats.atx.total}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Percentiles - ALWAYS SHOW with prominence */}
      {percentiles && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">🎯</span>
              25th Percentile Training Thresholds (Bottom Quartile)
            </CardTitle>
            <p className="text-sm text-purple-800 mt-2">
              Only agents below these thresholds receive metric-specific training on Tuesday (Close Rate), Wednesday (Annual Premium), or Thursday (Place Rate)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Performance Tier Benchmarks */}
              <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  Performance Tier (P)
                  <Badge className="bg-purple-600 text-white">Bottom 25%</Badge>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Close Rate Threshold</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {percentiles.performance.closeRate50th.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Tuesday Training</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Annual Premium Threshold</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${percentiles.performance.annualPremium50th.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Wednesday Training</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Place Rate Threshold</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {percentiles.performance.placeRate50th.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Thursday Training</p>
                  </div>
                </div>
              </div>
              
              {/* Standard Tier Benchmarks */}
              <div className="bg-white p-4 rounded-lg border-2 border-orange-300">
                <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                  Standard Tier (S)
                  <Badge className="bg-orange-600 text-white">Bottom 25%</Badge>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Close Rate Threshold</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {percentiles.standard.closeRate50th.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Tuesday Training</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Annual Premium Threshold</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${percentiles.standard.annualPremium50th.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Wednesday Training</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Place Rate Threshold</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {percentiles.standard.placeRate50th.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">→ Thursday Training</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-300">
              <p className="text-xs font-semibold text-purple-900">
                💡 How it works: Agents are eligible for training if their Adjusted CAP is below company average ({stats.avgAdjustedCAPScore}). 
                The specific training day (Tue/Wed/Thu) depends on which metrics they're in the bottom 25% for.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Agents needing training</span>
              <span>
                {stats.needsTraining} / {stats.totalAgents}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getTrainingPercentage()}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">
              {getTrainingPercentage()}% of eligible agents require training
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
