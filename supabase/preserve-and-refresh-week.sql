-- ============================================================================
-- PRESERVE ATTENDANCE AND REFRESH WEEK WITH NEW LOGIC
-- Use this to re-upload a week with corrected logic while keeping attendance
-- ============================================================================

-- STEP 1: Create temporary table to save attendance
CREATE TEMP TABLE IF NOT EXISTS temp_attendance AS
SELECT 
    agent_name,
    attended,
    attendance_marked_at,
    attendance_marked_by,
    no_show_reason,
    notes
FROM agent_assignments
WHERE schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-20'
)
AND attended IS NOT NULL;  -- Only save marked attendance

-- Verify what was saved
SELECT COUNT(*) as attendance_records_saved FROM temp_attendance;

-- Expected: Number of agents you've marked (e.g., 2-5)


-- STEP 2: Delete the old schedule
-- (CASCADE will delete sessions and assignments)
DELETE FROM training_schedules WHERE week_of = '2025-10-20';

-- Verify deletion
SELECT COUNT(*) FROM training_schedules WHERE week_of = '2025-10-20';
-- Expected: 0


-- STEP 3: Upload new data via the app
-- Go to Database & Analytics → Upload New Week
-- Choose: October 20, 2025
-- Upload your TSV file
-- (New schedule will be created with correct logic)


-- STEP 4: Restore attendance for agents who were already marked
-- Run this AFTER uploading the new schedule:

UPDATE agent_assignments aa
SET 
    attended = ta.attended,
    attendance_marked_at = ta.attendance_marked_at,
    attendance_marked_by = ta.attendance_marked_by,
    no_show_reason = ta.no_show_reason,
    notes = ta.notes
FROM temp_attendance ta
WHERE aa.agent_name = ta.agent_name
AND aa.schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-20'
);

-- Verify restoration
SELECT 
    COUNT(*) as attendance_restored,
    COUNT(CASE WHEN attended = true THEN 1 END) as attended_count,
    COUNT(CASE WHEN attended = false THEN 1 END) as no_show_count
FROM agent_assignments
WHERE schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-20'
)
AND attended IS NOT NULL;


-- STEP 5: Clean up temp table
DROP TABLE IF EXISTS temp_attendance;


-- ============================================================================
-- COMPLETE WORKFLOW SUMMARY
-- ============================================================================

/*
1. Run STEP 1 (saves attendance to temp table)
2. Run STEP 2 (deletes old schedule)
3. Upload new data via app (creates fresh schedule)
4. Run STEP 4 (restores attendance)
5. Run STEP 5 (cleanup)

RESULT:
✅ New schedule with correct 25th percentile logic
✅ Correct agent assignments
✅ Preserved attendance for agents who were marked
✅ Agents who shouldn't be there anymore lose their attendance (expected)
✅ New agents get fresh pending status

NOTES:
- Only agents in BOTH old and new schedules keep their attendance
- If an agent was removed from training (above threshold now), their attendance is lost (OK)
- If a new agent was added, they start with pending status (OK)
*/

