# Database Setup Guide

Complete SQL queries for setting up and running the Timetable Scheduling System with Supabase PostgreSQL.

---

## Table of Contents
1. [Initial Database Setup](#initial-database-setup)
2. [Schema Creation](#schema-creation)
3. [Migrations](#migrations)
4. [Data Verification Queries](#data-verification-queries)
5. [Common Maintenance Queries](#common-maintenance-queries)
6. [Troubleshooting Queries](#troubleshooting-queries)

---

## Initial Database Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy your **Project URL** and **anon/public API key**
4. Update `.env.local` with your credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Run Schema Creation
Navigate to SQL Editor in Supabase Dashboard and execute the complete schema below.

---

## Schema Creation

### Complete Database Schema (Run This First)

```sql
-- ============================================
-- TIMETABLE SCHEDULING SYSTEM DATABASE SCHEMA
-- ============================================

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS generated_schedule_slots CASCADE;
DROP TABLE IF EXISTS generated_schedules CASCADE;
DROP TABLE IF EXISTS timetable_slots CASCADE;
DROP TABLE IF EXISTS professors CASCADE;

-- ============================================
-- DIMENSION TABLE: Professors
-- ============================================
CREATE TABLE professors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FACT TABLE: Timetable Slots (Live Schedule)
-- ============================================
CREATE TABLE timetable_slots (
    id SERIAL PRIMARY KEY,
    professor_id INTEGER NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    subject TEXT NOT NULL,
    room TEXT NOT NULL,
    needs_ac BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_hour > hour),
    CONSTRAINT unique_professor_time UNIQUE (professor_id, day_of_week, hour),
    CONSTRAINT unique_room_time UNIQUE (room, day_of_week, hour)
);

-- ============================================
-- DIMENSION TABLE: Generated Schedules (AI Generated)
-- ============================================
CREATE TABLE generated_schedules (
    id SERIAL PRIMARY KEY,
    fitness_score DECIMAL(10, 2) NOT NULL,
    hard_constraint_violations INTEGER NOT NULL DEFAULT 0,
    soft_constraint_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gini_workload DECIMAL(10, 4) DEFAULT 0,
    gini_room_usage DECIMAL(10, 4) DEFAULT 0,
    gini_ac_access DECIMAL(10, 4) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    generation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- ============================================
-- FACT TABLE: Generated Schedule Slots
-- ============================================
CREATE TABLE generated_schedule_slots (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES generated_schedules(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    section_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_gen_time_range CHECK (end_hour > start_hour)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
-- Timetable slots indexes
CREATE INDEX idx_timetable_professor ON timetable_slots(professor_id);
CREATE INDEX idx_timetable_room ON timetable_slots(room);
CREATE INDEX idx_timetable_time ON timetable_slots(day_of_week, hour);

-- Generated schedule slots indexes
CREATE INDEX idx_gen_schedule ON generated_schedule_slots(schedule_id);
CREATE INDEX idx_gen_professor ON generated_schedule_slots(professor_id);
CREATE INDEX idx_gen_time ON generated_schedule_slots(day_of_week, start_hour);

-- Generated schedules indexes
CREATE INDEX idx_schedules_status ON generated_schedules(status);
CREATE INDEX idx_schedules_date ON generated_schedules(generation_date DESC);

-- ============================================
-- SEED DATA: Sample Professors
-- ============================================
INSERT INTO professors (name, title, department) VALUES
    ('Victor Wembanyama', 'Center', 'Spurs'),
    ('Stephon Castle', 'Guard', 'Spurs'),
    ('Harrison Barnes', 'Forward', 'Spurs'),
    ('Devin Vassell', 'Guard', 'Spurs'),
    ('De''Aaron Fox', 'Point Guard', 'Kings'),
    ('Domantas Sabonis', 'Center', 'Kings'),
    ('Kevin Huerter', 'Guard', 'Kings'),
    ('Keegan Murray', 'Forward', 'Kings'),
    ('LEBRON JAMES', 'Forward', 'Lakers'),
    ('Tristan Thompson', 'Center', 'Cavaliers');

-- ============================================
-- SEED DATA: Sample Timetable
-- ============================================
INSERT INTO timetable_slots (professor_id, day_of_week, hour, end_hour, subject, room, needs_ac) VALUES
    -- Victor Wembanyama (Professor 1) - Computer Science
    (1, 1, 7, 8, 'Data Structures', '322', true),
    (1, 1, 9, 11, 'Algorithms', '322', true),
    (1, 1, 13, 14, 'Database Systems', '322', true),
    (1, 2, 7, 8, 'Data Structures', '101', false),
    (1, 2, 8, 9, 'Algorithms', '322', true),
    (1, 2, 9, 10, 'Database Systems', '404', false),
    (1, 2, 10, 11, 'Operating Systems', '322', true),
    (1, 2, 14, 16, 'Computer Networks', '322', true),
    (1, 3, 7, 8, 'Computer Networks', '101', false),
    (1, 3, 8, 10, 'Data Structures', '322', true),
    (1, 3, 10, 11, 'Database Systems', '322', true),
    (1, 3, 13, 15, 'Operating Systems', '407', false),
    (1, 3, 15, 17, 'Software Engineering', '408', false),
    (1, 4, 8, 10, 'Software Engineering', '322', true),
    (1, 4, 13, 15, 'Database Systems', '101', false),
    (1, 5, 7, 8, 'Computer Networks', '410', false),
    (1, 5, 8, 10, 'Software Engineering', '322', true),
    (1, 5, 13, 15, 'Algorithms', '322', true),
    
    -- Stephon Castle (Professor 2) - Philosophy
    (2, 1, 7, 8, 'Ethics', '323', true),
    (2, 1, 9, 11, 'Philosophy', '403', false),
    (2, 1, 13, 14, 'Critical Thinking', '404', false),
    (2, 1, 14, 15, 'Moral Philosophy', '322', true),
    (2, 2, 8, 9, 'Philosophy', '323', true),
    (2, 2, 9, 10, 'Logic', '407', false),
    (2, 2, 10, 11, 'Critical Thinking', '323', true),
    (2, 2, 13, 15, 'Moral Philosophy', '408', false),
    (2, 3, 7, 9, 'Logic', '323', true),
    (2, 3, 9, 11, 'Moral Philosophy', '323', true),
    (2, 3, 13, 15, 'Ethics', '410', false),
    (2, 4, 7, 9, 'Critical Thinking', '323', true),
    (2, 4, 9, 11, 'Moral Philosophy', '402', false),
    (2, 4, 13, 15, 'Philosophy', '212', false),
    (2, 5, 8, 9, 'Critical Thinking', '141', false),
    (2, 5, 9, 11, 'Moral Philosophy', '323', true),
    (2, 5, 13, 15, 'Philosophy', '323', true),
    
    -- Harrison Barnes (Professor 3) - Mathematics
    (3, 1, 8, 10, 'Calculus I', '323', true),
    (3, 1, 13, 14, 'Discrete Math', '403', false),
    (3, 1, 14, 15, 'Differential Equations', '323', true),
    (3, 2, 7, 8, 'Calculus I', '141', false),
    (3, 2, 9, 10, 'Calculus II', '322', true),
    (3, 2, 10, 11, 'Linear Algebra', '406', false),
    (3, 2, 13, 15, 'Discrete Math', '323', true),
    (3, 3, 8, 9, 'Calculus II', '408', false),
    (3, 3, 13, 14, 'Discrete Math', '409', false),
    (3, 3, 14, 15, 'Differential Equations', '322', true),
    (3, 3, 15, 16, 'Calculus I', '141', false),
    (3, 4, 7, 8, 'Calculus II', '322', true),
    (3, 4, 8, 9, 'Linear Algebra', '410', false),
    (3, 4, 13, 15, 'Discrete Math', '322', true),
    (3, 4, 15, 17, 'Calculus I', '322', true),
    (3, 5, 7, 8, 'Calculus II', '403', false),
    (3, 5, 13, 14, 'Discrete Math', '404', false),
    (3, 5, 15, 17, 'Differential Equations', '322', true),
    
    -- Devin Vassell (Professor 4) - Chemistry
    (4, 1, 9, 11, 'Chemistry', '406', false),
    (4, 1, 13, 14, 'Biochemistry', '407', false),
    (4, 1, 15, 16, 'Lab Safety', '322', true),
    (4, 1, 16, 17, 'Analytical Chemistry', '101', false),
    (4, 2, 8, 10, 'Chemistry', '324', true),
    (4, 2, 13, 15, 'Biochemistry', '324', true),
    (4, 2, 15, 16, 'Lab Safety', '141', false),
    (4, 2, 16, 17, 'Analytical Chemistry', '322', true),
    (4, 3, 7, 9, 'Chemistry', '410', false),
    (4, 3, 9, 11, 'Organic Chemistry', '324', true),
    (4, 3, 13, 14, 'Lab Safety', '322', true),
    (4, 3, 15, 16, 'Analytical Chemistry', '212', false),
    (4, 3, 16, 17, 'Physical Chemistry', '322', true),
    (4, 4, 7, 9, 'Chemistry', '402', false),
    (4, 4, 9, 10, 'Organic Chemistry', '323', true),
    (4, 4, 13, 15, 'Biochemistry', '403', false),
    (4, 4, 15, 17, 'Lab Safety', '323', true),
    (4, 5, 7, 8, 'Physical Chemistry', '322', true),
    (4, 5, 13, 14, 'Organic Chemistry', '324', true),
    (4, 5, 15, 16, 'Biochemistry', '141', false),
    (4, 5, 16, 17, 'Lab Safety', '323', true),
    
    -- De'Aaron Fox (Professor 5) - Programming
    (5, 1, 8, 9, 'Programming I', '101', false),
    (5, 1, 13, 15, 'Web Development', '406', false),
    (5, 1, 15, 16, 'Mobile Apps', '323', true),
    (5, 1, 16, 17, 'Game Development', '408', false),
    (5, 2, 7, 8, 'Programming I', '322', true),
    (5, 2, 8, 9, 'Programming II', '410', false),
    (5, 2, 13, 14, 'Web Development', '322', true),
    (5, 2, 15, 16, 'Mobile Apps', '401', false),
    (5, 2, 16, 17, 'Game Development', '323', true),
    (5, 3, 8, 9, 'Programming I', '403', false),
    (5, 3, 9, 11, 'Programming II', '212', true),
    (5, 3, 13, 15, 'Web Development', '404', false),
    (5, 3, 16, 18, 'Game Development', '212', false),
    (5, 4, 7, 8, 'Programming I', '324', true),
    (5, 4, 8, 10, 'Programming II', '406', false),
    (5, 4, 13, 14, 'Web Development', '323', true),
    (5, 4, 15, 16, 'Mobile Apps', '408', false),
    (5, 4, 16, 18, 'Game Development', '324', true),
    (5, 5, 8, 9, 'Programming I', '410', false),
    (5, 5, 13, 15, 'Web Development', '401', false),
    (5, 5, 15, 16, 'Mobile Apps', '323', true),
    
    -- Domantas Sabonis (Professor 6) - Physics
    (6, 1, 9, 10, 'Physics I', '404', false),
    (6, 1, 13, 15, 'Thermodynamics', '408', false),
    (6, 1, 15, 16, 'Electromagnetism', '324', true),
    (6, 1, 16, 17, 'Quantum Mechanics', '409', false),
    (6, 2, 8, 10, 'Physics I', '401', true),
    (6, 2, 10, 11, 'Physics II', '402', false),
    (6, 2, 13, 14, 'Thermodynamics', '212', true),
    (6, 2, 14, 16, 'Electromagnetism', '403', false),
    (6, 2, 16, 18, 'Quantum Mechanics', '324', true),
    (6, 3, 7, 8, 'Physics I', '212', false),
    (6, 3, 13, 15, 'Thermodynamics', '405', false),
    (6, 3, 15, 17, 'Electromagnetism', '323', true),
    (6, 4, 8, 10, 'Physics I', '324', true),
    (6, 5, 7, 9, 'Quantum Mechanics', '323', true),
    (6, 5, 9, 10, 'Physics I', '409', false),
    (6, 5, 13, 15, 'Thermodynamics', '410', false),
    (6, 5, 15, 16, 'Electromagnetism', '324', true),
    
    -- Kevin Huerter (Professor 7) - Statistics/ML
    (7, 1, 13, 14, 'Probability', '323', true),
    (7, 1, 14, 15, 'Data Analytics', '402', false),
    (7, 1, 16, 17, 'Machine Learning', '322', true),
    (7, 2, 7, 9, 'Statistics', '404', false),
    (7, 2, 9, 11, 'Probability', '409', true),
    (7, 2, 15, 16, 'Machine Learning', '323', true),
    (7, 2, 16, 18, 'Big Data', '401', false),
    (7, 3, 8, 9, 'Statistics', '324', true),
    (7, 3, 13, 14, 'Data Analytics', '323', true),
    (7, 3, 16, 18, 'Big Data', '324', true),
    (7, 4, 7, 9, 'Statistics', '404', false),
    (7, 4, 13, 14, 'Data Analytics', '305', false),
    (7, 4, 15, 17, 'Machine Learning', '405', true),
    (7, 5, 14, 15, 'Data Analytics', '324', true),
    (7, 5, 15, 16, 'Machine Learning', '406', false),
    
    -- Keegan Murray (Professor 8) - English
    (8, 1, 7, 8, 'English Composition', '324', true),
    (8, 1, 9, 10, 'Technical Writing', '407', false),
    (8, 1, 15, 16, 'Creative Writing', '408', false),
    (8, 1, 16, 17, 'Rhetoric', '323', true),
    (8, 2, 8, 9, 'English Composition', '402', false),
    (8, 2, 16, 17, 'Rhetoric', '403', false),
    (8, 3, 7, 8, 'English Composition', '322', true),
    (8, 3, 15, 16, 'Rhetoric', '322', true),
    (8, 4, 15, 17, 'Creative Writing', '406', true),
    (8, 5, 7, 8, 'English Composition', '324', true),
    (8, 5, 9, 10, 'Technical Writing', '141', false),
    
    -- LEBRON JAMES (Professor 9) - Business
    (9, 1, 14, 16, 'Business Management', '409', true),
    (9, 2, 16, 17, 'Accounting', '410', true),
    (9, 3, 15, 16, 'Finance', '401', false),
    (9, 4, 7, 8, 'Accounting', '403', true),
    (9, 5, 8, 9, 'Finance', '404', false),
    (9, 5, 15, 16, 'Macroeconomics', '407', false),
    
    -- Tristan Thompson (Professor 10) - Social Sciences
    (10, 1, 14, 15, 'Political Science', '324', true),
    (10, 1, 15, 16, 'Sociology', '401', false),
    (10, 1, 16, 17, 'Anthropology', '324', true),
    (10, 2, 10, 11, 'World History', '324', true),
    (10, 2, 16, 18, 'Anthropology', '405', false),
    (10, 3, 7, 8, 'History', '324', true),
    (10, 3, 16, 18, 'Anthropology', '407', true),
    (10, 4, 7, 8, 'History', '305', false),
    (10, 4, 15, 16, 'Anthropology', '409', false),
    (10, 5, 7, 9, 'History', '305', false),
    (10, 5, 9, 10, 'World History', '305', false),
    (10, 5, 16, 18, 'Anthropology', '324', true);
```

---

## Migrations

### Migration 1: Add GINI Coefficient Columns
**Date:** 2026-02-14  
**Purpose:** Add fairness metrics to track distribution equality

```sql
-- Add Gini coefficient columns
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS gini_workload DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gini_room_usage DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gini_ac_access DECIMAL(10, 4) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN generated_schedules.gini_workload IS 'Gini coefficient for professor workload distribution (0=equal, 1=unequal)';
COMMENT ON COLUMN generated_schedules.gini_room_usage IS 'Gini coefficient for room utilization (0=equal, 1=unequal)';
COMMENT ON COLUMN generated_schedules.gini_ac_access IS 'Gini coefficient for AC room access among AC-preferring professors (0=equal, 1=unequal)';

-- Verify migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'generated_schedules'
AND column_name LIKE 'gini%';
```

### Migration 2: Remove Time Constraints (Optional)
**Purpose:** Allow scheduling classes on any day and at any time

```sql
-- Drop day/time constraints from timetable_slots
ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_day_of_week_check;

ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_hour_check;

ALTER TABLE timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_end_hour_check;

-- Drop day/time constraints from generated_schedule_slots
ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_day_of_week_check;

ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_start_hour_check;

ALTER TABLE generated_schedule_slots
    DROP CONSTRAINT IF EXISTS generated_schedule_slots_end_hour_check;

-- Verify the changes
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN ('timetable_slots'::regclass, 'generated_schedule_slots'::regclass)
ORDER BY table_name, conname;
```

---

## Data Verification Queries

### Verify Professor Count
```sql
SELECT COUNT(*) as professor_count FROM professors;
-- Expected: 10 professors
```

### Check Timetable Slots Distribution
```sql
SELECT COUNT(*) as total_slots,
       SUM(CASE WHEN needs_ac THEN 1 ELSE 0 END) as ac_slots,
       SUM(CASE WHEN NOT needs_ac THEN 1 ELSE 0 END) as non_ac_slots
FROM timetable_slots;
-- Expected: ~170-180 total slots with ~50/50 AC/non-AC distribution
```

### Check Schedule Distribution by Day
```sql
SELECT day_of_week, COUNT(*) as slots_per_day
FROM timetable_slots
GROUP BY day_of_week
ORDER BY day_of_week;
-- Expected: Fairly even distribution across days 1-5
```

### List All Rooms
```sql
SELECT DISTINCT room, 
       SUM(CASE WHEN needs_ac THEN 1 ELSE 0 END) as ac_count,
       SUM(CASE WHEN NOT needs_ac THEN 1 ELSE 0 END) as non_ac_count
FROM timetable_slots 
GROUP BY room
ORDER BY room;
-- AC Rooms: 322, 323, 324
-- Non-AC Rooms: 101, 141, 212, 305, 401-410
```

### List All Subjects
```sql
SELECT DISTINCT subject 
FROM timetable_slots 
ORDER BY subject;
```

### View Full Schedule
```sql
SELECT p.name, t.day_of_week, t.hour, t.end_hour, t.subject, t.room, t.needs_ac
FROM timetable_slots t
JOIN professors p ON t.professor_id = p.id
ORDER BY t.day_of_week, t.hour, p.name;
```

### Check GINI Columns
```sql
SELECT id, fitness_score, gini_workload, gini_room_usage, gini_ac_access, status
FROM generated_schedules
ORDER BY generation_date DESC
LIMIT 10;
```

---

## Common Maintenance Queries

### Add a New Professor
```sql
INSERT INTO professors (name, title, department) 
VALUES ('New Professor', 'Associate Professor', 'Computer Science')
RETURNING id;
```

### Add a New Timetable Slot
```sql
INSERT INTO timetable_slots (professor_id, day_of_week, hour, end_hour, subject, room, needs_ac)
VALUES (1, 1, 15, 16, 'Advanced Algorithms', '322', true);
```

### Update Professor Information
```sql
UPDATE professors 
SET title = 'Full Professor', department = 'Mathematics'
WHERE id = 3;
```

### Delete a Timetable Slot
```sql
DELETE FROM timetable_slots 
WHERE professor_id = 1 AND day_of_week = 1 AND hour = 15;
```

### Clear All Timetable Slots
```sql
DELETE FROM timetable_slots WHERE id IS NOT NULL;
-- Or using the backend approach:
DELETE FROM timetable_slots WHERE id != 0;
```

### View Approved Schedules
```sql
SELECT s.id, s.fitness_score, s.gini_workload, s.gini_room_usage, s.gini_ac_access, s.generation_date
FROM generated_schedules s
WHERE s.status = 'approved'
ORDER BY s.generation_date DESC;
```

### Get Latest Generated Schedule with Slots
```sql
SELECT s.id, s.fitness_score, s.gini_workload, s.status, 
       COUNT(ss.id) as slot_count
FROM generated_schedules s
LEFT JOIN generated_schedule_slots ss ON s.id = ss.schedule_id
GROUP BY s.id
ORDER BY s.generation_date DESC
LIMIT 1;
```

### Delete Old Generated Schedules (Keep Last 10)
```sql
DELETE FROM generated_schedules
WHERE id NOT IN (
    SELECT id FROM generated_schedules
    ORDER BY generation_date DESC
    LIMIT 10
);
```

---

## Troubleshooting Queries

### Check for Constraint Violations

#### Find Professor Double-Bookings
```sql
SELECT professor_id, day_of_week, hour, COUNT(*) as clash_count
FROM timetable_slots
GROUP BY professor_id, day_of_week, hour
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

#### Find Room Double-Bookings
```sql
SELECT room, day_of_week, hour, COUNT(*) as clash_count
FROM timetable_slots
GROUP BY room, day_of_week, hour
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Check Indexes
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('professors', 'timetable_slots', 'generated_schedules', 'generated_schedule_slots')
ORDER BY tablename, indexname;
```

### Check Foreign Key Relationships
```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('timetable_slots', 'generated_schedule_slots');
```

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Reset Database to Initial State
```sql
-- WARNING: This will delete ALL data and recreate tables
-- Only use this for complete reset during development

DROP TABLE IF EXISTS generated_schedule_slots CASCADE;
DROP TABLE IF EXISTS generated_schedules CASCADE;
DROP TABLE IF EXISTS timetable_slots CASCADE;
DROP TABLE IF EXISTS professors CASCADE;

-- Then re-run the complete schema creation above
```

---

## Database Configuration Notes

### Constraints
- **Foreign Keys**: Cascade deletes enabled (deleting professor removes their slots)
- **Unique Constraints**: 
  - No professor can be scheduled in two places at same time
  - No room can host two classes at same time
- **Check Constraints**: 
  - `end_hour > start_hour` (valid time ranges)
  - Schedule status must be: 'pending', 'approved', or 'rejected'

### Room Types
- **AC Rooms**: 322, 323, 324 (hardcoded in GA engine)
- **Non-AC Rooms**: 101, 141, 212, 305, 401-410

### Working Hours
- **Standard Hours**: 7am-6pm (hours 7-17)
- **Lunch Break**: 12-1pm (hour 12, typically no classes)
- **Days**: Monday-Friday (1-5), optionally Saturday (6)

### GINI Coefficients
- **Range**: 0 to 1
- **Meaning**: 
  - 0 = Perfect equality (all professors have equal workload/AC access)
  - 1 = Maximum inequality (one professor has everything)
- **Columns**:
  - `gini_workload`: Distribution of teaching hours
  - `gini_room_usage`: Distribution of room assignments
  - `gini_ac_access`: Distribution of AC room access

---

## Quick Reference Commands

### View Database Connection Info
```bash
# In your terminal (from project root)
cat .env.local | grep SUPABASE
```

### Backup Database
```bash
# Using Supabase CLI (install first: npm i -g supabase)
supabase db dump -f backup.sql
```

### Restore from Backup
```bash
# In Supabase SQL Editor, paste contents of backup.sql
# Or use Supabase CLI:
supabase db reset
```

---

## Support

For database issues:
1. Check Supabase logs in dashboard
2. Verify `.env.local` has correct credentials
3. Ensure all migrations have been run
4. Check foreign key constraints aren't blocking operations
5. Review ga-backend/README.md for API-level troubleshooting
