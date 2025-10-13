-- ============================================================================
-- USEFUL SQL QUERIES FOR CAP TRAINING SCHEDULE DATABASE
-- ============================================================================

-- ============================================================================
-- SETUP VERIFICATION
-- ============================================================================

-- 1. Verify all tables exist
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'training_schedules',
    'training_sessions', 
    'agent_assignments',
    'cap_score_history'
)
ORDER BY tablename;

-- Expected: 4 rows


-- 2. Verify RLS policies are permissive
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    cmd,
    qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('training_schedules', 'training_sessions', 'agent_assignments', 'cap_score_history')
ORDER BY tablename, policyname;

-- Expected: 1 policy per table named "Public full access"


-- 3. Verify views exist
SELECT 
    schemaname, 
    viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'training_completion_rates',
    'agent_training_progress',
    'manager_dashboard_stats'
)
ORDER BY viewname;

-- Expected: 3 rows


-- ============================================================================
-- DATA VERIFICATION
-- ============================================================================

-- 4. Check how many schedules you have
SELECT 
    week_of,
    total_agents_scheduled,
    avg_cap_score,
    avg_adjusted_cap_score,
    generated_at
FROM training_schedules
ORDER BY week_of DESC;


-- 5. Count assignments per schedule
SELECT 
    ts.week_of,
    COUNT(aa.id) as total_assignments,
    COUNT(DISTINCT aa.agent_name) as unique_agents,
    COUNT(CASE WHEN aa.attended = true THEN 1 END) as attended,
    COUNT(CASE WHEN aa.attended = false THEN 1 END) as no_shows,
    COUNT(CASE WHEN aa.attended IS NULL THEN 1 END) as pending
FROM training_schedules ts
LEFT JOIN agent_assignments aa ON aa.schedule_id = ts.id
GROUP BY ts.week_of, ts.id
ORDER BY ts.week_of DESC;


-- 6. Verify foreign key relationships work
SELECT 
    aa.agent_name,
    tse.day,
    tse.time_slot,
    tse.location,
    ts.week_of
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
LIMIT 10;

-- Should return data with no errors


-- ============================================================================
-- USEFUL QUERIES FOR OPERATIONS
-- ============================================================================

-- 7. See all sessions for a specific week
SELECT 
    tse.day,
    tse.time_slot,
    tse.location,
    tse.training_type,
    COUNT(aa.id) as agent_count,
    STRING_AGG(aa.agent_name, ', ') as agents
FROM training_sessions tse
JOIN training_schedules ts ON tse.schedule_id = ts.id
LEFT JOIN agent_assignments aa ON aa.session_id = tse.id
WHERE ts.week_of = '2025-10-13'  -- Change this date
GROUP BY tse.id, tse.day, tse.time_slot, tse.location, tse.training_type
ORDER BY tse.day, tse.time_slot;


-- 8. Find all pending attendance (needs to be marked)
SELECT 
    ts.week_of,
    tse.day,
    tse.time_slot,
    tse.location,
    aa.agent_name,
    aa.manager
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
WHERE aa.attended IS NULL
ORDER BY ts.week_of, tse.day, tse.time_slot;


-- 9. Check attendance completion rate by week
SELECT * FROM training_completion_rates
ORDER BY week_of DESC
LIMIT 10;


-- 10. See which managers have the best attendance rates
SELECT * FROM manager_dashboard_stats
WHERE week_of >= '2025-10-01'  -- Adjust date range
ORDER BY attendance_rate DESC;


-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- 11. Delete a specific schedule (and all related data via CASCADE)
-- DELETE FROM training_schedules 
-- WHERE week_of = '2025-10-13';  -- UNCOMMENT AND CHANGE DATE TO USE


-- 12. Reset all attendance for a specific week (if you made mistakes)
-- UPDATE agent_assignments 
-- SET attended = NULL, 
--     attendance_marked_at = NULL,
--     attendance_marked_by = NULL,
--     no_show_reason = NULL
-- WHERE schedule_id = (
--     SELECT id FROM training_schedules WHERE week_of = '2025-10-13'
-- );  -- UNCOMMENT AND CHANGE DATE TO USE


-- 13. Mark all agents as attended for a specific session (bulk operation)
-- UPDATE agent_assignments
-- SET attended = true,
--     attendance_marked_at = NOW(),
--     attendance_marked_by = 'Bulk Import'
-- WHERE session_id = 'session-uuid-here';  -- UNCOMMENT AND CHANGE UUID TO USE


-- 14. Find duplicate agents (should be none with unique constraints)
SELECT 
    session_id,
    agent_name,
    COUNT(*) as count
FROM agent_assignments
GROUP BY session_id, agent_name
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)


-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- 15. Agent improvement over time
SELECT 
    agent_name,
    week_of,
    adjusted_cap_score,
    LAG(adjusted_cap_score) OVER (PARTITION BY agent_name ORDER BY week_of) as previous_week,
    adjusted_cap_score - LAG(adjusted_cap_score) OVER (PARTITION BY agent_name ORDER BY week_of) as improvement
FROM cap_score_history
WHERE agent_name = 'Jerren Cropps'  -- Change agent name
ORDER BY week_of DESC;


-- 16. Training effectiveness by type (which training works best?)
SELECT 
    atp.training_type,
    COUNT(*) as total_trained,
    COUNT(CASE WHEN atp.cap_improvement > 0 THEN 1 END) as improved,
    ROUND(AVG(atp.cap_improvement), 2) as avg_improvement,
    ROUND(
        COUNT(CASE WHEN atp.cap_improvement > 0 THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as success_rate
FROM agent_training_progress atp
WHERE atp.attended = true
GROUP BY atp.training_type
ORDER BY success_rate DESC;


-- 17. Agents who need follow-up (multiple no-shows)
SELECT 
    aa.agent_name,
    aa.manager,
    COUNT(*) as total_no_shows,
    STRING_AGG(CONCAT(tse.day, ' ', tse.time_slot), ', ') as missed_sessions
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
WHERE aa.attended = false
GROUP BY aa.agent_name, aa.manager
HAVING COUNT(*) >= 2
ORDER BY COUNT(*) DESC;


-- 18. Location comparison (CLT vs ATX attendance rates)
SELECT 
    tse.location,
    COUNT(aa.id) as total_sessions,
    COUNT(CASE WHEN aa.attended = true THEN 1 END) as attended,
    COUNT(CASE WHEN aa.attended = false THEN 1 END) as no_shows,
    ROUND(
        COUNT(CASE WHEN aa.attended = true THEN 1 END)::numeric / 
        NULLIF(COUNT(aa.id), 0) * 100, 
        2
    ) as attendance_rate
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
GROUP BY tse.location
ORDER BY attendance_rate DESC;


-- ============================================================================
-- PERFORMANCE OPTIMIZATION (Optional - run if queries are slow)
-- ============================================================================

-- 19. Add additional indexes if needed
-- CREATE INDEX IF NOT EXISTS idx_agent_assignments_week_lookup 
-- ON agent_assignments(schedule_id, attended);

-- CREATE INDEX IF NOT EXISTS idx_training_sessions_day_time 
-- ON training_sessions(day, time_slot);

-- 20. Analyze tables for query optimization
-- ANALYZE training_schedules;
-- ANALYZE training_sessions;
-- ANALYZE agent_assignments;
-- ANALYZE cap_score_history;


-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- 21. Check for orphaned records (data integrity)
SELECT 'Orphaned Sessions' as issue, COUNT(*) as count
FROM training_sessions tse
LEFT JOIN training_schedules ts ON tse.schedule_id = ts.id
WHERE ts.id IS NULL
UNION ALL
SELECT 'Orphaned Assignments', COUNT(*)
FROM agent_assignments aa
LEFT JOIN training_sessions tse ON aa.session_id = tse.id
WHERE tse.id IS NULL;

-- Expected: All counts = 0


-- 22. Find sessions with no agents
SELECT 
    ts.week_of,
    tse.day,
    tse.time_slot,
    tse.location,
    COUNT(aa.id) as agent_count
FROM training_sessions tse
JOIN training_schedules ts ON tse.schedule_id = ts.id
LEFT JOIN agent_assignments aa ON aa.session_id = tse.id
GROUP BY ts.week_of, tse.id, tse.day, tse.time_slot, tse.location
HAVING COUNT(aa.id) = 0;

-- Expected: 0 rows (all sessions should have agents)


-- ============================================================================
-- EXPORT QUERIES (for reports)
-- ============================================================================

-- 23. Weekly attendance report (for management)
SELECT 
    ts.week_of,
    aa.agent_name,
    aa.manager,
    tse.day,
    tse.time_slot,
    tse.location,
    tse.training_type,
    aa.original_cap_score,
    aa.adjusted_cap_score,
    CASE 
        WHEN aa.attended = true THEN 'Attended'
        WHEN aa.attended = false THEN 'No-Show'
        ELSE 'Pending'
    END as attendance_status,
    aa.no_show_reason
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
WHERE ts.week_of = '2025-10-13'  -- Change date
ORDER BY tse.day, tse.time_slot, aa.agent_name;

-- Export to CSV for weekly reports


-- 24. Manager-specific report
SELECT 
    aa.agent_name,
    tse.day,
    tse.time_slot,
    tse.location,
    tse.training_type,
    aa.adjusted_cap_score,
    CASE 
        WHEN aa.attended = true THEN '✓ Attended'
        WHEN aa.attended = false THEN '✗ No-Show'
        ELSE '⏳ Pending'
    END as status
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
WHERE aa.manager = 'Jamal Gipson'  -- Change manager name
AND ts.week_of >= '2025-10-01'
ORDER BY ts.week_of DESC, tse.day, tse.time_slot;

-- Send to specific manager


-- ============================================================================
-- QUICK REFERENCE
-- ============================================================================

/*
COMMON TASKS:

1. Delete old schedule:
   DELETE FROM training_schedules WHERE week_of = 'YYYY-MM-DD';

2. View this week's sessions:
   SELECT * FROM training_completion_rates WHERE week_of = 'YYYY-MM-DD';

3. Check pending attendance:
   SELECT COUNT(*) FROM agent_assignments WHERE attended IS NULL;

4. See agent improvements:
   SELECT * FROM agent_training_progress WHERE agent_name = 'Agent Name';

5. Manager performance:
   SELECT * FROM manager_dashboard_stats WHERE manager = 'Manager Name';
*/

