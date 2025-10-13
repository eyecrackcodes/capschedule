-- CAP Training Schedule Management Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Training Schedules (weekly schedule generations)
CREATE TABLE IF NOT EXISTS training_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_of DATE NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    avg_cap_score NUMERIC(10, 2),
    avg_adjusted_cap_score NUMERIC(10, 2),
    total_agents_scheduled INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Sessions (individual time slots)
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES training_schedules(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    time_slot TEXT NOT NULL,
    location TEXT NOT NULL CHECK (location IN ('CLT', 'ATX')),
    tier TEXT NOT NULL,
    training_type TEXT NOT NULL,
    priority TEXT,
    cohort_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Assignments (who's scheduled for which sessions)
CREATE TABLE IF NOT EXISTS agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES training_schedules(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    manager TEXT NOT NULL,
    site TEXT NOT NULL CHECK (site IN ('CHA', 'AUS')),
    tier_code TEXT NOT NULL CHECK (tier_code IN ('P', 'S')),
    original_cap_score INTEGER NOT NULL,
    adjusted_cap_score INTEGER NOT NULL,
    lead_attainment NUMERIC(5, 2),
    leads_per_day NUMERIC(5, 2),
    tenure NUMERIC(5, 2),
    close_rate NUMERIC(5, 2),
    annual_premium NUMERIC(10, 2),
    place_rate NUMERIC(5, 2),
    recommended_training TEXT[],
    -- Attendance tracking
    attended BOOLEAN DEFAULT NULL,
    attendance_marked_at TIMESTAMPTZ,
    attendance_marked_by TEXT,
    no_show_reason TEXT,
    rescheduled_to UUID REFERENCES training_sessions(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical CAP Scores (for tracking improvements)
CREATE TABLE IF NOT EXISTS cap_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    week_of DATE NOT NULL,
    original_cap_score INTEGER,
    adjusted_cap_score INTEGER,
    lead_attainment NUMERIC(5, 2),
    leads_per_day NUMERIC(5, 2),
    close_rate NUMERIC(5, 2),
    annual_premium NUMERIC(10, 2),
    place_rate NUMERIC(5, 2),
    manager TEXT,
    site TEXT,
    tier_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_training_schedules_week_of ON training_schedules(week_of);
CREATE INDEX idx_training_sessions_schedule_id ON training_sessions(schedule_id);
CREATE INDEX idx_training_sessions_day_location ON training_sessions(day, location);
CREATE INDEX idx_agent_assignments_session_id ON agent_assignments(session_id);
CREATE INDEX idx_agent_assignments_agent_name ON agent_assignments(agent_name);
CREATE INDEX idx_agent_assignments_manager ON agent_assignments(manager);
CREATE INDEX idx_agent_assignments_schedule_id ON agent_assignments(schedule_id);
CREATE INDEX idx_agent_assignments_attended ON agent_assignments(attended);
CREATE INDEX idx_cap_score_history_agent_week ON cap_score_history(agent_name, week_of);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Prevent duplicate agent assignments in the same session
CREATE UNIQUE INDEX unique_agent_per_session ON agent_assignments(session_id, agent_name);

-- Prevent duplicate schedules for the same week
CREATE UNIQUE INDEX unique_schedule_per_week ON training_schedules(week_of);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE training_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_score_history ENABLE ROW LEVEL SECURITY;

-- Allow full public access for internal tool
-- Note: For production with external users, replace these with proper auth policies
CREATE POLICY "Public full access" ON training_schedules FOR ALL USING (true);
CREATE POLICY "Public full access" ON training_sessions FOR ALL USING (true);
CREATE POLICY "Public full access" ON agent_assignments FOR ALL USING (true);
CREATE POLICY "Public full access" ON cap_score_history FOR ALL USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_training_schedules_updated_at BEFORE UPDATE ON training_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_assignments_updated_at BEFORE UPDATE ON agent_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Training completion rates by week
CREATE OR REPLACE VIEW training_completion_rates AS
SELECT 
    ts.week_of,
    COUNT(aa.id) as total_assignments,
    COUNT(CASE WHEN aa.attended = true THEN 1 END) as attended_count,
    COUNT(CASE WHEN aa.attended = false THEN 1 END) as no_show_count,
    COUNT(CASE WHEN aa.attended IS NULL THEN 1 END) as pending_count,
    ROUND(COUNT(CASE WHEN aa.attended = true THEN 1 END)::numeric / NULLIF(COUNT(aa.id), 0) * 100, 2) as completion_rate
FROM training_schedules ts
LEFT JOIN agent_assignments aa ON aa.schedule_id = ts.id
GROUP BY ts.week_of
ORDER BY ts.week_of DESC;

-- View: Agent training history with improvements
CREATE OR REPLACE VIEW agent_training_progress AS
SELECT 
    aa.agent_name,
    aa.manager,
    aa.site,
    ts.week_of,
    tse.day,
    tse.training_type,
    aa.original_cap_score,
    aa.adjusted_cap_score,
    aa.attended,
    -- Get CAP score from next week for comparison
    LAG(aa.adjusted_cap_score) OVER (PARTITION BY aa.agent_name ORDER BY ts.week_of DESC) as previous_cap_score,
    aa.adjusted_cap_score - LAG(aa.adjusted_cap_score) OVER (PARTITION BY aa.agent_name ORDER BY ts.week_of DESC) as cap_improvement
FROM agent_assignments aa
JOIN training_sessions tse ON aa.session_id = tse.id
JOIN training_schedules ts ON aa.schedule_id = ts.id
ORDER BY aa.agent_name, ts.week_of DESC;

-- View: Manager dashboard stats
CREATE OR REPLACE VIEW manager_dashboard_stats AS
SELECT 
    aa.manager,
    ts.week_of,
    COUNT(DISTINCT aa.agent_name) as unique_agents,
    COUNT(aa.id) as total_sessions,
    COUNT(CASE WHEN aa.attended = true THEN 1 END) as attended_sessions,
    COUNT(CASE WHEN aa.attended = false THEN 1 END) as no_shows,
    ROUND(AVG(aa.adjusted_cap_score), 2) as avg_cap_score,
    ROUND(COUNT(CASE WHEN aa.attended = true THEN 1 END)::numeric / NULLIF(COUNT(aa.id), 0) * 100, 2) as attendance_rate
FROM agent_assignments aa
JOIN training_schedules ts ON aa.schedule_id = ts.id
GROUP BY aa.manager, ts.week_of
ORDER BY ts.week_of DESC, aa.manager;

-- ============================================================================
-- SAMPLE QUERIES (for reference)
-- ============================================================================

-- Get all schedules with agent counts
-- SELECT ts.*, COUNT(aa.id) as agent_count
-- FROM training_schedules ts
-- LEFT JOIN agent_assignments aa ON aa.schedule_id = ts.id
-- GROUP BY ts.id
-- ORDER BY ts.week_of DESC;

-- Get pending attendance (needs to be marked)
-- SELECT aa.agent_name, aa.manager, tse.day, tse.time_slot, tse.location
-- FROM agent_assignments aa
-- JOIN training_sessions tse ON aa.session_id = tse.id
-- JOIN training_schedules ts ON aa.schedule_id = ts.id
-- WHERE aa.attended IS NULL
-- AND ts.week_of < CURRENT_DATE
-- ORDER BY tse.day, tse.time_slot;

-- Get training effectiveness (agents who improved after training)
-- SELECT 
--     training_type,
--     COUNT(*) as total_trained,
--     COUNT(CASE WHEN cap_improvement > 0 THEN 1 END) as improved_count,
--     ROUND(AVG(cap_improvement), 2) as avg_improvement
-- FROM agent_training_progress
-- WHERE attended = true
-- AND cap_improvement IS NOT NULL
-- GROUP BY training_type;

