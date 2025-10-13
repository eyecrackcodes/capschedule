-- Fix RLS Policies to Allow Public Access
-- Run this in your Supabase SQL Editor to fix the RLS error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public read access" ON training_schedules;
DROP POLICY IF EXISTS "Authenticated full access" ON training_schedules;
DROP POLICY IF EXISTS "Service role full access" ON training_schedules;

DROP POLICY IF EXISTS "Public read access" ON training_sessions;
DROP POLICY IF EXISTS "Authenticated full access" ON training_sessions;
DROP POLICY IF EXISTS "Service role full access" ON training_sessions;

DROP POLICY IF EXISTS "Public read access" ON agent_assignments;
DROP POLICY IF EXISTS "Authenticated full access" ON agent_assignments;
DROP POLICY IF EXISTS "Service role full access" ON agent_assignments;

DROP POLICY IF EXISTS "Public read access" ON cap_score_history;
DROP POLICY IF EXISTS "Authenticated full access" ON cap_score_history;
DROP POLICY IF EXISTS "Service role full access" ON cap_score_history;

-- Create new permissive policies (for internal tool use)
CREATE POLICY "Public full access" ON training_schedules FOR ALL USING (true);
CREATE POLICY "Public full access" ON training_sessions FOR ALL USING (true);
CREATE POLICY "Public full access" ON agent_assignments FOR ALL USING (true);
CREATE POLICY "Public full access" ON cap_score_history FOR ALL USING (true);

-- Verify policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('training_schedules', 'training_sessions', 'agent_assignments', 'cap_score_history');

