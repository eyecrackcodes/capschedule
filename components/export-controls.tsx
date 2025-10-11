"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Mail, Calendar } from "lucide-react";
import { DaySchedule } from "@/types";

interface ExportControlsProps {
  schedule: DaySchedule[];
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportManager: () => void;
  onExportEmail: () => void;
}

export function ExportControls({
  schedule,
  onExportPDF,
  onExportCSV,
  onExportManager,
  onExportEmail,
}: ExportControlsProps) {
  const totalSessions = schedule.reduce(
    (sum, day) => sum + day.sessions.length,
    0
  );
  const totalAgents = schedule.reduce(
    (sum, day) =>
      sum +
      day.sessions.reduce(
        (daySum, session) => daySum + session.agents.length,
        0
      ),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              Total Sessions:{" "}
              <span className="font-medium">{totalSessions}</span>
            </div>
            <div>
              Total Agents: <span className="font-medium">{totalAgents}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={onExportPDF}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Export PDF</span>
            </Button>

            <Button
              onClick={onExportCSV}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>

            <Button
              onClick={onExportManager}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Manager View</span>
            </Button>

            <Button
              onClick={onExportEmail}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Mail className="h-4 w-4" />
              <span>Email Format</span>
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• PDF: Print-friendly weekly calendar</p>
            <p>• CSV: Detailed data for analysis</p>
            <p>• Manager View: Filtered by manager</p>
            <p>• Email Format: Copy-paste ready text</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
