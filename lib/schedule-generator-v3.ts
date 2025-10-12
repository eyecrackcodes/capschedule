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
  [key: string]: { // key format: "manager-day-time"
    count: number;
    agents: string[];
  };
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

  // Initialize days
  DAYS_OF_WEEK.forEach((day) => {
    schedule.push({
      day,
      sessions: [],
    });
  });

  // Get schedule map for easy access
  const scheduleMap = new Map(schedule.map((s) => [s.day, s]));

  // Schedule zero CAP agents on Friday with constraints
  const fridaySchedule = scheduleMap.get("Friday")!;
  scheduleZeroCAPAgentsWithConstraints(
    fridaySchedule, 
    cohorts.zeroCAPAgents, 
    agentTracker, 
    managerTracker
  );

  // Schedule metric-specific training on Tuesday, Wednesday, Thursday with constraints
  scheduleMetricSpecificTrainingWithConstraints(
    scheduleMap, 
    cohorts, 
    avgCAPScore, 
    agentTracker, 
    managerTracker
  );

  return schedule;
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
    console.log(`Agent ${agent.name} already has ${MAX_SESSIONS_PER_AGENT_PER_WEEK} sessions this week`);
    return false;
  }

  // Check manager's agents in this time slot
  const managerSlotKey = `${agent.manager}-${day}-${time}`;
  if (!managerTracker[managerSlotKey]) {
    managerTracker[managerSlotKey] = { count: 0, agents: [] };
  }

  if (managerTracker[managerSlotKey].count >= MAX_AGENTS_PER_MANAGER_PER_SLOT) {
    console.log(`Manager ${agent.manager} already has ${MAX_AGENTS_PER_MANAGER_PER_SLOT} agents in ${day} ${time}`);
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

function scheduleMetricSpecificTrainingWithConstraints(
  scheduleMap: Map<string, DaySchedule>,
  cohorts: Cohorts,
  avgCAPScore: number,
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker
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
            // Check if agent hasn't hit weekly limit
            const agentKey = agent.name;
            const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
            if (currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK) {
              agentsNeedingTraining.push({
                agent,
                location,
                tier,
                priority: getPriorityLevel(agent.capScore, avgCAPScore),
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

    console.log(`Found ${agentsNeedingTraining.length} agents needing ${requiredTraining} (after weekly limit filter)`);

    // Sort by priority and CAP score
    agentsNeedingTraining.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.agent.capScore - b.agent.capScore;
    });

    // Schedule agents into time slots with constraints
    const sortedTimeSlots = [...TIME_SLOTS].sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const timeSlot of sortedTimeSlots) {
      const cltCohort: AgentRecord[] = [];
      const atxCohort: AgentRecord[] = [];

      // Try to fill cohorts while respecting constraints
      for (const item of agentsNeedingTraining) {
        const targetCohort = item.location === "CLT" ? cltCohort : atxCohort;
        
        if (targetCohort.length < 5) { // Max cohort size
          if (canScheduleAgent(item.agent, day, timeSlot.time, agentTracker, managerTracker)) {
            targetCohort.push(item.agent);
            recordAgentScheduled(item.agent, day, timeSlot.time, agentTracker, managerTracker);
          }
        }
      }

      // Remove scheduled agents from the pool
      const scheduledAgentNames = new Set([
        ...cltCohort.map(a => a.name),
        ...atxCohort.map(a => a.name)
      ]);
      
      // Filter out scheduled agents
      for (let i = agentsNeedingTraining.length - 1; i >= 0; i--) {
        if (scheduledAgentNames.has(agentsNeedingTraining[i].agent.name)) {
          agentsNeedingTraining.splice(i, 1);
        }
      }

      // Create sessions for cohorts with at least 2 agents
      if (cltCohort.length >= 2) {
        const session: TrainingSession = {
          time: timeSlot.time,
          location: "CLT",
          tier: cltCohort[0].tier === "P" ? "Performance" : "Standard",
          agents: cltCohort,
          priority: `${timeSlot.description} - ${TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]}`,
          cohortNumber: daySchedule.sessions.filter(s => s.location === "CLT").length + 1,
        };
        daySchedule.sessions.push(session);
      } else if (cltCohort.length === 1) {
        console.log(`Warning: Only 1 CLT agent for ${day} ${timeSlot.time} - not creating session`);
        // Return the agent to the pool
        agentsNeedingTraining.unshift({
          agent: cltCohort[0],
          location: "CLT",
          tier: cltCohort[0].tier === "P" ? "Performance" : "Standard",
          priority: getPriorityLevel(cltCohort[0].capScore, avgCAPScore),
        });
        // Remove from trackers
        const agentKey = cltCohort[0].name;
        agentTracker[agentKey].sessionCount--;
        const managerKey = `${cltCohort[0].manager}-${day}-${timeSlot.time}`;
        managerTracker[managerKey].count--;
      }

      if (atxCohort.length >= 2) {
        const session: TrainingSession = {
          time: timeSlot.time,
          location: "ATX",
          tier: atxCohort[0].tier === "P" ? "Performance" : "Standard",
          agents: atxCohort,
          priority: `${timeSlot.description} - ${TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS]}`,
          cohortNumber: daySchedule.sessions.filter(s => s.location === "ATX").length + 1,
        };
        daySchedule.sessions.push(session);
      } else if (atxCohort.length === 1) {
        console.log(`Warning: Only 1 ATX agent for ${day} ${timeSlot.time} - not creating session`);
        // Return the agent to the pool
        agentsNeedingTraining.unshift({
          agent: atxCohort[0],
          location: "ATX",
          tier: atxCohort[0].tier === "P" ? "Performance" : "Standard",
          priority: getPriorityLevel(atxCohort[0].capScore, avgCAPScore),
        });
        // Remove from trackers
        const agentKey = atxCohort[0].name;
        agentTracker[agentKey].sessionCount--;
        const managerKey = `${atxCohort[0].manager}-${day}-${timeSlot.time}`;
        managerTracker[managerKey].count--;
      }
    }

    if (agentsNeedingTraining.length > 0) {
      console.log(`Warning: ${agentsNeedingTraining.length} agents couldn't be scheduled on ${day} due to constraints`);
    }
  }
}

function scheduleZeroCAPAgentsWithConstraints(
  daySchedule: DaySchedule,
  zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] },
  agentTracker: AgentScheduleTracker,
  managerTracker: ManagerSlotTracker,
  startIndex: number = 0
) {
  const allCohorts: Array<{ agents: AgentRecord[]; location: "CLT" | "ATX" }> = [];

  // Flatten and prepare cohorts
  zeroCAPAgents.clt.forEach((cohort) => {
    const eligibleAgents = cohort.filter(agent => {
      const agentKey = agent.name;
      const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
      return currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK;
    });
    
    if (eligibleAgents.length >= 2) {
      allCohorts.push({ agents: eligibleAgents.slice(0, 5), location: "CLT" });
    }
  });

  zeroCAPAgents.atx.forEach((cohort) => {
    const eligibleAgents = cohort.filter(agent => {
      const agentKey = agent.name;
      const currentSessions = agentTracker[agentKey]?.sessionCount || 0;
      return currentSessions < MAX_SESSIONS_PER_AGENT_PER_WEEK;
    });
    
    if (eligibleAgents.length >= 2) {
      allCohorts.push({ agents: eligibleAgents.slice(0, 5), location: "ATX" });
    }
  });

  console.log(`\nScheduling Zero CAP agents on ${daySchedule.day}:`);
  console.log(`Total cohorts to schedule: ${allCohorts.length}`);

  let cohortIndex = startIndex;
  let lastScheduledLocation: "CLT" | "ATX" | null = null;

  for (const timeSlot of TIME_SLOTS) {
    if (cohortIndex >= allCohorts.length) break;

    // Try to alternate locations
    let selectedIndex = -1;
    for (let i = cohortIndex; i < allCohorts.length; i++) {
      const cohort = allCohorts[i];
      
      // Check if all agents in cohort can be scheduled
      const canScheduleAll = cohort.agents.every(agent => 
        canScheduleAgent(agent, daySchedule.day, timeSlot.time, agentTracker, managerTracker)
      );

      if (canScheduleAll && (!lastScheduledLocation || cohort.location !== lastScheduledLocation)) {
        selectedIndex = i;
        break;
      }
    }

    // If can't alternate, try to find any cohort that fits constraints
    if (selectedIndex === -1) {
      for (let i = cohortIndex; i < allCohorts.length; i++) {
        const cohort = allCohorts[i];
        const canScheduleAll = cohort.agents.every(agent => 
          canScheduleAgent(agent, daySchedule.day, timeSlot.time, agentTracker, managerTracker)
        );
        
        if (canScheduleAll) {
          selectedIndex = i;
          break;
        }
      }
    }

    if (selectedIndex === -1) continue;

    // Swap to maintain order
    if (selectedIndex !== cohortIndex) {
      const temp = allCohorts[cohortIndex];
      allCohorts[cohortIndex] = allCohorts[selectedIndex];
      allCohorts[selectedIndex] = temp;
    }

    const cohort = allCohorts[cohortIndex];

    // Record all agents as scheduled
    cohort.agents.forEach(agent => {
      recordAgentScheduled(agent, daySchedule.day, timeSlot.time, agentTracker, managerTracker);
    });

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
    lastScheduledLocation = cohort.location;
    cohortIndex++;
  }

  if (cohortIndex < allCohorts.length) {
    console.log(
      `Warning: ${allCohorts.length - cohortIndex} Zero CAP cohorts couldn't be scheduled due to constraints`
    );
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
    const timeSlotUsage = new Set<string>();

    day.sessions.forEach((session) => {
      const timeLocationKey = `${day.day}-${session.time}-${session.location}`;

      // Check for duplicate time slots
      if (timeSlotUsage.has(timeLocationKey)) {
        errors.push(
          `Duplicate session: ${session.location} at ${session.time} on ${day.day}`
        );
      }
      timeSlotUsage.add(timeLocationKey);

      // Check cohort size constraints
      if (session.agents.length < 2 && session.tier !== "Zero CAP Remediation") {
        warnings.push(
          `Cohort below minimum size (${session.agents.length} agents) in ${session.location} on ${day.day} at ${session.time}. Consider combining with another cohort or waiting for more agents.`
        );
      }

      if (session.agents.length > 5) {
        errors.push(
          `Cohort exceeds maximum size (${session.agents.length} agents) in ${session.location} on ${day.day} at ${session.time}`
        );
      }

      // Track agent sessions
      session.agents.forEach((agent) => {
        agentSessionCount[agent.name] = (agentSessionCount[agent.name] || 0) + 1;
        
        // Track manager slots
        const managerKey = `${agent.manager}-${day.day}-${session.time}`;
        managerSlotCount[managerKey] = (managerSlotCount[managerKey] || 0) + 1;
      });
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
      const [manager, day, time] = key.split('-').slice(0, 3);
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
