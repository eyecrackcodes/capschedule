import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create Supabase client lazily to avoid build-time errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Only create client if we have valid env vars OR we're in the browser
    const url = supabaseUrl || "https://placeholder.supabase.co";
    const key = supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder";
    
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

// Export a proxy object that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

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

