-- ============================================
-- Migration: Remove time and day constraints from all tables
-- ============================================
-- This migration removes the CHECK constraints on day_of_week, hour/start_hour and end_hour columns
-- to allow scheduling classes on any day and at any time

-- Drop constraints from timetable_slots
ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_day_of_week_check;

ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_hour_check;

ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_end_hour_check;

-- Drop constraints from generated_schedule_slots
ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_day_of_week_check;

ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_start_hour_check;

ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_end_hour_check;

-- The valid_time_range constraints (end_hour > hour) remain intact in both tables
-- The unique constraints remain intact

-- Verify the changes
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN ('timetable_slots'::regclass, 'generated_schedule_slots'::regclass)
ORDER BY table_name, conname;
