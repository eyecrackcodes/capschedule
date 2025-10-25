import { supabase } from "./supabase";
import type {
  TrainingSchedule,
  TrainingSession,
  AgentAssignment,
  CAPScoreHistory,
} from "./supabase";
import type { DaySchedule, AgentRecord } from "@/types";

// ============================================================================
// SCHEDULE OPERATIONS
// ============================================================================

/**
 * Save a complete training schedule to the database
 */
export async function saveTrainingSchedule(
  schedule: DaySchedule[],
  weekOf: Date,
  avgCAPScore: number,
  avgAdjustedCAPScore: number,
  fullStats?: {
    totalAgents: number;
    excludedCount: number;
    eligibleCount: number;
  },
  updateExisting: boolean = false
) {
  try {
    // 1. Check if schedule already exists for this week
    const { data: existingSchedule, error: checkError } = await supabase
      .from("training_schedules")
      .select("id")
      .eq("week_of", weekOf.toISOString().split("T")[0])
      .single();

    if (existingSchedule && !updateExisting) {
      throw new Error(
        `A schedule for the week of ${weekOf.toLocaleDateString()} already exists. Would you like to update it instead?`
      );
    }

    // If updating, delete the old schedule first (CASCADE will clean up sessions and assignments)
    if (existingSchedule && updateExisting) {
      console.log(
        `📝 Updating existing schedule for week of ${weekOf.toLocaleDateString()}`
      );
      const { error: deleteError } = await supabase
        .from("training_schedules")
        .delete()
        .eq("id", existingSchedule.id);

      if (deleteError) {
        throw new Error(
          `Failed to update existing schedule: ${deleteError.message}`
        );
      }
    }

    // 2. Count total scheduled agents
    const totalScheduledAgents = schedule.reduce(
      (sum, day) =>
        sum +
        day.sessions.reduce(
          (daySum, session) => daySum + session.agents.length,
          0
        ),
      0
    );

    // 3. Create the schedule record with enhanced metadata
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("training_schedules")
      .insert({
        week_of: weekOf.toISOString().split("T")[0],
        avg_cap_score: avgCAPScore,
        avg_adjusted_cap_score: avgAdjustedCAPScore,
        total_agents_scheduled: totalScheduledAgents,
        metadata: {
          days_with_sessions: schedule.length,
          total_sessions: schedule.reduce(
            (sum, day) => sum + day.sessions.length,
            0
          ),
          // Save full dataset info if provided
          total_company_agents: fullStats?.totalAgents || totalScheduledAgents,
          excluded_by_tenure: fullStats?.excludedCount || 0,
          eligible_agents: fullStats?.eligibleCount || totalScheduledAgents,
        },
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // 4. Create session and assignment records
    const sessions: any[] = [];
    const assignments: any[] = [];

    console.log("=== SAVE SCHEDULE DEBUG ===");
    console.log(`Schedule has ${schedule.length} days`);
    console.log(
      `Total sessions to create: ${schedule.reduce(
        (sum, day) => sum + day.sessions.length,
        0
      )}`
    );

    for (const day of schedule) {
      console.log(`Processing ${day.day}: ${day.sessions.length} sessions`);
      for (const session of day.sessions) {
        // Create session record
        const sessionRecord = {
          schedule_id: scheduleData.id,
          day: day.day,
          time_slot: session.time,
          location: session.location,
          tier: session.tier,
          training_type:
            session.tier === "Zero CAP Remediation"
              ? "Zero CAP Remediation"
              : getTrainingTypeFromDay(day.day),
          priority: session.priority,
          cohort_number: session.cohortNumber,
        };

        sessions.push(sessionRecord);
      }
    }

    console.log(`Total sessions to insert: ${sessions.length}`);
    
    // Validate that we have sessions to save
    if (sessions.length === 0) {
      // Delete the schedule record we just created since it's empty
      await supabase
        .from("training_schedules")
        .delete()
        .eq("id", scheduleData.id);
        
      throw new Error(
        "Cannot save empty schedule. No training sessions were generated. " +
        "This usually means no agents met the training criteria."
      );
    }

    // Insert all sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from("training_sessions")
      .insert(sessions)
      .select();

    if (sessionError) throw sessionError;

    if (!sessionData || sessionData.length === 0) {
      console.error("Session insert result:", { sessionData, sessionError });
      console.error("Sessions array that was sent:", sessions);
      throw new Error(
        "No sessions were created. Cannot save agent assignments."
      );
    }

    console.log(`✅ Created ${sessionData.length} training sessions`);

    // 5. Create agent assignments using the session IDs
    let sessionIndex = 0;
    for (const day of schedule) {
      for (const session of day.sessions) {
        // Safety check: ensure we have a valid session ID
        if (!sessionData[sessionIndex]) {
          console.error(`❌ Missing session data at index ${sessionIndex}`);
          throw new Error(
            `Session data mismatch at index ${sessionIndex}. Expected ${sessions.length} sessions, got ${sessionData.length}.`
          );
        }

        const sessionId = sessionData[sessionIndex].id;

        if (!sessionId) {
          throw new Error(
            `Session ID is null/undefined at index ${sessionIndex}`
          );
        }

        for (const agent of session.agents) {
          assignments.push({
            session_id: sessionId,
            schedule_id: scheduleData.id,
            agent_name: agent.name,
            manager: agent.manager,
            site: agent.site,
            tier_code: agent.tier,
            original_cap_score: agent.capScore,
            adjusted_cap_score: agent.adjustedCAPScore,
            lead_attainment: agent.leadAttainment,
            leads_per_day: agent.leadsPerDay,
            tenure: agent.tenure,
            close_rate: agent.closeRate || null,
            annual_premium: agent.annualPremium || null,
            place_rate: agent.placeRate || null,
            recommended_training: agent.recommendedTraining || null,
          });
        }

        sessionIndex++;
      }
    }

    console.log(
      `📝 Created ${assignments.length} agent assignments for ${sessionData.length} sessions`
    );

    // Insert all assignments
    const { error: assignmentError } = await supabase
      .from("agent_assignments")
      .insert(assignments);

    if (assignmentError) {
      console.error("❌ Error inserting assignments:", assignmentError);
      throw assignmentError;
    }

    console.log(
      `✅ Successfully saved schedule with ${assignments.length} agent assignments`
    );

    return {
      success: true,
      scheduleId: scheduleData.id,
      message: `Successfully saved schedule for week of ${weekOf.toLocaleDateString()}`,
    };
  } catch (error: any) {
    console.error("Error saving schedule:", error);
    return {
      success: false,
      error: error.message || "Failed to save schedule",
    };
  }
}

/**
 * Get all training schedules (summary view)
 */
export async function getTrainingSchedules() {
  const { data, error } = await supabase
    .from("training_schedules")
    .select("*")
    .order("week_of", { ascending: false });

  if (error) {
    console.error("Error fetching schedules:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get list of weeks that have schedules
 */
export async function getScheduledWeeks() {
  const { data, error } = await supabase
    .from("training_schedules")
    .select("week_of")
    .order("week_of", { ascending: false });

  if (error) {
    console.error("Error fetching scheduled weeks:", error);
    return { success: false, error: error.message, weeks: [] };
  }

  const weeks = data?.map((d) => d.week_of) || [];
  return { success: true, weeks };
}

/**
 * Get a complete schedule with all sessions and assignments
 */
export async function getScheduleById(scheduleId: string) {
  try {
    // Get schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from("training_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();

    if (scheduleError) throw scheduleError;

    // Get sessions with assignments
    // Note: We explicitly specify the foreign key relationship using !inner
    const { data: sessions, error: sessionsError } = await supabase
      .from("training_sessions")
      .select(
        `
        *,
        agent_assignments!session_id (*)
      `
      )
      .eq("schedule_id", scheduleId)
      .order("day")
      .order("time_slot");

    if (sessionsError) throw sessionsError;

    return {
      success: true,
      data: {
        schedule,
        sessions,
      },
    };
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training schedule and all related data
 */
export async function deleteSchedule(scheduleId: string) {
  const { error } = await supabase
    .from("training_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting schedule:", error);
    return { success: false, error: error.message };
  }

  return { success: true, message: "Schedule deleted successfully" };
}

// ============================================================================
// ATTENDANCE OPERATIONS
// ============================================================================

/**
 * Mark attendance for an agent assignment
 */
export async function markAttendance(
  assignmentId: string,
  attended: boolean,
  markedBy: string,
  noShowReason?: string,
  notes?: string
) {
  const { error } = await supabase
    .from("agent_assignments")
    .update({
      attended,
      attendance_marked_at: new Date().toISOString(),
      attendance_marked_by: markedBy,
      no_show_reason: attended ? null : noShowReason || null,
      notes: notes || null,
    })
    .eq("id", assignmentId);

  if (error) {
    console.error("Error marking attendance:", error);
    return { success: false, error: error.message };
  }

  return { success: true, message: "Attendance marked successfully" };
}

/**
 * Bulk mark attendance for multiple assignments
 */
export async function bulkMarkAttendance(
  assignments: Array<{
    id: string;
    attended: boolean;
    noShowReason?: string;
  }>,
  markedBy: string
) {
  console.log(
    "💾 bulkMarkAttendance called with",
    assignments.length,
    "updates"
  );

  // Use individual updates instead of upsert to avoid insert attempts
  const updatePromises = assignments.map((a) => {
    console.log(`  Updating ${a.id}: attended=${a.attended}`);
    return supabase
      .from("agent_assignments")
      .update({
        attended: a.attended,
        attendance_marked_at: new Date().toISOString(),
        attendance_marked_by: markedBy,
        no_show_reason: a.attended ? null : a.noShowReason || null,
      })
      .eq("id", a.id);
  });

  const results = await Promise.all(updatePromises);

  console.log(
    "📊 Update results:",
    results.map((r) => ({
      success: !r.error,
      error: r.error?.message,
    }))
  );

  // Check for any errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("❌ Error bulk marking attendance:", errors);
    return {
      success: false,
      error: `Failed to update ${errors.length} out of ${assignments.length} assignments. First error: ${errors[0].error?.message}`,
    };
  }

  console.log(
    "✅ Successfully updated",
    assignments.length,
    "assignments in database"
  );

  return {
    success: true,
    message: `Successfully marked attendance for ${assignments.length} assignments`,
  };
}

/**
 * Get pending attendance (sessions that need to be marked)
 */
export async function getPendingAttendance(beforeDate?: Date) {
  let query = supabase
    .from("agent_assignments")
    .select(
      `
      *,
      training_sessions (day, time_slot, location, training_type),
      training_schedules (week_of)
    `
    )
    .is("attended", null);

  if (beforeDate) {
    query = query.lt(
      "training_schedules.week_of",
      beforeDate.toISOString().split("T")[0]
    );
  }

  const { data, error } = await query.order("training_schedules.week_of", {
    ascending: false,
  });

  if (error) {
    console.error("Error fetching pending attendance:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ============================================================================
// CAP SCORE HISTORY
// ============================================================================

/**
 * Save CAP scores for historical tracking
 */
export async function saveCAPScoreHistory(agents: AgentRecord[], weekOf: Date) {
  const records = agents.map((agent) => ({
    agent_name: agent.name,
    week_of: weekOf.toISOString().split("T")[0],
    original_cap_score: agent.capScore,
    adjusted_cap_score: agent.adjustedCAPScore,
    lead_attainment: agent.leadAttainment,
    leads_per_day: agent.leadsPerDay,
    close_rate: agent.closeRate || null,
    annual_premium: agent.annualPremium || null,
    place_rate: agent.placeRate || null,
    manager: agent.manager,
    site: agent.site,
    tier_code: agent.tier,
  }));

  const { error } = await supabase.from("cap_score_history").insert(records);

  if (error) {
    console.error("Error saving CAP score history:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: `Saved history for ${records.length} agents`,
  };
}

/**
 * Get agent performance history
 */
export async function getAgentHistory(agentName: string) {
  const { data, error } = await supabase
    .from("cap_score_history")
    .select("*")
    .eq("agent_name", agentName)
    .order("week_of", { ascending: false });

  if (error) {
    console.error("Error fetching agent history:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get agent metrics trends for multiple agents
 * @param agentNames Array of agent names to fetch (empty array = all agents)
 * @param weeks Number of weeks to fetch
 */
export async function getAgentMetricsTrends(
  agentNames: string[] = [],
  weeks: number = 12
) {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    let query = supabase
      .from("cap_score_history")
      .select("*")
      .gte("week_of", startDate.toISOString().split("T")[0])
      .lte("week_of", endDate.toISOString().split("T")[0])
      .order("week_of", { ascending: true });

    // Filter by agent names if provided
    if (agentNames.length > 0) {
      query = query.in("agent_name", agentNames);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching agent trends:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getAgentMetricsTrends:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get agent training history to correlate with performance
 */
export async function getAgentTrainingHistory(
  agentName: string,
  weeks: number = 12
) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const { data, error } = await supabase
      .from("agent_assignments")
      .select(
        `
        agent_name,
        attended,
        training_sessions (
          day,
          training_type,
          training_schedules (
            week_of
          )
        )
      `
      )
      .eq("agent_name", agentName)
      .eq("attended", true)
      .gte(
        "training_sessions.training_schedules.week_of",
        startDate.toISOString().split("T")[0]
      )
      .order("training_sessions.training_schedules.week_of", {
        ascending: true,
      });

    if (error) {
      console.error("Error fetching training history:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getAgentTrainingHistory:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get training completion rates
 */
export async function getCompletionRates() {
  const { data, error } = await supabase
    .from("training_completion_rates")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(12); // Last 12 weeks

  if (error) {
    console.error("Error fetching completion rates:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get manager dashboard stats
 */
export async function getManagerStats(manager?: string, weekOf?: Date) {
  let query = supabase.from("manager_dashboard_stats").select("*");

  if (manager) {
    query = query.eq("manager", manager);
  }

  if (weekOf) {
    query = query.eq("week_of", weekOf.toISOString().split("T")[0]);
  }

  const { data, error } = await query.order("week_of", { ascending: false });

  if (error) {
    console.error("Error fetching manager stats:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get agent training progress (improvements over time)
 */
export async function getAgentTrainingProgress(agentName?: string) {
  let query = supabase.from("agent_training_progress").select("*");

  if (agentName) {
    query = query.eq("agent_name", agentName);
  }

  const { data, error } = await query.order("week_of", { ascending: false });

  if (error) {
    console.error("Error fetching training progress:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTrainingTypeFromDay(day: string): string {
  const map: Record<string, string> = {
    Tuesday: "Close Rate Training",
    Wednesday: "Annual Premium Training",
    Thursday: "Place Rate Training",
    Friday: "Zero CAP Remediation / Overfill",
  };
  return map[day] || "General Training";
}
