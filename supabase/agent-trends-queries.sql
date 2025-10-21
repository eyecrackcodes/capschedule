-- Agent Performance Trends Queries
-- These queries help analyze agent performance over time

-- ============================================================================
-- AGENT METRIC TRENDS
-- ============================================================================

-- Get agent performance trends with training indicators
-- Shows week-over-week changes in metrics along with training attended
WITH agent_metrics AS (
    SELECT 
        h.agent_name,
        h.week_of,
        h.adjusted_cap_score,
        h.close_rate,
        h.annual_premium,
        h.place_rate,
        h.manager,
        h.site,
        -- Calculate week-over-week changes
        LAG(h.adjusted_cap_score) OVER (PARTITION BY h.agent_name ORDER BY h.week_of) as prev_cap_score,
        LAG(h.close_rate) OVER (PARTITION BY h.agent_name ORDER BY h.week_of) as prev_close_rate,
        LAG(h.annual_premium) OVER (PARTITION BY h.agent_name ORDER BY h.week_of) as prev_annual_premium,
        LAG(h.place_rate) OVER (PARTITION BY h.agent_name ORDER BY h.week_of) as prev_place_rate
    FROM cap_score_history h
    WHERE h.week_of >= CURRENT_DATE - INTERVAL '12 weeks'
),
training_attended AS (
    SELECT 
        aa.agent_name,
        ts.week_of,
        STRING_AGG(
            CASE 
                WHEN aa.attended = true THEN sess.training_type 
                ELSE NULL 
            END, 
            ', ' ORDER BY sess.day
        ) as training_types
    FROM agent_assignments aa
    JOIN training_sessions sess ON aa.session_id = sess.id
    JOIN training_schedules ts ON sess.schedule_id = ts.id
    WHERE aa.attended = true
    GROUP BY aa.agent_name, ts.week_of
)
SELECT 
    m.*,
    -- Calculate percentage changes
    CASE 
        WHEN m.prev_cap_score > 0 
        THEN ROUND(((m.adjusted_cap_score - m.prev_cap_score) / m.prev_cap_score * 100)::numeric, 2)
        ELSE NULL 
    END as cap_score_change_pct,
    CASE 
        WHEN m.prev_close_rate > 0 
        THEN ROUND(((m.close_rate - m.prev_close_rate) / m.prev_close_rate * 100)::numeric, 2)
        ELSE NULL 
    END as close_rate_change_pct,
    t.training_types
FROM agent_metrics m
LEFT JOIN training_attended t ON m.agent_name = t.agent_name AND m.week_of = t.week_of
ORDER BY m.agent_name, m.week_of;

-- ============================================================================
-- TRAINING EFFECTIVENESS ANALYSIS
-- ============================================================================

-- Analyze performance improvement after specific training types
WITH pre_post_training AS (
    SELECT 
        aa.agent_name,
        sess.training_type,
        ts.week_of as training_week,
        -- Get metrics before training (previous week)
        pre.adjusted_cap_score as pre_cap_score,
        pre.close_rate as pre_close_rate,
        pre.annual_premium as pre_annual_premium,
        pre.place_rate as pre_place_rate,
        -- Get metrics after training (following weeks)
        post1.adjusted_cap_score as post1_cap_score,
        post1.close_rate as post1_close_rate,
        post2.adjusted_cap_score as post2_cap_score,
        post2.close_rate as post2_close_rate,
        post4.adjusted_cap_score as post4_cap_score,
        post4.close_rate as post4_close_rate
    FROM agent_assignments aa
    JOIN training_sessions sess ON aa.session_id = sess.id
    JOIN training_schedules ts ON sess.schedule_id = ts.id
    -- Pre-training metrics
    LEFT JOIN cap_score_history pre ON 
        aa.agent_name = pre.agent_name AND 
        pre.week_of = ts.week_of - INTERVAL '1 week'
    -- Post-training metrics (1 week later)
    LEFT JOIN cap_score_history post1 ON 
        aa.agent_name = post1.agent_name AND 
        post1.week_of = ts.week_of + INTERVAL '1 week'
    -- Post-training metrics (2 weeks later)
    LEFT JOIN cap_score_history post2 ON 
        aa.agent_name = post2.agent_name AND 
        post2.week_of = ts.week_of + INTERVAL '2 weeks'
    -- Post-training metrics (4 weeks later)
    LEFT JOIN cap_score_history post4 ON 
        aa.agent_name = post4.agent_name AND 
        post4.week_of = ts.week_of + INTERVAL '4 weeks'
    WHERE aa.attended = true
)
SELECT 
    training_type,
    COUNT(DISTINCT agent_name) as agents_trained,
    -- 1 week improvement
    AVG(CASE WHEN pre_cap_score > 0 THEN ((post1_cap_score - pre_cap_score) / pre_cap_score * 100) END) as avg_cap_improvement_1wk,
    AVG(CASE WHEN pre_close_rate > 0 THEN ((post1_close_rate - pre_close_rate) / pre_close_rate * 100) END) as avg_close_rate_improvement_1wk,
    -- 2 week improvement
    AVG(CASE WHEN pre_cap_score > 0 THEN ((post2_cap_score - pre_cap_score) / pre_cap_score * 100) END) as avg_cap_improvement_2wk,
    AVG(CASE WHEN pre_close_rate > 0 THEN ((post2_close_rate - pre_close_rate) / pre_close_rate * 100) END) as avg_close_rate_improvement_2wk,
    -- 4 week improvement
    AVG(CASE WHEN pre_cap_score > 0 THEN ((post4_cap_score - pre_cap_score) / pre_cap_score * 100) END) as avg_cap_improvement_4wk,
    AVG(CASE WHEN pre_close_rate > 0 THEN ((post4_close_rate - pre_close_rate) / pre_close_rate * 100) END) as avg_close_rate_improvement_4wk
FROM pre_post_training
GROUP BY training_type
ORDER BY training_type;

-- ============================================================================
-- COHORT PERFORMANCE COMPARISON
-- ============================================================================

-- Compare performance of agents who attended training vs those who didn't
WITH training_cohorts AS (
    SELECT DISTINCT
        h.agent_name,
        h.week_of,
        CASE 
            WHEN aa.agent_name IS NOT NULL AND aa.attended = true THEN 'Attended'
            WHEN aa.agent_name IS NOT NULL AND aa.attended = false THEN 'No-Show'
            ELSE 'Not Scheduled'
        END as training_status
    FROM cap_score_history h
    LEFT JOIN agent_assignments aa ON 
        h.agent_name = aa.agent_name AND
        h.week_of = (
            SELECT ts.week_of 
            FROM training_schedules ts 
            JOIN training_sessions sess ON ts.id = sess.schedule_id
            WHERE sess.id = aa.session_id
        )
)
SELECT 
    tc.week_of,
    tc.training_status,
    COUNT(DISTINCT tc.agent_name) as agent_count,
    AVG(h.adjusted_cap_score) as avg_cap_score,
    AVG(h.close_rate) as avg_close_rate,
    AVG(h.annual_premium) as avg_annual_premium,
    AVG(h.place_rate) as avg_place_rate
FROM training_cohorts tc
JOIN cap_score_history h ON tc.agent_name = h.agent_name AND tc.week_of = h.week_of
GROUP BY tc.week_of, tc.training_status
ORDER BY tc.week_of DESC, tc.training_status;

-- ============================================================================
-- TOP IMPROVERS AND DECLINERS
-- ============================================================================

-- Find agents with biggest improvements/declines over past 4 weeks
WITH recent_changes AS (
    SELECT 
        agent_name,
        MAX(CASE WHEN week_of = CURRENT_DATE - INTERVAL '4 weeks' THEN adjusted_cap_score END) as cap_4wk_ago,
        MAX(CASE WHEN week_of = CURRENT_DATE - INTERVAL '0 weeks' THEN adjusted_cap_score END) as cap_current,
        MAX(CASE WHEN week_of = CURRENT_DATE - INTERVAL '4 weeks' THEN close_rate END) as close_4wk_ago,
        MAX(CASE WHEN week_of = CURRENT_DATE - INTERVAL '0 weeks' THEN close_rate END) as close_current
    FROM cap_score_history
    WHERE week_of >= CURRENT_DATE - INTERVAL '4 weeks'
    GROUP BY agent_name
    HAVING COUNT(*) >= 2
)
SELECT 
    agent_name,
    cap_4wk_ago,
    cap_current,
    cap_current - cap_4wk_ago as cap_change,
    ROUND(((cap_current - cap_4wk_ago) / NULLIF(cap_4wk_ago, 0) * 100)::numeric, 2) as cap_change_pct,
    close_4wk_ago,
    close_current,
    close_current - close_4wk_ago as close_change,
    ROUND(((close_current - close_4wk_ago) / NULLIF(close_4wk_ago, 0) * 100)::numeric, 2) as close_change_pct
FROM recent_changes
WHERE cap_4wk_ago IS NOT NULL AND cap_current IS NOT NULL
ORDER BY cap_change_pct DESC
LIMIT 20;
