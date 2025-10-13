"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stats } from "@/types";

interface StatsDashboardProps {
  stats: Stats;
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

export function StatsDashboard({ stats, percentiles }: StatsDashboardProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Badge variant="info">{stats.totalAgents}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              Eligible for analysis
            </p>
          </CardContent>
        </Card>

        {/* Average CAP Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CAP Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Adjusted (with leads)</p>
                <div
                  className={`text-2xl font-bold ${getCAPScoreColor(
                    stats.avgCAPScore
                  )}`}
                >
                  {stats.avgCAPScore || 'N/A'}
                </div>
              </div>
              {percentiles && (
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-600">Check console for debug info</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training Needed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Training</CardTitle>
            <Badge variant="warning">{stats.needsTraining}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.needsTraining}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTrainingPercentage()}% of eligible agents
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

      {/* Metric Percentiles */}
      {percentiles && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              50th Percentile Benchmarks by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Performance Tier Benchmarks */}
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">Performance Tier</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Close Rate</p>
                    <p className="text-xl font-bold text-blue-600">
                      {percentiles.performance.closeRate50th.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Annual Premium</p>
                    <p className="text-xl font-bold text-green-600">
                      ${percentiles.performance.annualPremium50th.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Place Rate</p>
                    <p className="text-xl font-bold text-purple-600">
                      {percentiles.performance.placeRate50th.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Standard Tier Benchmarks */}
              <div>
                <h4 className="font-semibold text-orange-700 mb-2">Standard Tier</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Close Rate</p>
                    <p className="text-xl font-bold text-blue-600">
                      {percentiles.standard.closeRate50th.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Annual Premium</p>
                    <p className="text-xl font-bold text-green-600">
                      ${percentiles.standard.annualPremium50th.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Place Rate</p>
                    <p className="text-xl font-bold text-purple-600">
                      {percentiles.standard.placeRate50th.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Agents below their tier's benchmarks receive metric-specific training
            </p>
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
