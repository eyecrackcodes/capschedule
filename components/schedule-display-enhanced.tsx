"use client";

import React from "react";
import { DaySchedule, Filters } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/ui/animated-card";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Target,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface ScheduleDisplayEnhancedProps {
  schedule: DaySchedule[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  avgAdjustedCAPScore: number;
}

const dayIcons: Record<string, string> = {
  Tuesday: "💪",
  Wednesday: "💰",
  Thursday: "🎯",
  Friday: "🔧",
};

const dayColors: Record<string, string> = {
  Tuesday: "from-green-500 to-emerald-600",
  Wednesday: "from-blue-500 to-indigo-600",
  Thursday: "from-purple-500 to-pink-600",
  Friday: "from-amber-500 to-orange-600",
};

export function ScheduleDisplayEnhanced({
  schedule,
  filters,
  onFiltersChange,
  avgAdjustedCAPScore,
}: ScheduleDisplayEnhancedProps) {
  const getTimeValue = (timeString: string) => {
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3];
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const filteredSchedule = schedule
    .map((day) => ({
      ...day,
      sessions: day.sessions
        .filter((session) => {
          if (filters.location !== "all" && session.location !== filters.location) return false;
          if (filters.tier !== "all" && session.tier.toLowerCase() !== filters.tier) return false;
          return true;
        })
        .sort((a, b) => getTimeValue(a.time) - getTimeValue(b.time)),
    }))
    .filter((day) => day.sessions.length > 0);

  if (filteredSchedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-gray-100 p-6 mb-4">
          <Calendar className="h-12 w-12 text-gray-400" />
        </div>
        <p className="text-lg text-gray-600">No sessions match your filters</p>
        <p className="mt-2 text-sm text-gray-500">Try adjusting your location or tier filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-2 rounded-full">
          <MapPin className="h-4 w-4 text-blue-600" />
          <select
            value={filters.location}
            onChange={(e) => onFiltersChange({ ...filters, location: e.target.value as any })}
            className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Locations</option>
            <option value="CLT">Charlotte</option>
            <option value="ATX">Austin</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-4 py-2 rounded-full">
          <Target className="h-4 w-4 text-purple-600" />
          <select
            value={filters.tier}
            onChange={(e) => onFiltersChange({ ...filters, tier: e.target.value as any })}
            className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Tiers</option>
            <option value="performance">Performance</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredSchedule.map((day, dayIndex) => (
          <AnimatedCard key={day.day} delay={dayIndex * 100} className="overflow-hidden">
            {/* Day Header with Gradient */}
            <div className={`bg-gradient-to-r ${dayColors[day.day]} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dayIcons[day.day]}</span>
                  <div>
                    <h3 className="text-xl font-bold">{day.day}</h3>
                    <p className="text-sm opacity-90">{day.focus}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">
                  {day.sessions.length} sessions
                </Badge>
              </div>
            </div>

            {/* Sessions */}
            <div className="p-4 space-y-3">
              {day.sessions.map((session, sessionIndex) => (
                <div
                  key={`${day.day}-${sessionIndex}`}
                  className="group relative overflow-hidden rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 transition-all hover:shadow-md hover:scale-[1.02]"
                >
                  {/* Session Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{session.time}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{session.location}</span>
                        <Badge variant="outline" className="text-xs">
                          {session.tier}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">{session.agents.length}</span>
                    </div>
                  </div>

                  {/* Agent Pills */}
                  <div className="flex flex-wrap gap-2">
                    {session.agents.map((agent) => (
                      <div
                        key={agent.name}
                        className={cn(
                          "group/agent relative overflow-hidden rounded-full px-3 py-1 text-xs transition-all hover:scale-105",
                          agent.adjustedCAPScore < avgAdjustedCAPScore * 0.5
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : agent.adjustedCAPScore < avgAdjustedCAPScore * 0.75
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        )}
                      >
                        <span className="relative z-10">
                          {agent.name.split(" ")[0]} • {agent.adjustedCAPScore}
                        </span>
                        
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/agent:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-gray-300">Adj CAP: {agent.adjustedCAPScore}</div>
                            <div className="text-gray-300">Attainment: {agent.leadAttainment.toFixed(0)}%</div>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Decorative gradient line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${dayColors[day.day]} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
              ))}
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <AnimatedCard delay={400} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 text-center">
          <Calendar className="mx-auto h-8 w-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {filteredSchedule.length}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Training Days</div>
        </AnimatedCard>

        <AnimatedCard delay={500} className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 text-center">
          <Clock className="mx-auto h-8 w-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {filteredSchedule.reduce((sum, day) => sum + day.sessions.length, 0)}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Total Sessions</div>
        </AnimatedCard>

        <AnimatedCard delay={600} className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 text-center">
          <Users className="mx-auto h-8 w-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {filteredSchedule.reduce(
              (sum, day) => sum + day.sessions.reduce((s, session) => s + session.agents.length, 0),
              0
            )}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">Agents Scheduled</div>
        </AnimatedCard>

        <AnimatedCard delay={700} className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {(filteredSchedule.reduce(
              (sum, day) => sum + day.sessions.reduce((s, session) => s + session.agents.length, 0),
              0
            ) / filteredSchedule.reduce((sum, day) => sum + day.sessions.length, 0) || 0).toFixed(1)}
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-300">Avg per Session</div>
        </AnimatedCard>
      </div>
    </div>
  );
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}
