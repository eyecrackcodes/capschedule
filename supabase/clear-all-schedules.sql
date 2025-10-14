-- ============================================================================
-- CLEAR ALL SCHEDULES AND DATA
-- Use this to start fresh with new logic (e.g., after switching to 25th percentile)
-- ============================================================================

-- OPTION 1: Delete ALL schedules (CASCADE deletes sessions and assignments)
-- This is the safest and cleanest way to reset
DELETE FROM training_schedules;

-- OPTION 2: Delete specific schedule by week
-- DELETE FROM training_schedules WHERE week_of = '2025-10-13';

-- OPTION 3: Keep schedules but reset all attendance
-- UPDATE agent_assignments 
-- SET attended = NULL, 
--     attendance_marked_at = NULL,
--     attendance_marked_by = NULL,
--     no_show_reason = NULL;

-- ============================================================================
-- VERIFICATION: Confirm everything is deleted
-- ============================================================================

-- Check counts (should all be 0 after deletion)
SELECT 
    'schedules' as table_name, COUNT(*) as count FROM training_schedules
UNION ALL
SELECT 'sessions', COUNT(*) FROM training_sessions
UNION ALL
SELECT 'assignments', COUNT(*) FROM agent_assignments;

-- Expected result after DELETE:
-- schedules: 0
-- sessions: 0
-- assignments: 0

-- ============================================================================
-- OPTIONAL: Also clear CAP score history if starting completely fresh
-- ============================================================================

-- Uncomment this if you want to clear historical CAP data too:
-- DELETE FROM cap_score_history;

-- ============================================================================
-- NOTES
-- ============================================================================

-- CASCADE DELETE:
-- Deleting from training_schedules automatically deletes:
--   - All training_sessions for that schedule
--   - All agent_assignments for that schedule
--   - This is because of ON DELETE CASCADE in the foreign keys

-- WHAT TO DO AFTER DELETING:
-- 1. Go to Database & Analytics → Upload New Week
-- 2. Choose week date
-- 3. Upload your TSV file
-- 4. New schedule will be saved with bottom quartile (25th percentile) logic
-- 5. Smaller, more focused training cohorts!

