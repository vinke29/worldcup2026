-- Add mode column to leagues table
-- Run this in Supabase SQL editor

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'phase_by_phase';

-- Optional: add a check constraint for valid values
ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_mode_check
  CHECK (mode IN ('phase_by_phase', 'entire_tournament'));
