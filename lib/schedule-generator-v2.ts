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

// Map training days to specific training types
const TRAINING_DAY_MAP = {
  Tuesday: "Close Rate Training",
  Wednesday: "Annual Premium Training",
  Thursday: "Place Rate Training",
} as const;

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

  // Schedule metric-specific training on Tuesday, Wednesday, Thursday
  scheduleMetricSpecificTraining(scheduleMap, cohorts, avgCAPScore);

  // If we still have zero CAP agents that couldn't fit on Monday, try Friday
  if (
    cohorts.zeroCAPAgents.clt.length + cohorts.zeroCAPAgents.atx.length >
    12 // 6 time slots * 2 locations
  ) {
    const fridaySchedule = scheduleMap.get("Friday")!;
    scheduleZeroCAPAgents(fridaySchedule, cohorts.zeroCAPAgents, 12); // Start from cohort 13
  }

  return schedule;
}

function scheduleMetricSpecificTraining(
  scheduleMap: Map<string, DaySchedule>,
  cohorts: Cohorts,
  avgCAPScore: number
) {
  // For each training day, filter agents who need that specific training
  const trainingDays = ["Tuesday", "Wednesday", "Thursday"] as const;

  for (const day of trainingDays) {
    const daySchedule = scheduleMap.get(day)!;
    const requiredTraining = TRAINING_DAY_MAP[day];

    console.log(`\nScheduling ${day} - ${requiredTraining}:`);

    // Collect all agents who need this specific training
    const agentsNeedingTraining: Array<{
      agent: AgentRecord;
      location: "CLT" | "ATX";
      tier: "Performance" | "Standard";
      priority: "HIGH" | "MEDIUM" | "LOW";
    }> = [];

    // Helper to add agents from cohort groups
    const collectAgents = (
      cohortGroup: AgentRecord[][],
      location: "CLT" | "ATX",
      tier: "Performance" | "Standard"
    ) => {
      cohortGroup.forEach((cohort) => {
        cohort.forEach((agent) => {
          if (agent.recommendedTraining?.includes(requiredTraining)) {
            agentsNeedingTraining.push({
              agent,
              location,
              tier,
              priority: getPriorityLevel(agent.capScore, avgCAPScore),
            });
          }
        });
      });
    };

    // Collect from all cohort groups
    collectAgents(cohorts.cltPerformance, "CLT", "Performance");
    collectAgents(cohorts.cltStandard, "CLT", "Standard");
    collectAgents(cohorts.atxPerformance, "ATX", "Performance");
    collectAgents(cohorts.atxStandard, "ATX", "Standard");

    console.log(
      `Found ${agentsNeedingTraining.length} agents needing ${requiredTraining}`
    );
    console.log(
      `CLT: ${agentsNeedingTraining.filter((a) => a.location === "CLT").length}`
    );
    console.log(
      `ATX: ${agentsNeedingTraining.filter((a) => a.location === "ATX").length}`
    );

    // Sort by priority and CAP score
    agentsNeedingTraining.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.agent.capScore - b.agent.capScore;
    });

    // Create new cohorts with min 2 and max 5 agents per location
    const MIN_COHORT_SIZE = 2;
    const MAX_COHORT_SIZE = 5;
    
    // First, separate agents by location
    const agentsByLocation = {
      CLT: agentsNeedingTraining.filter(a => a.location === "CLT"),
      ATX: agentsNeedingTraining.filter(a => a.location === "ATX")
    };
    
    const newCohorts: Array<{
      agents: AgentRecord[];
      location: "CLT" | "ATX";
      tier: "Performance" | "Standard";
    }> = [];
    
    // Process each location separately to ensure minimum threshold
    (["CLT", "ATX"] as const).forEach(location => {
      const locationAgents = agentsByLocation[location];
      
      if (locationAgents.length === 0) return;
      
      // If we have fewer than minimum, we might need to wait or combine with next week
      if (locationAgents.length < MIN_COHORT_SIZE) {
        console.log(`Warning: ${location} has only ${locationAgents.length} agents for ${requiredTraining} (minimum is ${MIN_COHORT_SIZE})`);
        // Still create the cohort but mark it as below minimum
        if (locationAgents.length > 0) {
          newCohorts.push({
            agents: locationAgents.map(a => a.agent),
            location,
            tier: locationAgents[0].tier, // Use the first agent's tier
          });
        }
        return;
      }
      
      // Create cohorts for this location
      let currentCohort: AgentRecord[] = [];
      let currentTier: "Performance" | "Standard" = locationAgents[0].tier;
      
      for (let i = 0; i < locationAgents.length; i++) {
        const item = locationAgents[i];
        
        // Check if we should start a new cohort
        if (currentCohort.length >= MAX_COHORT_SIZE || 
            (currentCohort.length >= MIN_COHORT_SIZE && 
             i + MIN_COHORT_SIZE > locationAgents.length)) {
          // Save current cohort
          newCohorts.push({
            agents: [...currentCohort],
            location,
            tier: currentTier,
          });
          currentCohort = [];
          currentTier = item.tier;
        }
        
        currentCohort.push(item.agent);
      }
      
      // Handle remaining agents
      if (currentCohort.length > 0) {
        // If we have less than minimum, try to merge with previous cohort if possible
        if (currentCohort.length < MIN_COHORT_SIZE && newCohorts.length > 0) {
          const lastCohort = newCohorts[newCohorts.length - 1];
          if (lastCohort.location === location && 
              lastCohort.agents.length + currentCohort.length <= MAX_COHORT_SIZE) {
            // Merge with previous cohort
            lastCohort.agents.push(...currentCohort);
            console.log(`Merged ${currentCohort.length} agents with previous ${location} cohort`);
          } else {
            // Can't merge, create anyway but warn
            console.log(`Warning: Creating ${location} cohort with only ${currentCohort.length} agents`);
            newCohorts.push({
              agents: currentCohort,
              location,
              tier: currentTier,
            });
          }
        } else {
          // Normal case - add the cohort
          newCohorts.push({
            agents: currentCohort,
            location,
            tier: currentTier,
          });
        }
      }
    });
    
    // Sort cohorts to alternate between locations
    newCohorts.sort((a, b) => {
      // First by size (larger cohorts first to ensure they get scheduled)
      if (a.agents.length !== b.agents.length) {
        return b.agents.length - a.agents.length;
      }
      // Then alternate locations
      return a.location === b.location ? 0 : 1;
    });

    // Schedule the cohorts with location alternation
    const sortedTimeSlots = [...TIME_SLOTS].sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let cohortIndex = 0;
    let lastScheduledLocation: "CLT" | "ATX" | null = null;

    for (const timeSlot of sortedTimeSlots) {
      if (cohortIndex >= newCohorts.length) break;

      // Try to find a cohort that alternates location
      let selectedIndex = -1;

      // First, try to find a cohort from a different location
      for (let i = cohortIndex; i < newCohorts.length; i++) {
        if (
          !lastScheduledLocation ||
          newCohorts[i].location !== lastScheduledLocation
        ) {
          selectedIndex = i;
          break;
        }
      }

      // If no alternating location found, take the next one
      if (selectedIndex === -1 && cohortIndex < newCohorts.length) {
        selectedIndex = cohortIndex;
      }

      if (selectedIndex === -1) break;

      // Swap if needed
      if (selectedIndex !== cohortIndex) {
        const temp = newCohorts[cohortIndex];
        newCohorts[cohortIndex] = newCohorts[selectedIndex];
        newCohorts[selectedIndex] = temp;
      }

      const cohort = newCohorts[cohortIndex];

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
      lastScheduledLocation = cohort.location;
      cohortIndex++;
    }

    if (cohortIndex < newCohorts.length) {
      console.log(
        `Warning: ${
          newCohorts.length - cohortIndex
        } cohorts couldn't be scheduled on ${day}`
      );
    }
  }
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

  // Sort zero CAP cohorts by location to try and alternate
  allZeroCAPCohorts.sort((a, b) => a.location.localeCompare(b.location));

  const sortedTimeSlots = [...TIME_SLOTS].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  for (const timeSlot of sortedTimeSlots) {
    if (cohortIndex >= allZeroCAPCohorts.length + startIndex) break;

    const cohort = allZeroCAPCohorts[cohortIndex - startIndex];

    // Site alternation
    if (lastLocation === cohort.location) {
      // Try to find an alternating location cohort
      const alternateCohortIndex = allZeroCAPCohorts.findIndex(
        (c, idx) =>
          idx >= cohortIndex - startIndex && c.location !== lastLocation
      );
      if (alternateCohortIndex !== -1) {
        // Swap with the found alternate cohort
        const temp = allZeroCAPCohorts[cohortIndex - startIndex];
        allZeroCAPCohorts[cohortIndex - startIndex] =
          allZeroCAPCohorts[alternateCohortIndex];
        allZeroCAPCohorts[alternateCohortIndex] = temp;
      } else {
        // If no alternate found, break to avoid consecutive same-site scheduling
        break;
      }
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

  schedule.forEach((day) => {
    let lastLocationForDay: "CLT" | "ATX" | null = null;
    const sessionsByTime: { [time: string]: { CLT?: boolean; ATX?: boolean } } =
      {};

    day.sessions.forEach((session) => {
      // Check for same-location consecutive sessions (within a day)
      if (lastLocationForDay === session.location) {
        warnings.push(
          `Consecutive sessions for ${session.location} on ${day.day} at ${session.time}. Consider re-evaluating alternation.`
        );
      }
      lastLocationForDay = session.location;

      // Check for cross-location conflicts (same time slot, both locations)
      if (!sessionsByTime[session.time]) {
        sessionsByTime[session.time] = {};
      }
      if (session.location === "CLT") {
        sessionsByTime[session.time].CLT = true;
      } else {
        sessionsByTime[session.time].ATX = true;
      }

      if (session.agents.length > 5) {
        errors.push(
          `Cohort too large (${session.agents.length} agents) in ${session.location} ${session.tier} on ${day.day}`
        );
      }
      
      if (session.agents.length < 2 && session.tier !== "Zero CAP Remediation") {
        warnings.push(
          `Cohort below minimum size (${session.agents.length} agents) in ${session.location} on ${day.day} at ${session.time}. Consider combining with another cohort or waiting for more agents.`
        );
      }

      if (session.time.includes("12:00") || session.time.includes("1:00")) {
        errors.push(
          `Training scheduled during lunch hour: ${day.day} ${session.time}`
        );
      }
    });

    // Check for cross-location conflicts
    for (const time in sessionsByTime) {
      if (sessionsByTime[time].CLT && sessionsByTime[time].ATX) {
        errors.push(
          `Conflict: Both CLT and ATX scheduled on ${day.day} at ${time}`
        );
      }
    }
  });

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
