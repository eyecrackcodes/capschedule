export interface AgentRecord {
  tenure: number;
  tier: "P" | "S";
  site: "CHA" | "AUS";
  manager: string;
  wowDelta: number;
  priorRank: number;
  currentRank: number;
  name: string;
  capScore: number;
  leadsPerDay: number;
  leadAttainment: number; // Percentage (0-100)
  adjustedCAPScore: number; // CAP Score adjusted by Lead Attainment
  email?: string;
  closeRate?: number;
  annualPremium?: number;
  placeRate?: number;
  recommendedTraining?: string[];
}

export interface TrainingSession {
  time: string; // '8:00-9:00 AM'
  location: "CLT" | "ATX";
  tier: "Performance" | "Standard" | "Zero CAP Remediation";
  agents: AgentRecord[];
  priority: string; // 'Pre-Peak' | 'Post-Lunch Lull' | etc.
  cohortNumber: number;
}

export interface DaySchedule {
  day: string; // 'Monday' | 'Tuesday' | etc.
  sessions: TrainingSession[];
}

export interface Stats {
  totalAgents: number;
  eligibleCount: number;
  excludedCount: number;
  avgCAPScore: number; // Average of raw CAP scores
  avgAdjustedCAPScore: number; // Average of adjusted CAP scores
  needsTraining: number;
  clt: { performance: number; standard: number; total: number };
  atx: { performance: number; standard: number; total: number };
}

export interface Cohorts {
  cltPerformance: AgentRecord[][];
  cltStandard: AgentRecord[][];
  atxPerformance: AgentRecord[][];
  atxStandard: AgentRecord[][];
}

export interface Filters {
  location: "all" | "CLT" | "ATX";
  tier: "all" | "performance" | "standard";
}

export interface AppState {
  file: File | null;
  rawData: AgentRecord[];
  eligibleAgents: AgentRecord[];
  stats: Stats;
  cohorts: Cohorts;
  schedule: DaySchedule[];
  filters: Filters;
  percentiles?: {
    performance: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
    standard: {
      closeRate50th: number;
      annualPremium50th: number;
      placeRate50th: number;
    };
  };
}

export interface TimeSlot {
  time: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

// Time slots with CST as the base (ATX operates 8-5 CST, CLT operates 9-6 EST)
// EXCLUDES 11:00 AM - 2:00 PM CST peak hours
export const TIME_SLOTS: TimeSlot[] = [
  {
    time: "8:30-9:30 AM CST / 9:30-10:30 AM EST",
    priority: "HIGH",
    description: "Pre-peak ramp up",
  },
  {
    time: "9:30-10:30 AM CST / 10:30-11:30 AM EST",
    priority: "HIGH",
    description: "Early morning",
  },
  // REMOVED: 10:30-11:30 AM CST (peak time 11am-2pm)
  // REMOVED: 11:00 AM - 2:00 PM CST (peak hours)
  {
    time: "2:00-3:00 PM CST / 3:00-4:00 PM EST",
    priority: "HIGH",
    description: "Post-lunch recovery",
  },
  {
    time: "3:00-4:00 PM CST / 4:00-5:00 PM EST",
    priority: "MEDIUM",
    description: "Afternoon dip",
  },
  {
    time: "4:00-5:00 PM CST / 5:00-6:00 PM EST",
    priority: "LOW",
    description: "Before evening peak",
  },
];

// Simplified time display for each location
export const ATX_TIME_SLOTS = [
  "8:30-9:30 AM CST",
  "9:30-10:30 AM CST",
  "10:30-11:30 AM CST",
  "2:00-3:00 PM CST",
  "3:00-4:00 PM CST",
  "4:00-5:00 PM CST",
];

export const CLT_TIME_SLOTS = [
  "9:30-10:30 AM EST",
  "10:30-11:30 AM EST",
  "11:30 AM-12:30 PM EST",
  "3:00-4:00 PM EST",
  "4:00-5:00 PM EST",
  "5:00-6:00 PM EST",
];

export const DAYS_OF_WEEK = [
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const TRAINING_FOCUS = {
  Tuesday: "Close Rate Training",
  Wednesday: "Annual Premium Training",
  Thursday: "Place Rate Training",
  Friday: "Zero CAP Score Remediation",
} as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
