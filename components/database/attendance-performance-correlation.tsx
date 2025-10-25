"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  AlertCircle,
  Target,
  Loader2,
  Info,
} from "lucide-react";

interface AgentAttendancePerformance {
  agentName: string;
  manager: string;
  site: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  startCapScore: number;
  endCapScore: number;
  capImprovement: number;
  improvementRate: number;
  category: "high-improve" | "high-stagnant" | "low-improve" | "low-stagnant";
}

interface CategoryStats {
  category: string;
  count: number;
  avgAttendance: number;
  avgImprovement: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

export function AttendancePerformanceCorrelation() {
  const [agents, setAgents] = useState<AgentAttendancePerformance[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<number>(12); // weeks
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [availableManagers, setAvailableManagers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"scatter" | "category">("scatter");

  useEffect(() => {
    loadData();
  }, [dateRange, locationFilter, managerFilter]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange * 7);

      // Fetch attendance data - be explicit about the foreign key relationship
      let attendanceQuery = supabase
        .from("agent_assignments")
        .select(
          `
          agent_name,
          manager,
          site,
          attended,
          training_sessions!session_id (
            training_schedules!schedule_id (
              week_of
            )
          )
        `
        )
        .gte(
          "training_sessions.training_schedules.week_of",
          startDate.toISOString().split("T")[0]
        )
        .lte(
          "training_sessions.training_schedules.week_of",
          endDate.toISOString().split("T")[0]
        );

      if (locationFilter !== "all") {
        attendanceQuery = attendanceQuery.eq("site", locationFilter);
      }

      if (managerFilter !== "all") {
        attendanceQuery = attendanceQuery.eq("manager", managerFilter);
      }

      const { data: attendanceData, error: attendanceError } =
        await attendanceQuery;

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        return;
      }

      // Fetch CAP score history
      let capScoreQuery = supabase
        .from("cap_score_history")
        .select("*")
        .gte("week_of", startDate.toISOString().split("T")[0])
        .lte("week_of", endDate.toISOString().split("T")[0])
        .order("week_of", { ascending: true });

      if (locationFilter !== "all") {
        capScoreQuery = capScoreQuery.eq(
          "site",
          locationFilter === "CLT" ? "CHA" : "AUS"
        );
      }

      const { data: capScoreData, error: capScoreError } = await capScoreQuery;

      if (capScoreError) {
        console.error("Error fetching CAP scores:", capScoreError);
        return;
      }

      // Process data
      const agentMap = new Map<string, AgentAttendancePerformance>();

      // Process attendance data
      attendanceData?.forEach((assignment) => {
        const agentName = assignment.agent_name;
        const agent = agentMap.get(agentName) || {
          agentName,
          manager: assignment.manager,
          site: assignment.site,
          totalSessions: 0,
          attendedSessions: 0,
          attendanceRate: 0,
          startCapScore: 0,
          endCapScore: 0,
          capImprovement: 0,
          improvementRate: 0,
          category: "low-stagnant" as const,
        };

        agent.totalSessions += 1;
        if (assignment.attended === true) {
          agent.attendedSessions += 1;
        }

        agentMap.set(agentName, agent);
      });

      // Process CAP score data
      const agentCapScores = new Map<
        string,
        { scores: number[]; weeks: string[] }
      >();

      capScoreData?.forEach((record) => {
        const agentName = record.agent_name;
        const scores = agentCapScores.get(agentName) || {
          scores: [],
          weeks: [],
        };
        scores.scores.push(record.adjusted_cap_score);
        scores.weeks.push(record.week_of);
        agentCapScores.set(agentName, scores);
      });

      // Calculate metrics and categorize agents
      const processedAgents: AgentAttendancePerformance[] = [];

      agentMap.forEach((agent, agentName) => {
        const capData = agentCapScores.get(agentName);

        if (capData && capData.scores.length >= 2) {
          agent.startCapScore = capData.scores[0];
          agent.endCapScore = capData.scores[capData.scores.length - 1];
          agent.capImprovement = agent.endCapScore - agent.startCapScore;
          agent.improvementRate =
            agent.startCapScore !== 0
              ? (agent.capImprovement / agent.startCapScore) * 100
              : 0;
        }

        // Calculate attendance rate
        agent.attendanceRate =
          agent.totalSessions > 0
            ? (agent.attendedSessions / agent.totalSessions) * 100
            : 0;

        // Categorize agents
        const highAttendance = agent.attendanceRate >= 70; // 70% or higher
        const improving = agent.improvementRate > 5; // More than 5% improvement

        if (highAttendance && improving) {
          agent.category = "high-improve";
        } else if (highAttendance && !improving) {
          agent.category = "high-stagnant";
        } else if (!highAttendance && improving) {
          agent.category = "low-improve";
        } else {
          agent.category = "low-stagnant";
        }

        processedAgents.push(agent);
      });

      // Filter by manager if needed
      const filteredAgents =
        managerFilter === "all"
          ? processedAgents
          : processedAgents.filter((a) => a.manager === managerFilter);

      setAgents(filteredAgents);

      // Get unique managers for filter
      const managers = [
        ...new Set(processedAgents.map((a) => a.manager)),
      ].sort();
      setAvailableManagers(managers);

      // Calculate category statistics
      calculateCategoryStats(filteredAgents);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function calculateCategoryStats(agents: AgentAttendancePerformance[]) {
    const categories: CategoryStats[] = [
      {
        category: "high-improve",
        count: 0,
        avgAttendance: 0,
        avgImprovement: 0,
        color: "#10b981", // green
        icon: <TrendingUp className="h-5 w-5" />,
        description: "High Attendance + Improving",
      },
      {
        category: "high-stagnant",
        count: 0,
        avgAttendance: 0,
        avgImprovement: 0,
        color: "#f59e0b", // amber
        icon: <AlertCircle className="h-5 w-5" />,
        description: "High Attendance + Stagnant",
      },
      {
        category: "low-improve",
        count: 0,
        avgAttendance: 0,
        avgImprovement: 0,
        color: "#3b82f6", // blue
        icon: <Info className="h-5 w-5" />,
        description: "Low Attendance + Improving",
      },
      {
        category: "low-stagnant",
        count: 0,
        avgAttendance: 0,
        avgImprovement: 0,
        color: "#ef4444", // red
        icon: <TrendingDown className="h-5 w-5" />,
        description: "Low Attendance + Not Improving",
      },
    ];

    // Calculate stats for each category
    agents.forEach((agent) => {
      const categoryIndex = categories.findIndex(
        (c) => c.category === agent.category
      );
      if (categoryIndex !== -1) {
        const cat = categories[categoryIndex];
        cat.count += 1;
        cat.avgAttendance =
          (cat.avgAttendance * (cat.count - 1) + agent.attendanceRate) /
          cat.count;
        cat.avgImprovement =
          (cat.avgImprovement * (cat.count - 1) + agent.improvementRate) /
          cat.count;
      }
    });

    setCategoryStats(categories);
  }

  // Custom tooltip for scatter plot
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.agentName}</p>
          <p className="text-sm text-gray-600">Manager: {data.manager}</p>
          <p className="text-sm">
            Attendance: {data.attendanceRate.toFixed(1)}%
          </p>
          <p className="text-sm">
            CAP Improvement: {data.improvementRate.toFixed(1)}%
          </p>
          <p className="text-sm">
            Sessions: {data.attendedSessions} / {data.totalSessions}
          </p>
        </div>
      );
    }
    return null;
  };

  const getScatterColor = (category: string) => {
    const colors: Record<string, string> = {
      "high-improve": "#10b981",
      "high-stagnant": "#f59e0b",
      "low-improve": "#3b82f6",
      "low-stagnant": "#ef4444",
    };
    return colors[category] || "#6b7280";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">
            Analyzing attendance and performance data...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            CAP Training Attendance & Performance Correlation
          </CardTitle>
          <p className="text-sm text-gray-600">
            Analyzing the relationship between training attendance and agent
            performance improvement
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Period
              </label>
              <Select
                value={dateRange.toString()}
                onValueChange={(value) => setDateRange(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Last 4 weeks</SelectItem>
                  <SelectItem value="8">Last 8 weeks</SelectItem>
                  <SelectItem value="12">Last 12 weeks</SelectItem>
                  <SelectItem value="24">Last 24 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="CLT">Charlotte (CLT)</SelectItem>
                  <SelectItem value="ATX">Austin (ATX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Manager</label>
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  {availableManagers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() =>
                  setViewMode(viewMode === "scatter" ? "category" : "scatter")
                }
                variant="outline"
                className="w-full"
              >
                {viewMode === "scatter"
                  ? "Show Categories"
                  : "Show Scatter Plot"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categoryStats.map((stat) => (
          <Card key={stat.category}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className="flex items-center gap-2 mb-2"
                    style={{ color: stat.color }}
                  >
                    {stat.icon}
                    <span className="font-medium">{stat.count} agents</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {stat.description}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600">
                      Avg Attendance: {stat.avgAttendance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">
                      Avg Improvement: {stat.avgImprovement > 0 ? "+" : ""}
                      {stat.avgImprovement.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visualization */}
      {viewMode === "scatter" ? (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Rate vs Performance Improvement</CardTitle>
            <p className="text-sm text-gray-600">
              Each point represents an agent. Quadrants show different
              attendance-performance patterns.
            </p>
          </CardHeader>
          <CardContent>
            {/* Chart explanation box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-900">
                  <p className="font-medium">How to read this chart:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                    <div>
                      • <strong>Y-axis:</strong> CAP score change (% from
                      baseline)
                    </div>
                    <div>
                      • <strong>X-axis:</strong> Training attendance rate (%)
                    </div>
                    <div>
                      • <strong>Above 0%:</strong> Improvement |{" "}
                      <strong>Below 0%:</strong> Decline
                    </div>
                    <div>
                      • <strong>Lines:</strong> 70% attendance, 5% improvement
                      thresholds
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <ScatterChart
                margin={{ top: 20, right: 90, bottom: 60, left: 90 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="attendanceRate"
                  name="Attendance Rate"
                  unit="%"
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  label={{
                    value: "Attendance Rate (%)",
                    position: "insideBottom",
                    offset: -5,
                    style: { fontSize: 14 },
                  }}
                />
                <YAxis
                  dataKey="improvementRate"
                  name="CAP Score Improvement"
                  unit="%"
                  domain={[-25, 35]}
                  ticks={[-20, -10, 0, 10, 20, 30]}
                  label={{
                    value: "CAP Score Change (% from baseline)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 14 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={0}
                  stroke="#333"
                  strokeWidth={2}
                  label={{
                    value: "No Change",
                    position: "left",
                    style: { fontSize: 11, fill: "#333", fontWeight: "bold" },
                  }}
                />
                <ReferenceLine
                  x={70}
                  stroke="#666"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: "70%",
                    position: "top",
                    style: { fontSize: 12, fill: "#666" },
                  }}
                />
                <ReferenceLine
                  y={5}
                  stroke="#666"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: "5%",
                    position: "right",
                    style: { fontSize: 12, fill: "#666" },
                  }}
                />
                <Scatter
                  name="Agents"
                  data={agents}
                  fill="#8884d8"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = getScatterColor(payload.category);
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill={color}
                        stroke={color}
                        strokeWidth={1}
                        opacity={0.8}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              {categoryStats.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm">{cat.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Agent Distribution by Category</CardTitle>
            <p className="text-sm text-gray-600">
              Breakdown of agents by attendance and performance patterns
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="description"
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Number of Agents">
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Agent List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Details</CardTitle>
          <p className="text-sm text-gray-600">
            Individual agent attendance and performance metrics
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Agent</th>
                  <th className="text-left p-2">Manager</th>
                  <th className="text-center p-2">Attendance</th>
                  <th className="text-center p-2">Sessions</th>
                  <th className="text-center p-2">Start CAP</th>
                  <th className="text-center p-2">End CAP</th>
                  <th className="text-center p-2">Improvement</th>
                  <th className="text-center p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {agents
                  .sort((a, b) => b.improvementRate - a.improvementRate)
                  .slice(0, 20)
                  .map((agent) => (
                    <tr
                      key={agent.agentName}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-2 font-medium">{agent.agentName}</td>
                      <td className="p-2">{agent.manager}</td>
                      <td className="p-2 text-center">
                        <Badge
                          variant={
                            agent.attendanceRate >= 70 ? "default" : "outline"
                          }
                        >
                          {agent.attendanceRate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-center text-gray-600">
                        {agent.attendedSessions}/{agent.totalSessions}
                      </td>
                      <td className="p-2 text-center">{agent.startCapScore}</td>
                      <td className="p-2 text-center">{agent.endCapScore}</td>
                      <td className="p-2 text-center">
                        <span
                          className={
                            agent.improvementRate > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {agent.improvementRate > 0 ? "+" : ""}
                          {agent.improvementRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor:
                              getScatterColor(agent.category) + "20",
                            borderColor: getScatterColor(agent.category),
                          }}
                        >
                          {agent.category === "high-improve" &&
                            "High + Improving"}
                          {agent.category === "high-stagnant" &&
                            "High + Stagnant"}
                          {agent.category === "low-improve" &&
                            "Low + Improving"}
                          {agent.category === "low-stagnant" &&
                            "Low + Not Improving"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {agents.length > 20 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Showing top 20 of {agents.length} agents
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium">
                  High Attendance Correlates with Improvement
                </p>
                <p className="text-sm text-gray-600">
                  {categoryStats.find((c) => c.category === "high-improve")
                    ?.count || 0}{" "}
                  agents with 70%+ attendance show positive CAP score
                  improvement, averaging{" "}
                  {categoryStats
                    .find((c) => c.category === "high-improve")
                    ?.avgImprovement.toFixed(1)}
                  % gains.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
              <div>
                <p className="font-medium">
                  Some High Attenders Need Different Support
                </p>
                <p className="text-sm text-gray-600">
                  {categoryStats.find((c) => c.category === "high-stagnant")
                    ?.count || 0}{" "}
                  agents attend regularly but aren't improving. They may need
                  personalized coaching or different training approaches.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
              <div>
                <p className="font-medium">Low Attendance Limits Progress</p>
                <p className="text-sm text-gray-600">
                  {categoryStats.find((c) => c.category === "low-stagnant")
                    ?.count || 0}{" "}
                  agents with low attendance show minimal improvement. Focus on
                  increasing their training participation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
