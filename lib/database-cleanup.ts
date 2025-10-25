import { supabase } from "./supabase";

export type ScheduleHealthStatus = "EMPTY" | "NO_AGENTS" | "MISMATCH" | "HEALTHY";

export interface ScheduleHealthReport {
  week_of: string;
  total_agents_scheduled: number;
  actual_sessions: number;
  actual_assignments: number;
  status: ScheduleHealthStatus;
}

/**
 * Remove empty schedules (schedules with no sessions)
 * This can happen if there was an error during schedule creation
 */
export async function removeEmptySchedules() {
  try {
    // First, find schedules that have no sessions
    const { data: schedules, error: fetchError } = await supabase.from(
      "training_schedules"
    ).select(`
        id,
        week_of,
        training_sessions (
          id
        )
      `);

    if (fetchError) {
      console.error("Error fetching schedules:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Filter to find schedules with no sessions
    const emptySchedules =
      schedules?.filter(
        (schedule) =>
          !schedule.training_sessions || schedule.training_sessions.length === 0
      ) || [];

    if (emptySchedules.length === 0) {
      console.log("✅ No empty schedules found");
      return { success: true, deletedCount: 0 };
    }

    console.log(`🗑️ Found ${emptySchedules.length} empty schedules to remove`);

    // Delete empty schedules
    const deletePromises = emptySchedules.map((schedule) =>
      supabase.from("training_schedules").delete().eq("id", schedule.id)
    );

    const results = await Promise.all(deletePromises);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error("Errors during deletion:", errors);
      return {
        success: false,
        error: `Failed to delete ${errors.length} schedules`,
        deletedCount: emptySchedules.length - errors.length,
      };
    }

    console.log(
      `✅ Successfully removed ${emptySchedules.length} empty schedules`
    );

    return {
      success: true,
      deletedCount: emptySchedules.length,
      deletedSchedules: emptySchedules.map((s) => s.week_of),
    };
  } catch (error: any) {
    console.error("Error removing empty schedules:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get schedule statistics to identify potential issues
 */
export async function getScheduleHealthCheck() {
  try {
    const { data, error } = await supabase
      .from("training_schedules")
      .select(
        `
        id,
        week_of,
        total_agents_scheduled,
        training_sessions (
          id
        ),
        agent_assignments (
          id
        )
      `
      )
      .order("week_of", { ascending: false });

    if (error) {
      console.error("Error fetching schedule health:", error);
      return { success: false, error: error.message };
    }

    const healthReport: ScheduleHealthReport[] =
      data?.map((schedule) => ({
        week_of: schedule.week_of,
        total_agents_scheduled: schedule.total_agents_scheduled,
        actual_sessions: schedule.training_sessions?.length || 0,
        actual_assignments: schedule.agent_assignments?.length || 0,
        status:
          (schedule.training_sessions?.length || 0) === 0
            ? "EMPTY"
            : (schedule.agent_assignments?.length || 0) === 0
            ? "NO_AGENTS"
            : (schedule.agent_assignments?.length || 0) !==
              schedule.total_agents_scheduled
            ? "MISMATCH"
            : "HEALTHY",
      })) || [];

    const issues = healthReport.filter((s) => s.status !== "HEALTHY");

    return {
      success: true,
      totalSchedules: healthReport.length,
      healthySchedules: healthReport.filter((s) => s.status === "HEALTHY")
        .length,
      issues: issues,
      report: healthReport,
    };
  } catch (error: any) {
    console.error("Error in health check:", error);
    return { success: false, error: error.message };
  }
}
