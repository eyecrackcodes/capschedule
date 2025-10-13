-- ============================================================================
-- QUICK VERIFICATION QUERIES
-- Run these to verify your attendance tracker data
-- ============================================================================

-- 1. Count all records
SELECT 
    'schedules' as table_name, COUNT(*) as count FROM training_schedules
UNION ALL
SELECT 'sessions', COUNT(*) FROM training_sessions
UNION ALL
SELECT 'assignments', COUNT(*) FROM agent_assignments
UNION ALL
SELECT 'history', COUNT(*) FROM cap_score_history;

-- Expected:
-- schedules: 1
-- sessions: 12-20
-- assignments: 40-70
-- history: 95-190


-- 2. See all sessions with agent counts
SELECT 
    ts.week_of,
    tse.day,
    tse.time_slot,
    tse.location,
    tse.training_type,
    COUNT(aa.id) as agent_count,
    STRING_AGG(aa.agent_name, ', ' ORDER BY aa.agent_name) as agents
FROM training_sessions tse
JOIN training_schedules ts ON tse.schedule_id = ts.id
LEFT JOIN agent_assignments aa ON aa.session_id = tse.id
GROUP BY ts.week_of, tse.id, tse.day, tse.time_slot, tse.location, tse.training_type
ORDER BY ts.week_of, tse.day, tse.time_slot;

-- This shows all your sessions with how many agents are assigned


-- 3. Verify agent assignments have proper relationships
SELECT 
    aa.agent_name,
    aa.manager,
    tse.day,
    tse.time_slot,
    tse.location,
    ts.week_of,
    aa.attended
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
LIMIT 10;

-- Should return data - if not, relationships are broken


-- 4. Check attendance status breakdown
SELECT 
    CASE 
        WHEN attended = true THEN 'Attended'
        WHEN attended = false THEN 'No-Show'
        WHEN attended IS NULL THEN 'Pending'
    END as status,
    COUNT(*) as count
FROM agent_assignments
GROUP BY attended
ORDER BY count DESC;


-- 5. View sessions by location
SELECT 
    tse.location,
    COUNT(DISTINCT tse.id) as sessions,
    COUNT(aa.id) as total_agents
FROM training_sessions tse
LEFT JOIN agent_assignments aa ON aa.session_id = tse.id
GROUP BY tse.location;

-- Check CLT vs ATX distribution


-- ============================================================================
-- IF YOU SEE ISSUES, RUN THESE CHECKS
-- ============================================================================

-- 6. Find sessions with no agents (shouldn't exist)
SELECT 
    tse.id,
    tse.day,
    tse.time_slot,
    tse.location
FROM training_sessions tse
LEFT JOIN agent_assignments aa ON aa.session_id = tse.id
WHERE aa.id IS NULL;

-- Expected: 0 rows


-- 7. Find assignments with broken session links
SELECT 
    aa.id,
    aa.agent_name,
    aa.session_id
FROM agent_assignments aa
LEFT JOIN training_sessions tse ON aa.session_id = tse.id
WHERE tse.id IS NULL;

-- Expected: 0 rows


-- 8. Find assignments with broken schedule links
SELECT 
    aa.id,
    aa.agent_name,
    aa.schedule_id
FROM agent_assignments aa
LEFT JOIN training_schedules ts ON aa.schedule_id = ts.id
WHERE ts.id IS NULL;

-- Expected: 0 rows

