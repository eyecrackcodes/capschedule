-- ============================================================================
-- FIX WEEK DATE FROM 10/26 TO 10/20 AND RESTORE ATTENDANCE
-- ============================================================================

-- STEP 1: Save attendance from the incorrectly dated schedule (10/26)
CREATE TEMP TABLE IF NOT EXISTS temp_attendance_backup AS
SELECT 
    agent_name,
    attended,
    attendance_marked_at,
    attendance_marked_by,
    no_show_reason,
    notes
FROM agent_assignments
WHERE schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-26'
)
AND attended IS NOT NULL;

-- Verify what was saved
SELECT 
    COUNT(*) as total_saved,
    COUNT(CASE WHEN attended = true THEN 1 END) as attended,
    COUNT(CASE WHEN attended = false THEN 1 END) as no_shows
FROM temp_attendance_backup;


-- STEP 2: Delete the incorrectly dated schedule
DELETE FROM training_schedules WHERE week_of = '2025-10-26';

-- Verify deletion
SELECT COUNT(*) FROM training_schedules WHERE week_of = '2025-10-26';
-- Expected: 0


-- STEP 3: Now upload via app
-- Go to Database & Analytics → Upload New Week
-- Choose: October 20, 2025  ← CORRECT DATE
-- Upload your TSV file


-- STEP 4: Restore attendance (run AFTER uploading with correct date)
UPDATE agent_assignments aa
SET 
    attended = ta.attended,
    attendance_marked_at = ta.attendance_marked_at,
    attendance_marked_by = ta.attendance_marked_by,
    no_show_reason = ta.no_show_reason,
    notes = ta.notes
FROM temp_attendance_backup ta
WHERE aa.agent_name = ta.agent_name
AND aa.schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-20'
);

-- Verify restoration
SELECT 
    COUNT(*) as attendance_restored,
    COUNT(CASE WHEN attended = true THEN 1 END) as attended,
    COUNT(CASE WHEN attended = false THEN 1 END) as no_shows
FROM agent_assignments
WHERE schedule_id = (
    SELECT id FROM training_schedules WHERE week_of = '2025-10-20'
)
AND attended IS NOT NULL;


-- STEP 5: Clean up duplicate CAP score history
-- Remove duplicate entries for the same agent/week
DELETE FROM cap_score_history
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY agent_name, week_of 
                   ORDER BY created_at DESC
               ) as row_num
        FROM cap_score_history
    ) t
    WHERE row_num > 1
);

-- Verify: Should have 1 entry per agent per week
SELECT week_of, COUNT(*) as records
FROM cap_score_history
GROUP BY week_of
ORDER BY week_of DESC;


-- STEP 6: Cleanup temp table
DROP TABLE IF EXISTS temp_attendance_backup;


-- ============================================================================
-- SUMMARY OF WHAT THIS DOES
-- ============================================================================
/*
PROBLEM:
- Uploaded data saved as week of 10/26 (wrong)
- Should be week of 10/20 (correct)
- Attendance data already marked (don't want to lose)
- Duplicate CAP history entries causing chart issues

SOLUTION:
1. Save attendance from 10/26 schedule
2. Delete 10/26 schedule
3. Re-upload with correct date (10/20)
4. Restore attendance to 10/20 schedule
5. Clean up duplicate history entries
6. Charts now work correctly

RESULT:
✅ Schedule dated correctly (10/20)
✅ Attendance preserved
✅ No duplicates in charts
✅ Clean data
*/

