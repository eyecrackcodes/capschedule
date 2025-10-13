# Supabase Setup Guide

## Step 1: Create Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://utsuowqjmngrlostinxd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c3Vvd3FqbW5ncmxvc3RpbnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzIxMTksImV4cCI6MjA3NTk0ODExOX0.ixYV-Uep5Jjydx5EHInmmGZRngRH04OCGlF9RkbMoYM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c3Vvd3FqbW5ncmxvc3RpbnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3MjExOSwiZXhwIjoyMDc1OTQ4MTE5fQ.Gim3sjMY-BasT6UtFqQaU35K6u0XDaif1Hvt0HzVLIc
```

## Step 2: Run Database Schema

1. Go to your Supabase project: https://utsuowqjmngrlostinxd.supabase.co
2. Navigate to **SQL Editor**
3. Click **+ New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste and click **Run**

This will create:
- ✅ 4 tables (training_schedules, training_sessions, agent_assignments, cap_score_history)
- ✅ Indexes for fast querying
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for auto-updating timestamps
- ✅ 3 analytical views for reporting

## Step 3: Verify Setup

Run this query in the SQL Editor to verify:

```sql
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
);
```

You should see all 4 tables listed.

## Step 4: Restart Development Server

```bash
pnpm dev
```

The app will now connect to Supabase!

## Database Schema Overview

### Tables

**training_schedules** - Weekly schedule generations
- Stores metadata about each generated schedule
- Tracks week, average CAP scores, total agents

**training_sessions** - Individual training time slots
- Links to a schedule
- Contains day, time, location, training type

**agent_assignments** - Agent-to-session mappings
- Links agents to specific sessions
- Tracks attendance, CAP scores, lead attainment
- Includes notes and rescheduling info

**cap_score_history** - Historical tracking
- Stores weekly snapshots of agent performance
- Enables week-over-week comparison

### Views (Pre-built Analytics)

**training_completion_rates** - Weekly attendance metrics
**agent_training_progress** - Individual improvement tracking
**manager_dashboard_stats** - Manager-level KPIs

## Features Enabled

✅ **Save Schedules** - Persist generated schedules to database  
✅ **Duplicate Prevention** - Can't save same week twice  
✅ **Attendance Tracking** - Mark attended/no-show/pending  
✅ **Historical Data** - Track CAP scores over time  
✅ **Analytics** - Pre-built views for insights  
✅ **Manager Dashboard** - Performance by manager  
✅ **Agent Progress** - Week-over-week improvements  

## Next Steps

See the UI components in `/components/database/` for:
- Saving schedules
- Viewing past schedules
- Marking attendance
- Analytics dashboards

