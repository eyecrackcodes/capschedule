"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DaySchedule } from "@/types";
import { AlertCircle, CheckCircle, Users } from "lucide-react";

interface CohortSizeSummaryProps {
  schedule: DaySchedule[];
}

export function CohortSizeSummary({ schedule }: CohortSizeSummaryProps) {
  // Calculate cohort size statistics
  const cohortStats = {
    total: 0,
    belowMinimum: 0,
    optimal: 0,
    atMaximum: 0,
    byLocation: {
      CLT: { belowMin: 0, optimal: 0, atMax: 0 },
      ATX: { belowMin: 0, optimal: 0, atMax: 0 },
    }
  };

  schedule.forEach((day) => {
    day.sessions.forEach((session) => {
      cohortStats.total++;
      
      const size = session.agents.length;
      const location = session.location;
      
      if (size < 2) {
        cohortStats.belowMinimum++;
        cohortStats.byLocation[location].belowMin++;
      } else if (size === 3) {
        cohortStats.atMaximum++;
        cohortStats.byLocation[location].atMax++;
      } else {
        cohortStats.optimal++;
        cohortStats.byLocation[location].optimal++;
      }
    });
  });

  const hasIssues = cohortStats.belowMinimum > 0;

  return (
    <Card className={hasIssues ? "border-yellow-200 bg-yellow-50" : ""}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cohort Size Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Cohorts</p>
            <p className="text-2xl font-bold">{cohortStats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Optimal Size (2-4)</p>
            <p className="text-2xl font-bold text-green-600">{cohortStats.optimal}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">At Maximum (3)</p>
            <p className="text-2xl font-bold text-blue-600">{cohortStats.atMaximum}</p>
          </div>
        </div>

        {cohortStats.belowMinimum > 0 && (
          <div className="mb-4 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-700" />
              <p className="font-semibold text-yellow-800">
                {cohortStats.belowMinimum} cohort{cohortStats.belowMinimum !== 1 ? 's' : ''} below minimum size
              </p>
            </div>
            <p className="text-sm text-yellow-700">
              Classes with fewer than 2 agents may need to be combined or postponed.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Charlotte (CLT)</h4>
            <div className="flex gap-2">
              {cohortStats.byLocation.CLT.belowMin > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {cohortStats.byLocation.CLT.belowMin} Below Min
                </Badge>
              )}
              {cohortStats.byLocation.CLT.optimal > 0 && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {cohortStats.byLocation.CLT.optimal} Optimal
                </Badge>
              )}
              {cohortStats.byLocation.CLT.atMax > 0 && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {cohortStats.byLocation.CLT.atMax} At Max
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Austin (ATX)</h4>
            <div className="flex gap-2">
              {cohortStats.byLocation.ATX.belowMin > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {cohortStats.byLocation.ATX.belowMin} Below Min
                </Badge>
              )}
              {cohortStats.byLocation.ATX.optimal > 0 && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {cohortStats.byLocation.ATX.optimal} Optimal
                </Badge>
              )}
              {cohortStats.byLocation.ATX.atMax > 0 && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {cohortStats.byLocation.ATX.atMax} At Max
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-1">Cohort Size Guidelines:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Minimum:</strong> 2 agents per class (ensures peer interaction)</li>
            <li>• <strong>Maximum:</strong> 3 agents per class (intimate, personalized coaching)</li>
            <li>• <strong>Optimal:</strong> 2-3 agents (best balance of interaction and focus)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
