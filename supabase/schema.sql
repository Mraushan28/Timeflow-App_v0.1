-- ==========================================================
-- TimeFlow Supabase Production Schema & Security Policies
-- ==========================================================
-- This script creates all required tables, triggers, and
-- Row-Level Security (RLS) policies for TimeFlow data persistence.
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Profiles Table (User account details linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.timeflow_tasks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  worker TEXT DEFAULT 'Unknown',
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '📌',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 3. Time History Records (Tracked daily seconds per task)
CREATE TABLE IF NOT EXISTS public.timeflow_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  task_id TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date_key, task_id)
);

-- 4. Scheduled Reminders
CREATE TABLE IF NOT EXISTS public.timeflow_scheduled_reminders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  task_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  advance_notice INTEGER DEFAULT 0,
  worker TEXT DEFAULT '',
  status TEXT DEFAULT 'PENDING',
  is_enabled BOOLEAN DEFAULT TRUE,
  advance_notified BOOLEAN DEFAULT FALSE,
  exact_notified BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 5. Reminder History Log (Resolved reminders)
CREATE TABLE IF NOT EXISTS public.timeflow_reminder_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  worker TEXT DEFAULT '',
  status TEXT NOT NULL,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 6. 30-Day Challenges
CREATE TABLE IF NOT EXISTS public.timeflow_challenges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  started_at TIMESTAMPTZ,
  target_hours TEXT DEFAULT '',
  target_tasks TEXT DEFAULT '',
  days JSONB DEFAULT '{}'::JSONB,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::JSONB,
  day INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 7. User Settings & Preferences
CREATE TABLE IF NOT EXISTS public.timeflow_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  app_active BOOLEAN DEFAULT FALSE,
  selected_worker TEXT DEFAULT 'All Workers',
  notification_settings JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- Enable Row Level Security (RLS) on ALL tables
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_reminder_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeflow_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- Drop existing policies if any (for clean re-runs)
-- ==========================================================
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.timeflow_tasks;
DROP POLICY IF EXISTS "Users can manage their own history" ON public.timeflow_history;
DROP POLICY IF EXISTS "Users can manage their own scheduled reminders" ON public.timeflow_scheduled_reminders;
DROP POLICY IF EXISTS "Users can manage their own reminder history" ON public.timeflow_reminder_history;
DROP POLICY IF EXISTS "Users can manage their own challenges" ON public.timeflow_challenges;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.timeflow_settings;

-- ==========================================================
-- RLS Security Policies: Strict User Isolation (auth.uid() = user_id)
-- ==========================================================
-- Profiles
CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tasks
CREATE POLICY "Users can manage their own tasks"
  ON public.timeflow_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- History
CREATE POLICY "Users can manage their own history"
  ON public.timeflow_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Scheduled Reminders
CREATE POLICY "Users can manage their own scheduled reminders"
  ON public.timeflow_scheduled_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reminder History
CREATE POLICY "Users can manage their own reminder history"
  ON public.timeflow_reminder_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Challenges
CREATE POLICY "Users can manage their own challenges"
  ON public.timeflow_challenges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Settings
CREATE POLICY "Users can manage their own settings"
  ON public.timeflow_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================================
-- Auto-create profile trigger on auth.users signup
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

