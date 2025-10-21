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
  ReferenceLine,
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
  GraduationCap,
  ArrowRight,
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

interface TrainingEvent {
  agentName: string;
  date: string;
  week: string;
  trainingType: string;
}

interface TrainingImpact {
  agentName: string;
  trainingType: string;
  trainingWeek: string;
  impactWeek: string;
  metricBeforeTraining: number | null;
  metricAfterTraining: number | null;
  percentageChange: number | null;
  impactDirection: 'positive' | 'negative' | 'neutral';
}

export function AgentPerformanceTrendsV2() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [metricData, setMetricData] = useState<ChartData[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<string>("adjusted_cap_score");
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<number>(12); // weeks
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [trainingImpacts, setTrainingImpacts] = useState<TrainingImpact[]>([]);
  const [showImpactView, setShowImpactView] = useState(false);

  useEffect(() => {
    loadAvailableAgents();
  }, []);

  useEffect(() => {
    if (selectedAgents.length > 0) {
      loadAgentTrends();
      loadTrainingHistory();
    }
  }, [selectedAgents, dateRange, selectedMetric]);

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
          // Store all metrics for each agent
          acc[weekKey][`${item.agent_name}_adjusted_cap_score`] = item.adjusted_cap_score;
          acc[weekKey][`${item.agent_name}_close_rate`] = item.close_rate;
          acc[weekKey][`${item.agent_name}_annual_premium`] = item.annual_premium;
          acc[weekKey][`${item.agent_name}_place_rate`] = item.place_rate;
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

  async function loadTrainingHistory() {
    try {
      const events: TrainingEvent[] = [];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange * 7);
      
      for (const agent of selectedAgents) {
        const result = await getAgentTrainingHistory(
          agent,
          startDate.toISOString(),
          endDate.toISOString()
        );
        
        if (result.success && result.data) {
          result.data.forEach((training: any) => {
            events.push({
              agentName: agent,
              date: training.created_at,
              week: new Date(training.created_at).toLocaleDateString(),
              trainingType: training.training_type || 'Unknown',
            });
          });
        }
      }
      setTrainingEvents(events);
      
      // Wait for metric data to be loaded before analyzing impact
      if (metricData.length > 0) {
        analyzeTrainingImpact(events);
      }
    } catch (error) {
      console.error("Error loading training history:", error);
    }
  }

  function analyzeTrainingImpact(events: TrainingEvent[]) {
    const impacts: TrainingImpact[] = [];
    
    events.forEach(event => {
      const trainingWeekIndex = metricData.findIndex(
        d => d.week === event.week
      );
      
      // Check if we have data for the week after training (impact week)
      if (trainingWeekIndex >= 0 && trainingWeekIndex < metricData.length - 1) {
        const beforeValue = metricData[trainingWeekIndex][`${event.agentName}_${selectedMetric}`];
        const afterValue = metricData[trainingWeekIndex + 1][`${event.agentName}_${selectedMetric}`];
        
        if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
          const percentageChange = ((afterValue - beforeValue) / beforeValue) * 100;
          impacts.push({
            agentName: event.agentName,
            trainingType: event.trainingType,
            trainingWeek: event.week,
            impactWeek: metricData[trainingWeekIndex + 1].week,
            metricBeforeTraining: beforeValue,
            metricAfterTraining: afterValue,
            percentageChange,
            impactDirection: percentageChange > 0 ? 'positive' : percentageChange < 0 ? 'negative' : 'neutral',
          });
        }
      }
    });
    
    setTrainingImpacts(impacts);
  }

  // Re-analyze when metric data changes
  useEffect(() => {
    if (metricData.length > 0 && trainingEvents.length > 0) {
      analyzeTrainingImpact(trainingEvents);
    }
  }, [metricData, selectedMetric]);

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
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
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

  // Custom tooltip to show training information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const trainingForWeek = trainingEvents.filter(e => e.week === label);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(2)}
            </p>
          ))}
          {trainingForWeek.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-blue-600">Training This Week:</p>
              {trainingForWeek.map((t, i) => (
                <p key={i} className="text-xs text-gray-600">
                  • {t.agentName}: {t.trainingType}
                </p>
              ))}
              <p className="text-xs text-amber-600 mt-1 italic">
                Impact measured next week →
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Trends</CardTitle>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Track performance metrics over time and measure training effectiveness.</p>
            <p className="font-medium text-blue-600">
              <Info className="inline h-4 w-4 mr-1" />
              Training impact is measured in the week following training attendance
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Metric
              </label>
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
            <div className="flex items-end">
              <Button
                onClick={() => setShowImpactView(!showImpactView)}
                variant={showImpactView ? "default" : "outline"}
                className="w-full"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                {showImpactView ? "Show Trends" : "Show Training Impact"}
              </Button>
            </div>
          </div>

          {/* Agent Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Agents (up to 5)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableAgents.map((agent) => (
                <Badge
                  key={agent}
                  variant={
                    selectedAgents.includes(agent) ? "default" : "outline"
                  }
                  className={`cursor-pointer transition-all ${
                    selectedAgents.includes(agent)
                      ? ""
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleAgentToggle(agent)}
                >
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Impact Analysis View */}
      {showImpactView && trainingImpacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training Impact Analysis</CardTitle>
            <p className="text-sm text-gray-600">
              Showing {getMetricLabel(selectedMetric)} changes one week after training
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedAgents.map(agent => {
                const agentImpacts = trainingImpacts.filter(i => i.agentName === agent);
                
                if (agentImpacts.length === 0) {
                  return (
                    <div key={agent} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium">{agent}</h4>
                      <p className="text-sm text-gray-600">No training data in selected period</p>
                    </div>
                  );
                }
                
                return (
                  <div key={agent} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="font-medium text-lg">{agent}</h4>
                    {agentImpacts.map((impact, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{impact.trainingType}</span>
                          <Badge variant={impact.impactDirection === 'positive' ? 'default' : 'destructive'}>
                            {impact.impactDirection === 'positive' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(impact.percentageChange || 0).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Training Week</p>
                            <p className="font-medium">{impact.trainingWeek}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Pre-Training</p>
                            <p className="font-medium">{impact.metricBeforeTraining?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Post-Training</p>
                            <p className="font-medium">{impact.metricAfterTraining?.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          Impact measured in week of {impact.impactWeek}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Summary Cards */}
      {!showImpactView && selectedAgents.length > 0 && metricData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {selectedAgents.map((agent) => {
            const trend = calculateTrend(agent);
            const agentTrainings = trainingEvents.filter(e => e.agentName === agent);
            const latestValue =
              metricData[metricData.length - 1][
                `${agent}_${selectedMetric}`
              ];

            return (
              <Card key={agent}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{agent}</h4>
                      <p className="text-2xl font-bold mt-1">
                        {typeof latestValue === "number"
                          ? latestValue.toFixed(2)
                          : "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getMetricLabel(selectedMetric)}
                      </p>
                      {agentTrainings.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-blue-600 font-medium">
                            <GraduationCap className="inline h-3 w-3 mr-1" />
                            {agentTrainings.length} training(s)
                          </p>
                        </div>
                      )}
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
      {!showImpactView && selectedAgents.length > 0 && metricData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{getMetricLabel(selectedMetric)} Over Time</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Info className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-gray-600">
                Blue vertical lines indicate training weeks. Impact is measured the following week.
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
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Add vertical lines for training events */}
                {trainingEvents.map((event, idx) => {
                  const weekData = metricData.find(d => d.week === event.week);
                  if (weekData) {
                    return (
                      <ReferenceLine
                        key={idx}
                        x={event.week}
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                      />
                    );
                  }
                  return null;
                })}
                
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}
