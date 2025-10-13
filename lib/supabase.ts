import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file."
  );
}

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface TrainingSchedule {
  id: string;
  week_of: string;
  generated_at: string;
  avg_cap_score: number;
  avg_adjusted_cap_score: number;
  total_agents_scheduled: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  schedule_id: string;
  day: "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  time_slot: string;
  location: "CLT" | "ATX";
  tier: string;
  training_type: string;
  priority: string;
  cohort_number: number;
  created_at: string;
}

export interface AgentAssignment {
  id: string;
  session_id: string;
  schedule_id: string;
  agent_name: string;
  manager: string;
  site: "CHA" | "AUS";
  tier_code: "P" | "S";
  original_cap_score: number;
  adjusted_cap_score: number;
  lead_attainment: number;
  leads_per_day: number;
  tenure: number;
  close_rate: number | null;
  annual_premium: number | null;
  place_rate: number | null;
  recommended_training: string[] | null;
  attended: boolean | null;
  attendance_marked_at: string | null;
  attendance_marked_by: string | null;
  no_show_reason: string | null;
  rescheduled_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CAPScoreHistory {
  id: string;
  agent_name: string;
  week_of: string;
  original_cap_score: number;
  adjusted_cap_score: number;
  lead_attainment: number;
  leads_per_day: number;
  close_rate: number | null;
  annual_premium: number | null;
  place_rate: number | null;
  manager: string;
  site: string;
  tier_code: string;
  created_at: string;
}

