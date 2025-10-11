import {
  AgentRecord,
  DaySchedule,
  TrainingSession,
  Cohorts,
  TIME_SLOTS,
  DAYS_OF_WEEK,
  TRAINING_FOCUS,
} from "@/types";
import {
  getSiteDisplayName,
  getTierDisplayName,
  getPriorityLevel,
} from "./business-logic";

export function generateSchedule(
  cohorts: Cohorts & {
    zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] };
  },
  avgCAPScore: number
): DaySchedule[] {
  const schedule: DaySchedule[] = [];

  // Initialize days
  DAYS_OF_WEEK.forEach((day) => {
    schedule.push({
      day,
      sessions: [],
    });
  });

  // Get schedule map for easy access
  const scheduleMap = new Map(schedule.map((s) => [s.day, s]));

  // Schedule zero CAP agents on Monday
  const mondaySchedule = scheduleMap.get("Monday")!;
  scheduleZeroCAPAgents(mondaySchedule, cohorts.zeroCAPAgents);

  // Prepare regular training cohorts
  const allRegularCohorts: Array<{
    agents: AgentRecord[];
    location: "CLT" | "ATX";
    tier: "Performance" | "Standard";
    priority: "HIGH" | "MEDIUM" | "LOW";
  }> = [];

  // Add all regular training cohorts
  addCohortsToList(
    cohorts.cltPerformance,
    "CLT",
    "Performance",
    allRegularCohorts,
    avgCAPScore
  );
  addCohortsToList(
    cohorts.cltStandard,
    "CLT",
    "Standard",
    allRegularCohorts,
    avgCAPScore
  );
  addCohortsToList(
    cohorts.atxPerformance,
    "ATX",
    "Performance",
    allRegularCohorts,
    avgCAPScore
  );
  addCohortsToList(
    cohorts.atxStandard,
    "ATX",
    "Standard",
    allRegularCohorts,
    avgCAPScore
  );

  // Sort cohorts by priority
  allRegularCohorts.sort((a, b) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.agents[0].capScore - b.agents[0].capScore;
  });

  // Schedule regular training on Tuesday, Wednesday, Thursday
  const trainingDays = ["Tuesday", "Wednesday", "Thursday"];
  let cohortIndex = 0;

  console.log(
    `Total regular training cohorts to schedule: ${allRegularCohorts.length}`
  );
  console.log(
    `ATX cohorts: ${
      allRegularCohorts.filter((c) => c.location === "ATX").length
    }`
  );
  console.log(
    `CLT cohorts: ${
      allRegularCohorts.filter((c) => c.location === "CLT").length
    }`
  );

  for (const day of trainingDays) {
    const daySchedule = scheduleMap.get(day)!;
    const sortedTimeSlots = [...TIME_SLOTS].sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let lastLocationForDay: "CLT" | "ATX" | null = null;

    for (const timeSlot of sortedTimeSlots) {
      if (cohortIndex >= allRegularCohorts.length) break;

      // Try to find a cohort that alternates location
      let selectedCohortIndex = -1;

      // First, try to find a cohort from a different location
      for (let i = cohortIndex; i < allRegularCohorts.length; i++) {
        if (
          lastLocationForDay === null ||
          allRegularCohorts[i].location !== lastLocationForDay
        ) {
          selectedCohortIndex = i;
          break;
        }
      }

      // If no alternating location found, just take the next one
      if (
        selectedCohortIndex === -1 &&
        cohortIndex < allRegularCohorts.length
      ) {
        selectedCohortIndex = cohortIndex;
      }

      if (selectedCohortIndex === -1) break;

      // Swap cohorts if needed
      if (selectedCohortIndex !== cohortIndex) {
        const temp = allRegularCohorts[cohortIndex];
        allRegularCohorts[cohortIndex] = allRegularCohorts[selectedCohortIndex];
        allRegularCohorts[selectedCohortIndex] = temp;
      }

      const cohort = allRegularCohorts[cohortIndex];

      // Debug: Log what's being scheduled
      if (day === "Thursday") {
        console.log(
          `Thursday scheduling: ${cohort.location} - ${cohort.agents.length} agents`
        );
        cohort.agents.forEach((agent) => {
          console.log(
            `  - ${agent.name}: ${agent.recommendedTraining?.join(", ")}`
          );
        });
      }

      const session: TrainingSession = {
        time: timeSlot.time,
        location: cohort.location,
        tier: cohort.tier,
        agents: cohort.agents,
        priority: `${timeSlot.description} - ${
          TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]
        }`,
        cohortNumber: cohortIndex + 1,
      };

      daySchedule.sessions.push(session);
      lastLocationForDay = cohort.location;
      cohortIndex++;
    }
  }

  // If we still have zero CAP agents that couldn't fit on Monday, try Friday
  if (
    cohorts.zeroCAPAgents.clt.length + cohorts.zeroCAPAgents.atx.length >
    12
  ) {
    // 6 time slots * 2 locations
    const fridaySchedule = scheduleMap.get("Friday")!;
    scheduleZeroCAPAgents(fridaySchedule, cohorts.zeroCAPAgents, 12); // Start from cohort 13
  }

  return schedule;
}

function addCohortsToList(
  cohortGroup: AgentRecord[][],
  location: "CLT" | "ATX",
  tier: "Performance" | "Standard",
  list: Array<any>,
  avgCAPScore: number
) {
  cohortGroup.forEach((cohort) => {
    if (cohort.length > 0) {
      const priority = getPriorityLevel(cohort[0].capScore, avgCAPScore);
      list.push({
        agents: cohort,
        location,
        tier,
        priority,
      });
    }
  });
}

function scheduleZeroCAPAgents(
  daySchedule: DaySchedule,
  zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] },
  startIndex: number = 0
) {
  let cohortIndex = startIndex;
  let lastLocation: "CLT" | "ATX" | null = null;

  // Combine CLT and ATX zero CAP cohorts
  const allZeroCAPCohorts: Array<{
    agents: AgentRecord[];
    location: "CLT" | "ATX";
  }> = [];

  zeroCAPAgents.clt.forEach((cohort) => {
    if (cohort.length > 0) {
      allZeroCAPCohorts.push({ agents: cohort, location: "CLT" });
    }
  });

  zeroCAPAgents.atx.forEach((cohort) => {
    if (cohort.length > 0) {
      allZeroCAPCohorts.push({ agents: cohort, location: "ATX" });
    }
  });

  // Schedule zero CAP agents
  for (const timeSlot of TIME_SLOTS) {
    if (cohortIndex - startIndex >= allZeroCAPCohorts.length) break;

    const cohort = allZeroCAPCohorts[cohortIndex - startIndex];

    // Site alternation
    if (lastLocation === cohort.location) {
      continue;
    }

    const session: TrainingSession = {
      time: timeSlot.time,
      location: cohort.location,
      tier: "Zero CAP Remediation",
      agents: cohort.agents,
      priority: `${timeSlot.description} - ${
        TRAINING_FOCUS[daySchedule.day as keyof typeof TRAINING_FOCUS]
      }`,
      cohortNumber: cohortIndex + 1,
    };

    daySchedule.sessions.push(session);
    lastLocation = cohort.location;
    cohortIndex++;
  }
}

export function getScheduleStats(schedule: DaySchedule[]): {
  totalSessions: number;
  cltSessions: number;
  atxSessions: number;
  totalAgentsScheduled: number;
  weeklyCapacity: number;
} {
  let totalSessions = 0;
  let cltSessions = 0;
  let atxSessions = 0;
  let totalAgentsScheduled = 0;

  schedule.forEach((day) => {
    day.sessions.forEach((session) => {
      totalSessions++;
      totalAgentsScheduled += session.agents.length;

      if (session.location === "CLT") {
        cltSessions++;
      } else {
        atxSessions++;
      }
    });
  });

  const weeklyCapacity = DAYS_OF_WEEK.length * TIME_SLOTS.length;

  return {
    totalSessions,
    cltSessions,
    atxSessions,
    totalAgentsScheduled,
    weeklyCapacity,
  };
}

export function validateSchedule(schedule: DaySchedule[]): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  let consecutiveSameLocation = 0;
  let lastLocation: "CLT" | "ATX" | null = null;

  schedule.forEach((day, dayIndex) => {
    day.sessions.forEach((session, sessionIndex) => {
      // Check for consecutive same location
      if (lastLocation === session.location) {
        consecutiveSameLocation++;
        if (consecutiveSameLocation >= 2) {
          errors.push(
            `Consecutive sessions for ${session.location} on ${day.day} at ${session.time}`
          );
        }
      } else {
        consecutiveSameLocation = 0;
      }
      lastLocation = session.location;

      // Check cohort size
      if (session.agents.length > 5) {
        errors.push(
          `Cohort too large (${session.agents.length} agents) in ${session.location} ${session.tier} on ${day.day}`
        );
      }

      // Check for lunch hour (should not happen based on TIME_SLOTS)
      if (session.time.includes("12:00") || session.time.includes("1:00")) {
        errors.push(
          `Training scheduled during lunch hour: ${day.day} ${session.time}`
        );
      }
    });
  });

  // Check for balanced distribution
  const stats = getScheduleStats(schedule);
  const cltRatio = stats.cltSessions / stats.totalSessions;
  const atxRatio = stats.atxSessions / stats.totalSessions;

  if (Math.abs(cltRatio - atxRatio) > 0.3) {
    warnings.push(
      `Unbalanced schedule: CLT ${Math.round(
        cltRatio * 100
      )}% vs ATX ${Math.round(atxRatio * 100)}%`
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
