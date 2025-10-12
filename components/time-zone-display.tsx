"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe } from "lucide-react";

export function TimeZoneDisplay() {
  return (
    <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Time Zone Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">Charlotte (CLT)</h3>
              <Badge className="bg-blue-100 text-blue-800">EST</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Operating Hours: 9:30 AM - 6:00 PM EST</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Training sessions scheduled during local business hours
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-900">Austin (ATX)</h3>
              <Badge className="bg-green-100 text-green-800">CST</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Operating Hours: 8:30 AM - 5:00 PM CST</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Training sessions scheduled during local business hours
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Important Notes:
          </p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• CLT is 1 hour ahead of ATX (EST vs CST)</li>
            <li>
              • All training times are shown in both time zones for clarity
            </li>
            <li>
              • Lunch hours avoided: 12:00-1:00 PM in each location's local time
            </li>
            <li>
              • Sessions never overlap between locations to ensure proper
              coverage
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
