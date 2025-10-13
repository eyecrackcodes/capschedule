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

// Business constraints
const MAX_SESSIONS_PER_AGENT_PER_WEEK = 2;
const MAX_AGENTS_PER_MANAGER_PER_SLOT = 2; // Don't pull more than 2 agents from same manager at once

interface AgentScheduleTracker {
  [agentName: string]: {
    sessionCount: number;
    scheduledDays: string[];
  };
}

interface ManagerSlotTracker {
  [key: string]: {
    // key format: "manager-day-time"
    count: number;
    agents: string[];
  };
}

interface TimeSlotUsageTracker {
  [key: string]: "CLT" | "ATX"; // key format: "day-time"
}

export function generateSchedule(
  cohorts: Cohorts & {
    zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] };
  },
  avgCAPScore: number
): DaySchedule[] {
  const schedule: DaySchedule[] = [];
  const agentTracker: AgentScheduleTracker = {};
  const managerTracker: ManagerSlotTracker = {};
  const timeSlotUsage: TimeSlotUsageTracker = {};

  // Initialize days
  DAYS_OF_WEEK.forEach((day) => {
    schedule.push({
      day,
      sessions: [],
    });
  });

  // Get schedule map for easy access
  const scheduleMap = new Map(schedule.map((s) => [s.day, s]));

  // Schedule overfill/remediation on Friday mornings (pre-lunch slots)
  const fridaySchedule = scheduleMap.get("Friday")!;
  scheduleFridayOverfill(
    fridaySchedule,
    cohorts,
    avgCAPScore,
    agentTracker,
    managerTracker,
    timeSlotUsage
  );

  // Schedule metric-specific training on Tuesday, Wednesday, Thursday with conflict prevention
  scheduleMetricSpecificTrainingNoConflicts(
    scheduleMap,
    cohorts,
    avgCAPScore,
    agentTracker,
    managerTracker,
    timeSlotUsage
  );

  return schedule;
}

function isTimeSlotAvailable(
  day: string,
  time: string,
  location: "CLT" | "ATX",
  timeSlotUsage: TimeSlotUsageTracker
): boolean {
  const key = `${day}-${time}`;
  // Only allow if slot is completely empty
  return !timeSlotUsage[key];
}

function markTimeSlotUsed(
  day: string,
  time: string,
  location: "CLT" | "ATX",
  timeSlotUsage: TimeSlotUsageTracker
): void {
  const key = `${day}-${time}`;
  if (timeSlotUsage[key]) {
    console.error(
      `WARNING: Time slot ${key} was already taken by ${timeSlotUsage[key]}, NOT overwriting with ${location}`
    );
    return; // Don't overwrite existing slots
  }
  timeSlotUsage[key] = location;
}

function canScheduleAgent(
  agent: AgentRecord,
  day: string,
  time: string,
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker
): boolean {
  // Check agent's weekly session limit
  const agentKey = agent.name;
  if (!agentTracker[agentKey]) {
    agentTracker[agentKey] = { sessionCount: 0, scheduledDays: [] };
  }

  if (agentTracker[agentKey].sessionCount >= MAX_SESSIONS_PER_AGENT_PER_WEEK) {
    console.log(
      `Agent ${agent.name} already has ${MAX_SESSIONS_PER_AGENT_PER_WEEK} sessions this week`
    );
    return false;
  }

  // Check manager's agents in this time slot
  const managerSlotKey = `${agent.manager}-${day}-${time}`;
  if (!managerTracker[managerSlotKey]) {
    managerTracker[managerSlotKey] = { count: 0, agents: [] };
  }

  if (managerTracker[managerSlotKey].count >= MAX_AGENTS_PER_MANAGER_PER_SLOT) {
    console.log(
      `Manager ${agent.manager} already has ${MAX_AGENTS_PER_MANAGER_PER_SLOT} agents in ${day} ${time}`
    );
    return false;
  }

  return true;
}

function recordAgentScheduled(
  agent: AgentRecord,
  day: string,
  time: string,
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker
): void {
  // Update agent tracker
  const agentKey = agent.name;
  if (!agentTracker[agentKey]) {
    agentTracker[agentKey] = { sessionCount: 0, scheduledDays: [] };
  }
  agentTracker[agentKey].sessionCount++;
  agentTracker[agentKey].scheduledDays.push(day);

  // Update manager tracker
  const managerSlotKey = `${agent.manager}-${day}-${time}`;
  if (!managerTracker[managerSlotKey]) {
    managerTracker[managerSlotKey] = { count: 0, agents: [] };
  }
  managerTracker[managerSlotKey].count++;
  managerTracker[managerSlotKey].agents.push(agent.name);
}

function scheduleFridayOverfill(
  fridaySchedule: DaySchedule,
  cohorts: Cohorts & {
    zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] };
  },
  avgCAPScore: number,
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker,
  timeSlotUsage: TimeSlotUsageTracker
) {
  console.log("\nScheduling Friday morning overfill sessions:");

  // Get only morning (pre-lunch) time slots
  const morningSlots = TIME_SLOTS.filter((slot) => {
    // Parse the time to check if it's before noon
    const timeMatch = slot.time.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      // Consider slots before 12:00 PM as morning slots
      return hour < 12;
    }
    return false;
  });

  // First, schedule Zero CAP agents
  const allZeroCAPAgents: Array<{
    agent: AgentRecord;
    location: "CLT" | "ATX";
  }> = [];

  cohorts.zeroCAPAgents.clt.forEach((cohort) => {
    cohort.forEach((agent) => {
      const agentKey = agent.name;
      const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
      if (currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK) {
        allZeroCAPAgents.push({ agent, location: "CLT" });
      }
    });
  });

  cohorts.zeroCAPAgents.atx.forEach((cohort) => {
    cohort.forEach((agent) => {
      const agentKey = agent.name;
      const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
      if (currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK) {
        allZeroCAPAgents.push({ agent, location: "ATX" });
      }
    });
  });

  // Then add any agents who need additional training (overfill)
  const overfillAgents: Array<{
    agent: AgentRecord;
    location: "CLT" | "ATX";
    tier: "Performance" | "Standard";
  }> = [];

  const collectOverfillAgents = (
    cohortGroup: AgentRecord[][],
    location: "CLT" | "ATX",
    tier: "Performance" | "Standard"
  ) => {
    cohortGroup.forEach((cohort) => {
      cohort.forEach((agent) => {
        const agentKey = agent.name;
        const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
        if (
          currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK &&
          agent.recommendedTraining &&
          agent.recommendedTraining.length > 1
        ) {
          overfillAgents.push({ agent, location, tier });
        }
      });
    });
  };

  collectOverfillAgents(cohorts.cltPerformance, "CLT", "Performance");
  collectOverfillAgents(cohorts.cltStandard, "CLT", "Standard");
  collectOverfillAgents(cohorts.atxPerformance, "ATX", "Performance");
  collectOverfillAgents(cohorts.atxStandard, "ATX", "Standard");

  // Sort by priority (using adjusted CAP scores)
  overfillAgents.sort((a, b) => {
    const aPriority = getPriorityLevel(a.agent.adjustedCAPScore, avgCAPScore);
    const bPriority = getPriorityLevel(b.agent.adjustedCAPScore, avgCAPScore);
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (aPriority !== bPriority) {
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    }
    return a.agent.adjustedCAPScore - b.agent.adjustedCAPScore;
  });

  // Schedule agents in morning slots, alternating locations
  let lastScheduledLocation: "CLT" | "ATX" | null = null;

  for (const timeSlot of morningSlots) {
    // Try to schedule Zero CAP agents first
    const zeroCAPCohort: { clt: AgentRecord[]; atx: AgentRecord[] } = {
      clt: [],
      atx: [],
    };

    for (const item of allZeroCAPAgents) {
      const targetCohort =
        item.location === "CLT" ? zeroCAPCohort.clt : zeroCAPCohort.atx;

      if (
        targetCohort.length < 5 &&
        canScheduleAgent(
          item.agent,
          fridaySchedule.day,
          timeSlot.time,
          agentTracker,
          managerTracker
        ) &&
        isTimeSlotAvailable(
          fridaySchedule.day,
          timeSlot.time,
          item.location,
          timeSlotUsage
        )
      ) {
        targetCohort.push(item.agent);
      }
    }

    // Schedule CLT or ATX based on alternation and availability
    const locationsToTry: Array<"CLT" | "ATX"> =
      lastScheduledLocation === "CLT" ? ["ATX", "CLT"] : ["CLT", "ATX"];

    for (const location of locationsToTry) {
      const cohort = location === "CLT" ? zeroCAPCohort.clt : zeroCAPCohort.atx;

      if (
        cohort.length >= 2 &&
        isTimeSlotAvailable(
          fridaySchedule.day,
          timeSlot.time,
          location,
          timeSlotUsage
        )
      ) {
        // Double-check no session exists at this time
        const existingSessionAtTime = fridaySchedule.sessions.find(
          (s) => s.time === timeSlot.time
        );
        if (existingSessionAtTime) {
          console.error(
            `BLOCKING Friday: Session already exists at ${timeSlot.time} for ${existingSessionAtTime.location}`
          );
          continue;
        }
        // Record agents and time slot
        cohort.forEach((agent) => {
          recordAgentScheduled(
            agent,
            fridaySchedule.day,
            timeSlot.time,
            agentTracker,
            managerTracker
          );
        });
        markTimeSlotUsed(
          fridaySchedule.day,
          timeSlot.time,
          location,
          timeSlotUsage
        );

        const session: TrainingSession = {
          time: timeSlot.time,
          location,
          tier: "Zero CAP Remediation",
          agents: cohort,
          priority: `${timeSlot.description} - Friday Overfill/Remediation`,
          cohortNumber:
            fridaySchedule.sessions.filter((s) => s.location === location)
              .length + 1,
        };

        fridaySchedule.sessions.push(session);
        lastScheduledLocation = location;

        // Remove scheduled agents from the pool
        allZeroCAPAgents.splice(
          0,
          allZeroCAPAgents.length,
          ...allZeroCAPAgents.filter((item) => !cohort.includes(item.agent))
        );

        break; // Only schedule one location per time slot
      }
    }

    // If we still have time slots and no zero CAP agents, schedule overfill
    if (allZeroCAPAgents.length === 0 && overfillAgents.length > 0) {
      const overfillCohort: {
        clt: Array<{ agent: AgentRecord; tier: "Performance" | "Standard" }>;
        atx: Array<{ agent: AgentRecord; tier: "Performance" | "Standard" }>;
      } = { clt: [], atx: [] };

      for (const item of overfillAgents) {
        const targetCohort =
          item.location === "CLT" ? overfillCohort.clt : overfillCohort.atx;

        if (
          targetCohort.length < 5 &&
          canScheduleAgent(
            item.agent,
            fridaySchedule.day,
            timeSlot.time,
            agentTracker,
            managerTracker
          ) &&
          isTimeSlotAvailable(
            fridaySchedule.day,
            timeSlot.time,
            item.location,
            timeSlotUsage
          )
        ) {
          targetCohort.push({ agent: item.agent, tier: item.tier });
        }
      }

      // Schedule overfill cohorts
      for (const location of locationsToTry) {
        const cohort =
          location === "CLT" ? overfillCohort.clt : overfillCohort.atx;

        if (
          cohort.length >= 2 &&
          isTimeSlotAvailable(
            fridaySchedule.day,
            timeSlot.time,
            location,
            timeSlotUsage
          )
        ) {
          // Double-check no session exists at this time
          const existingSessionAtTime = fridaySchedule.sessions.find(
            (s) => s.time === timeSlot.time
          );
          if (existingSessionAtTime) {
            console.error(
              `BLOCKING Friday overfill: Session already exists at ${timeSlot.time} for ${existingSessionAtTime.location}`
            );
            continue;
          }
          // Determine tier (use most common tier in cohort)
          const tierCounts = cohort.reduce((acc, item) => {
            acc[item.tier] = (acc[item.tier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const tier = Object.entries(tierCounts).reduce((a, b) =>
            tierCounts[a[0]] > tierCounts[b[0]] ? a : b
          )[0] as "Performance" | "Standard";

          // Record agents and time slot
          cohort.forEach((item) => {
            recordAgentScheduled(
              item.agent,
              fridaySchedule.day,
              timeSlot.time,
              agentTracker,
              managerTracker
            );
          });
          markTimeSlotUsed(
            fridaySchedule.day,
            timeSlot.time,
            location,
            timeSlotUsage
          );

          const session: TrainingSession = {
            time: timeSlot.time,
            location,
            tier,
            agents: cohort.map((item) => item.agent),
            priority: `${timeSlot.description} - Friday Overfill Training`,
            cohortNumber:
              fridaySchedule.sessions.filter((s) => s.location === location)
                .length + 1,
          };

          fridaySchedule.sessions.push(session);
          lastScheduledLocation = location;

          // Remove scheduled agents from the pool
          overfillAgents.splice(
            0,
            overfillAgents.length,
            ...overfillAgents.filter(
              (item) => !cohort.some((c) => c.agent === item.agent)
            )
          );

          break; // Only schedule one location per time slot
        }
      }
    }
  }

  console.log(
    `Scheduled ${fridaySchedule.sessions.length} Friday morning overfill sessions`
  );
}

function scheduleMetricSpecificTrainingNoConflicts(
  scheduleMap: Map<string, DaySchedule>,
  cohorts: Cohorts,
  avgCAPScore: number,
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker,
  timeSlotUsage: TimeSlotUsageTracker
) {
  const trainingDays = ["Tuesday", "Wednesday", "Thursday"] as const;

  for (const day of trainingDays) {
    const daySchedule = scheduleMap.get(day)!;
    const requiredTraining = TRAINING_DAY_MAP[day];

    console.log(`\nScheduling ${day} - ${requiredTraining}:`);

    // Collect agents needing this training
    const agentsNeedingTraining: Array<{
      agent: AgentRecord;
      location: "CLT" | "ATX";
      tier: "Performance" | "Standard";
      priority: "HIGH" | "MEDIUM" | "LOW";
    }> = [];

    const collectAgents = (
      cohortGroup: AgentRecord[][],
      location: "CLT" | "ATX",
      tier: "Performance" | "Standard"
    ) => {
      cohortGroup.forEach((cohort) => {
        cohort.forEach((agent) => {
          if (agent.recommendedTraining?.includes(requiredTraining)) {
            const agentKey = agent.name;
            const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
            if (currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK) {
              agentsNeedingTraining.push({
                agent,
                location,
                tier,
                priority: getPriorityLevel(agent.adjustedCAPScore, avgCAPScore),
              });
            }
          }
        });
      });
    };

    collectAgents(cohorts.cltPerformance, "CLT", "Performance");
    collectAgents(cohorts.cltStandard, "CLT", "Standard");
    collectAgents(cohorts.atxPerformance, "ATX", "Performance");
    collectAgents(cohorts.atxStandard, "ATX", "Standard");

    console.log(
      `Found ${agentsNeedingTraining.length} agents needing ${requiredTraining}`
    );

    // Sort by priority and adjusted CAP score
    agentsNeedingTraining.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.agent.adjustedCAPScore - b.agent.adjustedCAPScore;
    });

    // Schedule agents into time slots with conflict prevention
    const sortedTimeSlots = [...TIME_SLOTS].sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let lastScheduledLocation: "CLT" | "ATX" | null = null;

    for (const timeSlot of sortedTimeSlots) {
      // Check if this time slot is already taken by any location
      const timeSlotKey = `${day}-${timeSlot.time}`;
      if (timeSlotUsage[timeSlotKey]) {
        continue; // Skip this time slot entirely
      }

      // Determine which location should be scheduled based on alternation
      const locationsToTry: Array<"CLT" | "ATX"> =
        lastScheduledLocation === "CLT" ? ["ATX", "CLT"] : ["CLT", "ATX"];

      for (const targetLocation of locationsToTry) {
        // Double-check if time slot is available (should always be true now)
        if (
          !isTimeSlotAvailable(
            day,
            timeSlot.time,
            targetLocation,
            timeSlotUsage
          )
        ) {
          continue;
        }

        // Build cohort for this location
        const cohort: AgentRecord[] = [];
        const cohortTiers: Array<"Performance" | "Standard"> = [];

        for (let i = 0; i < agentsNeedingTraining.length; i++) {
          const item = agentsNeedingTraining[i];

          if (item.location === targetLocation && cohort.length < 5) {
            if (
              canScheduleAgent(
                item.agent,
                day,
                timeSlot.time,
                agentTracker,
                managerTracker
              )
            ) {
              cohort.push(item.agent);
              cohortTiers.push(item.tier);
            }
          }
        }

        // Only create session if we have at least 2 agents
        if (cohort.length >= 2) {
          // Double-check no other session exists at this time
          const existingSessionAtTime = daySchedule.sessions.find(
            (s) => s.time === timeSlot.time
          );
          if (existingSessionAtTime) {
            console.error(
              `BLOCKING: Session already exists at ${day} ${timeSlot.time} for ${existingSessionAtTime.location}`
            );
            continue;
          }
          // Determine tier (use most common tier in cohort)
          const tierCounts = cohortTiers.reduce((acc, tier) => {
            acc[tier] = (acc[tier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const tier = Object.entries(tierCounts).reduce((a, b) =>
            tierCounts[a[0]] > tierCounts[b[0]] ? a : b
          )[0] as "Performance" | "Standard";

          // Record agents and time slot
          cohort.forEach((agent) => {
            recordAgentScheduled(
              agent,
              day,
              timeSlot.time,
              agentTracker,
              managerTracker
            );
          });
          markTimeSlotUsed(day, timeSlot.time, targetLocation, timeSlotUsage);

          // Remove scheduled agents from the pool
          agentsNeedingTraining.splice(
            0,
            agentsNeedingTraining.length,
            ...agentsNeedingTraining.filter(
              (item) => !cohort.includes(item.agent)
            )
          );

          const session: TrainingSession = {
            time: timeSlot.time,
            location: targetLocation,
            tier,
            agents: cohort,
            priority: `${timeSlot.description} - ${
              TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]
            }`,
            cohortNumber:
              daySchedule.sessions.filter((s) => s.location === targetLocation)
                .length + 1,
          };

          daySchedule.sessions.push(session);
          lastScheduledLocation = targetLocation;
          break; // Move to next time slot after scheduling one location
        }
      }
    }

    if (agentsNeedingTraining.length > 0) {
      console.log(
        `Warning: ${agentsNeedingTraining.length} agents couldn't be scheduled on ${day} due to conflicts/constraints`
      );
    }
  }
}

export function validateSchedule(schedule: DaySchedule[]): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const agentSessionCount: { [name: string]: number } = {};
  const managerSlotCount: { [key: string]: number } = {};

  schedule.forEach((day) => {
    const timeSlotLocationMap: { [time: string]: Set<"CLT" | "ATX"> } = {};

    day.sessions.forEach((session) => {
      // Check for conflicts (both locations at same time)
      if (!timeSlotLocationMap[session.time]) {
        timeSlotLocationMap[session.time] = new Set();
      }

      if (timeSlotLocationMap[session.time].has(session.location)) {
        errors.push(
          `Duplicate session: ${session.location} scheduled twice at ${session.time} on ${day.day}`
        );
      }

      timeSlotLocationMap[session.time].add(session.location);

      // Check cohort size constraints
      if (
        session.agents.length < 2 &&
        session.tier !== "Zero CAP Remediation"
      ) {
        warnings.push(
          `Cohort below minimum size (${session.agents.length} agents) in ${session.location} on ${day.day} at ${session.time}`
        );
      }

      if (session.agents.length > 5) {
        errors.push(
          `Cohort exceeds maximum size (${session.agents.length} agents) in ${session.location} on ${day.day} at ${session.time}`
        );
      }

      // Check for lunch hour scheduling
      if (session.time.includes("12:00") || session.time.includes("1:00")) {
        errors.push(
          `Training scheduled during lunch hour: ${day.day} ${session.time}`
        );
      }

      // Track agent sessions
      session.agents.forEach((agent) => {
        agentSessionCount[agent.name] =
          (agentSessionCount[agent.name] || 0) + 1;

        // Track manager slots
        const managerKey = `${agent.manager}-${day.day}-${session.time}`;
        managerSlotCount[managerKey] = (managerSlotCount[managerKey] || 0) + 1;
      });
    });

    // Check for cross-location conflicts
    Object.entries(timeSlotLocationMap).forEach(([time, locations]) => {
      if (locations.size > 1) {
        errors.push(
          `Conflict: Both CLT and ATX scheduled on ${day.day} at ${time}`
        );
      }
    });
  });

  // Check agent weekly limits
  Object.entries(agentSessionCount).forEach(([agentName, count]) => {
    if (count > MAX_SESSIONS_PER_AGENT_PER_WEEK) {
      errors.push(
        `Agent ${agentName} is scheduled for ${count} sessions (max allowed: ${MAX_SESSIONS_PER_AGENT_PER_WEEK})`
      );
    }
  });

  // Check manager slot limits
  Object.entries(managerSlotCount).forEach(([key, count]) => {
    if (count > MAX_AGENTS_PER_MANAGER_PER_SLOT) {
      const parts = key.split("-");
      const manager = parts.slice(0, -2).join("-"); // Handle manager names with hyphens
      const day = parts[parts.length - 2];
      const time = parts[parts.length - 1];
      warnings.push(
        `Manager ${manager} has ${count} agents scheduled on ${day} at ${time} (recommended max: ${MAX_AGENTS_PER_MANAGER_PER_SLOT})`
      );
    }
  });

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
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
  const uniqueAgents = new Set<string>();

  schedule.forEach((day) => {
    day.sessions.forEach((session) => {
      totalSessions++;
      if (session.location === "CLT") {
        cltSessions++;
      } else {
        atxSessions++;
      }
      session.agents.forEach((agent) => {
        uniqueAgents.add(agent.name);
      });
    });
  });

  const totalAgentsScheduled = uniqueAgents.size;
  const weeklyCapacity = totalSessions * 5; // Assuming max 5 agents per session

  return {
    totalSessions,
    cltSessions,
    atxSessions,
    totalAgentsScheduled,
    weeklyCapacity,
  };
}
