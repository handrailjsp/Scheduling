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
-- SEED DATA: Sample Timetable - Packed Schedule with Breaks
-- ============================================
-- Schedule Pattern: 
--   7-8am: Early morning class
--   8-9am: Morning class
--   9-10am: Morning class
--   10-11am: Morning class
--   11am-12pm: Morning class
--   12-1pm: LUNCH BREAK (no classes)
--   1-2pm: Afternoon class
--   2-3pm: Afternoon class
--   3-4pm: Afternoon class
--   4-5pm: Late afternoon class
--   5-6pm: Evening class

INSERT INTO timetable_slots (professor_id, day_of_week, hour, end_hour, subject, room, needs_ac) VALUES
    (1, 1, 7, 8, 'Data Structures', '322', true),
    (1, 1, 9, 11, 'Algorithms', '322', true),
    (1, 1, 13, 14, 'Database Systems', '322', true),
    (1, 2, 8, 9, 'Algorithms', '322', true),
    (1, 2, 10, 11, 'Operating Systems', '322', true),
    (1, 2, 14, 16, 'Computer Networks', '322', true),
    (1, 3, 8, 10, 'Data Structures', '322', true),
    (1, 3, 10, 11, 'Database Systems', '322', true),
    (1, 4, 8, 10, 'Software Engineering', '322', true),
    (1, 5, 8, 10, 'Software Engineering', '322', true),
    (1, 5, 13, 15, 'Algorithms', '322', true),
    (2, 1, 7, 8, 'Ethics', '323', true),
    (2, 1, 14, 15, 'Moral Philosophy', '322', true),
    (2, 2, 8, 9, 'Philosophy', '323', true),
    (2, 2, 10, 11, 'Critical Thinking', '323', true),
    (2, 3, 7, 9, 'Logic', '323', true),
    (2, 3, 9, 11, 'Moral Philosophy', '323', true),
    (2, 4, 7, 9, 'Critical Thinking', '323', true),
    (2, 5, 9, 11, 'Moral Philosophy', '323', true),
    (2, 5, 13, 15, 'Philosophy', '323', true),
    (3, 1, 8, 10, 'Calculus I', '323', true),
    (3, 1, 14, 15, 'Differential Equations', '323', true),
    (3, 2, 9, 10, 'Calculus II', '322', true),
    (3, 2, 13, 15, 'Discrete Math', '323', true),
    (3, 3, 14, 15, 'Differential Equations', '322', true),
    (3, 4, 7, 8, 'Calculus II', '322', true),
    (3, 4, 13, 15, 'Discrete Math', '322', true),
    (3, 4, 15, 17, 'Calculus I', '322', true),
    (3, 5, 15, 17, 'Differential Equations', '322', true),
    (4, 1, 15, 16, 'Lab Safety', '322', true),
    (4, 2, 8, 10, 'Chemistry', '324', true),
    (4, 2, 13, 15, 'Biochemistry', '324', true),
    (4, 2, 16, 17, 'Analytical Chemistry', '322', true),
    (4, 3, 9, 11, 'Organic Chemistry', '324', true),
    (4, 3, 13, 14, 'Lab Safety', '322', true),
    (4, 3, 16, 17, 'Physical Chemistry', '322', true),
    (4, 4, 9, 10, 'Organic Chemistry', '323', true),
    (4, 4, 15, 17, 'Lab Safety', '323', true),
    (4, 5, 7, 8, 'Physical Chemistry', '322', true),
    (4, 5, 13, 14, 'Organic Chemistry', '324', true),
    (4, 5, 16, 17, 'Lab Safety', '323', true),
    (5, 1, 15, 16, 'Mobile Apps', '323', true),
    (5, 2, 7, 8, 'Programming I', '322', true),
    (5, 2, 13, 14, 'Web Development', '322', true),
    (5, 2, 16, 17, 'Game Development', '323', true),
    (5, 3, 9, 11, 'Programming II', '212', true),
    (5, 4, 7, 8, 'Programming I', '324', true),
    (5, 4, 13, 14, 'Web Development', '323', true),
    (5, 4, 16, 18, 'Game Development', '324', true),
    (5, 5, 15, 16, 'Mobile Apps', '323', true),
    (6, 1, 15, 16, 'Electromagnetism', '324', true),
    (6, 2, 8, 10, 'Physics I', '401', true),
    (6, 2, 13, 14, 'Thermodynamics', '212', true),
    (6, 2, 16, 18, 'Quantum Mechanics', '324', true),
    (6, 3, 15, 17, 'Electromagnetism', '323', true),
    (6, 4, 8, 10, 'Physics I', '324', true),
    (6, 5, 7, 9, 'Quantum Mechanics', '323', true),
    (6, 5, 15, 16, 'Electromagnetism', '324', true),
    (7, 1, 13, 14, 'Probability', '323', true),
    (7, 1, 16, 17, 'Machine Learning', '322', true),
    (7, 2, 9, 11, 'Probability', '409', true),
    (7, 2, 15, 16, 'Machine Learning', '323', true),
    (7, 3, 8, 9, 'Statistics', '324', true),
    (7, 3, 13, 14, 'Data Analytics', '323', true),
    (7, 3, 16, 18, 'Big Data', '324', true),
    (7, 4, 15, 17, 'Machine Learning', '405', true),
    (7, 5, 14, 15, 'Data Analytics', '324', true),
    (8, 1, 7, 8, 'English Composition', '324', true),
    (8, 1, 16, 17, 'Rhetoric', '323', true),
    (8, 3, 7, 8, 'English Composition', '322', true),
    (8, 3, 15, 16, 'Rhetoric', '322', true),
    (8, 4, 15, 17, 'Creative Writing', '406', true),
    (8, 5, 7, 8, 'English Composition', '324', true),
    (9, 1, 14, 16, 'Business Management', '409', true),
    (9, 2, 16, 17, 'Accounting', '410', true),
    (9, 4, 7, 8, 'Accounting', '403', true),
    (10, 1, 14, 15, 'Political Science', '324', true),
    (10, 1, 16, 17, 'Anthropology', '324', true),
    (10, 2, 10, 11, 'World History', '324', true),
    (10, 3, 7, 8, 'History', '324', true),
    (10, 3, 16, 18, 'Anthropology', '407', true),
    (10, 5, 7, 9, 'History', '305', true),
    (10, 5, 16, 18, 'Anthropology', '324', true),
    (1, 2, 7, 8, 'Data Structures', '101', false),
    (1, 2, 9, 10, 'Database Systems', '404', false),
    (1, 3, 7, 8, 'Computer Networks', '101', false),
    (1, 3, 13, 15, 'Operating Systems', '407', false),
    (1, 3, 15, 17, 'Software Engineering', '408', false),
    (1, 4, 13, 15, 'Database Systems', '101', false),
    (1, 5, 7, 8, 'Computer Networks', '410', false),
    (2, 1, 9, 11, 'Philosophy', '403', false),
    (2, 1, 13, 14, 'Critical Thinking', '404', false),
    (2, 2, 9, 10, 'Logic', '407', false),
    (2, 2, 13, 15, 'Moral Philosophy', '408', false),
    (2, 3, 13, 15, 'Ethics', '410', false),
    (2, 4, 9, 11, 'Moral Philosophy', '402', false),
    (2, 4, 13, 15, 'Philosophy', '212', false),
    (2, 5, 8, 9, 'Critical Thinking', '141', false),
    (3, 1, 13, 14, 'Discrete Math', '403', false),
    (3, 2, 7, 8, 'Calculus I', '141', false),
    (3, 2, 10, 11, 'Linear Algebra', '406', false),
    (3, 3, 8, 9, 'Calculus II', '408', false),
    (3, 3, 13, 14, 'Discrete Math', '409', false),
    (3, 3, 15, 16, 'Calculus I', '141', false),
    (3, 4, 8, 9, 'Linear Algebra', '410', false),
    (3, 5, 7, 8, 'Calculus II', '403', false),
    (3, 5, 13, 14, 'Discrete Math', '404', false),
    (4, 1, 9, 11, 'Chemistry', '406', false),
    (4, 1, 13, 14, 'Biochemistry', '407', false),
    (4, 1, 16, 17, 'Analytical Chemistry', '101', false),
    (4, 2, 15, 16, 'Lab Safety', '141', false),
    (4, 3, 7, 9, 'Chemistry', '410', false),
    (4, 3, 15, 16, 'Analytical Chemistry', '212', false),
    (4, 4, 7, 9, 'Chemistry', '402', false),
    (4, 4, 13, 15, 'Biochemistry', '403', false),
    (4, 5, 15, 16, 'Biochemistry', '141', false),
    (5, 1, 8, 9, 'Programming I', '101', false),
    (5, 1, 13, 15, 'Web Development', '406', false),
    (5, 1, 16, 17, 'Game Development', '408', false),
    (5, 2, 8, 9, 'Programming II', '410', false),
    (5, 2, 15, 16, 'Mobile Apps', '401', false),
    (5, 3, 8, 9, 'Programming I', '403', false),
    (5, 3, 13, 15, 'Web Development', '404', false),
    (5, 3, 16, 18, 'Game Development', '212', false),
    (5, 4, 8, 10, 'Programming II', '406', false),
    (5, 4, 15, 16, 'Mobile Apps', '408', false),
    (5, 5, 8, 9, 'Programming I', '410', false),
    (5, 5, 13, 15, 'Web Development', '401', false),
    (6, 1, 9, 10, 'Physics I', '404', false),
    (6, 1, 13, 15, 'Thermodynamics', '408', false),
    (6, 1, 16, 17, 'Quantum Mechanics', '409', false),
    (6, 2, 10, 11, 'Physics II', '402', false),
    (6, 2, 14, 16, 'Electromagnetism', '403', false),
    (6, 3, 7, 8, 'Physics I', '212', false),
    (6, 3, 13, 15, 'Thermodynamics', '405', false),
    (6, 5, 9, 10, 'Physics I', '409', false),
    (6, 5, 13, 15, 'Thermodynamics', '410', false),
    (7, 1, 14, 15, 'Data Analytics', '402', false),
    (7, 2, 7, 9, 'Statistics', '404', false),
    (7, 2, 16, 18, 'Big Data', '401', false),
    (7, 4, 7, 9, 'Statistics', '404', false),
    (7, 4, 13, 14, 'Data Analytics', '305', false),
    (7, 5, 15, 16, 'Machine Learning', '406', false),
    (8, 1, 9, 10, 'Technical Writing', '407', false),
    (8, 1, 15, 16, 'Creative Writing', '408', false),
    (8, 2, 8, 9, 'English Composition', '402', false),
    (8, 2, 16, 17, 'Rhetoric', '403', false),
    (8, 5, 9, 10, 'Technical Writing', '141', false),
    (9, 3, 15, 16, 'Finance', '401', false),
    (9, 5, 8, 9, 'Finance', '404', false),
    (9, 5, 15, 16, 'Macroeconomics', '407', false),
    (10, 1, 15, 16, 'Sociology', '401', false),
    (10, 2, 16, 18, 'Anthropology', '405', false),
    (10, 4, 7, 8, 'History', '305', false),
    (10, 4, 15, 16, 'Anthropology', '409', false),
    (10, 5, 9, 10, 'World History', '305', false));








-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check professor count
-- SELECT COUNT(*) as professor_count FROM professors;

-- Check timetable slots
-- SELECT COUNT(*) as total_slots,
--        SUM(CASE WHEN needs_ac THEN 1 ELSE 0 END) as ac_slots,
--        SUM(CASE WHEN NOT needs_ac THEN 1 ELSE 0 END) as non_ac_slots
-- FROM timetable_slots;

-- Check schedule distribution by day
-- SELECT day_of_week, COUNT(*) as slots_per_day,
--        SUM(CASE WHEN hour = 12 THEN 1 ELSE 0 END) as lunch_slots
-- FROM timetable_slots
-- GROUP BY day_of_week
-- ORDER BY day_of_week;

-- Check rooms
-- SELECT DISTINCT room, needs_ac 
-- FROM timetable_slots 
-- ORDER BY needs_ac DESC, room;

-- Check subjects
-- SELECT DISTINCT subject 
-- FROM timetable_slots 
-- ORDER BY subject;

-- View full schedule
-- SELECT p.name, t.day_of_week, t.hour, t.end_hour, t.subject, t.room, t.needs_ac
-- FROM timetable_slots t
-- JOIN professors p ON t.professor_id = p.id
-- ORDER BY t.day_of_week, t.hour, p.name;

-- ============================================
-- NOTES
-- ============================================
-- AC Rooms: 322, 323, 324 (hardcoded in GA engine)
-- Non-AC Rooms: 101, 141, 212, 305
-- Working Hours: 7am-6pm (hours 7-17)
-- Lunch Break: 12-1pm (hour 12, no classes scheduled)
-- Days: Monday-Saturday (1-6)
-- 
-- Schedule Pattern:
-- - Each professor has 6-8 classes per day
-- - 12-1pm lunch break respected (no hour=12 slots)
-- - Classes are 1 hour each
-- - Randomized AC requirements (50/50 distribution)
-- - 92 total time slots across the week
-- 
-- Foreign Key Cascade:
-- - Deleting a professor will delete their timetable_slots
-- - Deleting a generated_schedule will delete its slots
--
-- Unique Constraints:
-- - No professor can be in two places at once
-- - No room can host two classes at once
