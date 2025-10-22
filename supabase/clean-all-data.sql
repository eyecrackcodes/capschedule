-- ============================================================================
-- COMPLETE DATABASE CLEANUP
-- This will delete ALL data from all tables
-- Run this to start fresh with a single week of data
-- ============================================================================

-- Disable foreign key checks temporarily (if needed)
-- Note: Supabase handles this automatically with CASCADE

-- 1. Delete all agent assignments (attendance records)
DELETE FROM agent_assignments;

-- 2. Delete all training sessions
DELETE FROM training_sessions;

-- 3. Delete all training schedules
DELETE FROM training_schedules;

-- 4. Delete all CAP score history
DELETE FROM cap_score_history;

-- 5. Verify everything is deleted
SELECT 
    'training_schedules' as table_name, 
    COUNT(*) as record_count 
FROM training_schedules
UNION ALL
SELECT 
    'training_sessions' as table_name, 
    COUNT(*) as record_count 
FROM training_sessions
UNION ALL
SELECT 
    'agent_assignments' as table_name, 
    COUNT(*) as record_count 
FROM agent_assignments
UNION ALL
SELECT 
    'cap_score_history' as table_name, 
    COUNT(*) as record_count 
FROM cap_score_history;

-- All counts should be 0 after running this script
