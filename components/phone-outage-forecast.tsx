import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DaySchedule } from "@/types";
import { Phone, TrendingDown, Clock, AlertTriangle } from "lucide-react";

interface PhoneOutageForecastProps {
  schedule: DaySchedule[];
}

interface HourlyOutage {
  hour: string; // CST time
  day: string;
  atxPerformance: number;
  atxStandard: number;
  cltPerformance: number;
  cltStandard: number;
  totalAgents: number;
}

export function PhoneOutageForecast({ schedule }: PhoneOutageForecastProps) {
  // Convert schedule to hourly outage data
  const hourlyOutages: HourlyOutage[] = [];

  schedule.forEach((day) => {
    // Group by time slots
    const timeSlotMap = new Map<string, HourlyOutage>();

    day.sessions.forEach((session) => {
      // Extract CST time from the combined time string
      const cstMatch = session.time.match(
        /(\d{1,2}:\d{2}-\d{1,2}:\d{2} (?:AM|PM) CST)/
      );
      const cstTime = cstMatch ? cstMatch[1] : session.time;

      if (!timeSlotMap.has(cstTime)) {
        timeSlotMap.set(cstTime, {
          hour: cstTime,
          day: day.day,
          atxPerformance: 0,
          atxStandard: 0,
          cltPerformance: 0,
          cltStandard: 0,
          totalAgents: 0,
        });
      }

      const outage = timeSlotMap.get(cstTime)!;

      // Count agents by location and tier
      if (session.location === "ATX") {
        if (session.tier === "Performance") {
          outage.atxPerformance += session.agents.length;
        } else if (session.tier === "Standard") {
          outage.atxStandard += session.agents.length;
        }
      } else if (session.location === "CLT") {
        if (session.tier === "Performance") {
          outage.cltPerformance += session.agents.length;
        } else if (session.tier === "Standard") {
          outage.cltStandard += session.agents.length;
        }
      }

      outage.totalAgents += session.agents.length;
    });

    // Add to hourly outages
    timeSlotMap.forEach((outage) => {
      hourlyOutages.push(outage);
    });
  });

  // Sort by day and time
  const dayOrder = ["Tuesday", "Wednesday", "Thursday", "Friday"];
  hourlyOutages.sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;

    // Sort by time within the same day
    const aHour = parseInt(a.hour.split(":")[0]);
    const bHour = parseInt(b.hour.split(":")[0]);
    return aHour - bHour;
  });

  // Calculate weekly summary
  const weeklySummary = {
    totalHours: hourlyOutages.length,
    totalAgentHours: hourlyOutages.reduce((sum, o) => sum + o.totalAgents, 0),
    peakOutage: Math.max(...hourlyOutages.map((o) => o.totalAgents)),
    avgPerHour: 0,
  };
  weeklySummary.avgPerHour =
    Math.round(
      (weeklySummary.totalAgentHours / weeklySummary.totalHours) * 10
    ) / 10;

  // Identify peak hours
  const peakHours = hourlyOutages.filter(
    (o) => o.totalAgents === weeklySummary.peakOutage
  );

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-red-600" />
          Phone Outage Forecast - Weekly Training Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Summary */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Weekly Summary (All Times in CST)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-red-600 font-medium">Total Agent Hours</p>
              <p className="text-2xl font-bold text-red-800">
                {weeklySummary.totalAgentHours}
              </p>
            </div>
            <div>
              <p className="text-red-600 font-medium">Avg Agents/Hour</p>
              <p className="text-2xl font-bold text-red-800">
                {weeklySummary.avgPerHour}
              </p>
            </div>
            <div>
              <p className="text-red-600 font-medium">Peak Outage</p>
              <p className="text-2xl font-bold text-red-800">
                {weeklySummary.peakOutage}
              </p>
              <p className="text-xs text-red-600">agents off phones</p>
            </div>
            <div>
              <p className="text-red-600 font-medium">Training Hours</p>
              <p className="text-2xl font-bold text-red-800">
                {weeklySummary.totalHours}
              </p>
              <p className="text-xs text-red-600">across the week</p>
            </div>
          </div>
        </div>

        {/* Peak Hour Warning */}
        {peakHours.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Peak Outage Times
            </h4>
            <div className="space-y-1">
              {peakHours.map((peak, idx) => (
                <p key={idx} className="text-sm text-orange-700">
                  <strong>{peak.day}</strong> at {peak.hour}:{" "}
                  <Badge variant="destructive">{peak.totalAgents} agents</Badge>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Hourly Breakdown */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hourly Breakdown by Day (CST)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Day</th>
                  <th className="text-left py-2 px-2">Time (CST)</th>
                  <th className="text-center py-2 px-2" colSpan={2}>
                    <div className="text-green-700">ATX</div>
                  </th>
                  <th className="text-center py-2 px-2" colSpan={2}>
                    <div className="text-blue-700">CLT</div>
                  </th>
                  <th className="text-center py-2 px-2">Total</th>
                </tr>
                <tr className="border-b text-xs text-gray-600">
                  <th></th>
                  <th></th>
                  <th className="text-center py-1 px-1">Perf</th>
                  <th className="text-center py-1 px-1">Std</th>
                  <th className="text-center py-1 px-1">Perf</th>
                  <th className="text-center py-1 px-1">Std</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hourlyOutages.map((outage, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="py-2 px-2 font-medium">{outage.day}</td>
                    <td className="py-2 px-2">{outage.hour}</td>
                    <td className="text-center py-2 px-2">
                      {outage.atxPerformance > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800"
                        >
                          {outage.atxPerformance}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">
                      {outage.atxStandard > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800"
                        >
                          {outage.atxStandard}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">
                      {outage.cltPerformance > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800"
                        >
                          {outage.cltPerformance}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">
                      {outage.cltStandard > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800"
                        >
                          {outage.cltStandard}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">
                      <Badge
                        variant={
                          outage.totalAgents >= 8 ? "destructive" : "secondary"
                        }
                      >
                        {outage.totalAgents}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marketing Guidance */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">
            Marketing Team Guidance
          </h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Highest Impact Times:</strong> Review peak outage times
                above and consider reducing marketing activities during these
                windows
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Location Considerations:</strong> ATX operates 8:30-5
                CST, CLT operates 9:30-6 EST (1 hour ahead)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Agent Mix:</strong> Performance agents (purple)
                typically handle more complex/high-value calls than Standard
                agents (orange)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                <strong>Weekly Pattern:</strong> Training intensity is
                distributed across Tue-Thu for metrics, with Fri for critical
                remediation
              </span>
            </li>
          </ul>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-100 text-purple-800">Perf</Badge>
            <span>Performance Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-100 text-orange-800">Std</Badge>
            <span>Standard Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">ATX</Badge>
            <span>Austin (CST)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">CLT</Badge>
            <span>Charlotte (EST)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
