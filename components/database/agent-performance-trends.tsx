"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgentMetricsTrends, getAgentTrainingHistory } from "@/lib/database";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Loader2,
  Info,
} from "lucide-react";

interface MetricData {
  week_of: string;
  agent_name: string;
  adjusted_cap_score: number;
  close_rate: number;
  annual_premium: number;
  place_rate: number;
  training_attended?: string[];
}

interface ChartData {
  week: string;
  [key: string]: string | number | undefined;
}

export function AgentPerformanceTrends() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [metricData, setMetricData] = useState<ChartData[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<string>("adjusted_cap_score");
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<number>(12); // weeks

  useEffect(() => {
    loadAvailableAgents();
  }, []);

  useEffect(() => {
    if (selectedAgents.length > 0) {
      loadAgentTrends();
    }
  }, [selectedAgents, dateRange]);

  async function loadAvailableAgents() {
    setIsLoading(true);
    try {
      const result = await getAgentMetricsTrends([], dateRange);
      if (result.success && result.data) {
        // Extract unique agent names
        const uniqueAgents = [
          ...new Set(result.data.map((d: any) => d.agent_name)),
        ];
        setAvailableAgents(uniqueAgents.sort());

        // Auto-select first 3 agents
        if (uniqueAgents.length > 0) {
          setSelectedAgents(uniqueAgents.slice(0, 3));
        }
      }
    } catch (error) {
      console.error("Error loading agents:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAgentTrends() {
    setIsLoading(true);
    try {
      const result = await getAgentMetricsTrends(selectedAgents, dateRange);
      if (result.success && result.data) {
        // Group data by week for charting
        const groupedData = result.data.reduce((acc: any, item: any) => {
          const weekKey = new Date(item.week_of).toLocaleDateString();
          if (!acc[weekKey]) {
            acc[weekKey] = { week: weekKey };
          }
          acc[weekKey][`${item.agent_name}_${selectedMetric}`] =
            item[selectedMetric];
          return acc;
        }, {});

        const chartData = Object.values(groupedData).sort(
          (a: any, b: any) =>
            new Date(a.week).getTime() - new Date(b.week).getTime()
        ) as ChartData[];

        setMetricData(chartData);
      }
    } catch (error) {
      console.error("Error loading trends:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAgentToggle = (agentName: string) => {
    if (selectedAgents.includes(agentName)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== agentName));
    } else if (selectedAgents.length < 5) {
      setSelectedAgents([...selectedAgents, agentName]);
    }
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      adjusted_cap_score: "Adjusted CAP Score",
      close_rate: "Close Rate (%)",
      annual_premium: "Annual Premium ($)",
      place_rate: "Place Rate (%)",
    };
    return labels[metric] || metric;
  };

  const getMetricColor = (index: number) => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
    return colors[index % colors.length];
  };

  const calculateTrend = (agentName: string) => {
    if (metricData.length < 2) return null;

    const firstWeek = metricData[0];
    const lastWeek = metricData[metricData.length - 1];
    const key = `${agentName}_${selectedMetric}`;

    const firstValue = firstWeek[key];
    const lastValue = lastWeek[key];

    if (
      typeof firstValue !== "number" ||
      typeof lastValue !== "number" ||
      firstValue === 0
    ) {
      return null;
    }

    const change = ((lastValue - firstValue) / firstValue) * 100;
    return {
      value: change,
      isPositive: change > 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Trends</CardTitle>
          <p className="text-sm text-gray-600">
            Track agent metrics over time to measure training effectiveness
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Metric</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjusted_cap_score">
                    Adjusted CAP Score
                  </SelectItem>
                  <SelectItem value="close_rate">Close Rate</SelectItem>
                  <SelectItem value="annual_premium">Annual Premium</SelectItem>
                  <SelectItem value="place_rate">Place Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Period
              </label>
              <Select
                value={dateRange.toString()}
                onValueChange={(v) => setDateRange(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Last 4 weeks</SelectItem>
                  <SelectItem value="8">Last 8 weeks</SelectItem>
                  <SelectItem value="12">Last 12 weeks</SelectItem>
                  <SelectItem value="26">Last 26 weeks</SelectItem>
                  <SelectItem value="52">Last 52 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <Button
                onClick={loadAgentTrends}
                disabled={isLoading || selectedAgents.length === 0}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Data"
                )}
              </Button>
            </div>
          </div>

          {/* Agent Selection */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">
              Select Agents (max 5)
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
              {availableAgents.map((agent) => (
                <Badge
                  key={agent}
                  variant={
                    selectedAgents.includes(agent) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => handleAgentToggle(agent)}
                >
                  {agent}
                </Badge>
              ))}
            </div>
            {selectedAgents.length === 0 && (
              <p className="text-sm text-yellow-600 mt-2">
                Select at least one agent to view trends
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trend Summary Cards */}
      {selectedAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {selectedAgents.map((agent, index) => {
            const trend = calculateTrend(agent);
            return (
              <Card key={agent}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {agent}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getMetricLabel(selectedMetric)}
                      </p>
                    </div>
                    {trend && (
                      <div
                        className={`flex items-center ${
                          trend.isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {trend.isPositive ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm font-medium">
                          {Math.abs(trend.value).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {selectedAgents.length > 0 && metricData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{getMetricLabel(selectedMetric)} Over Time</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Info className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-gray-600">
                Training sessions are marked with vertical lines. Hover over
                data points for details.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metricData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                />
                <Legend />
                {selectedAgents.map((agent, index) => (
                  <Line
                    key={agent}
                    type="monotone"
                    dataKey={`${agent}_${selectedMetric}`}
                    stroke={getMetricColor(index)}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name={agent}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {!isLoading && selectedAgents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Select agents above to view their performance trends
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
