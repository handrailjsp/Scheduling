# Database Setup Guide

## Quick Start

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar

2. **Run the Schema**
   - Click "New Query"
   - Copy all contents from `schema.sql`
   - Paste into the editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Verify Setup**
   ```sql
   -- Check professors (should return 10)
   SELECT COUNT(*) FROM professors;
   
   -- Check timetable slots (should return 22)
   SELECT COUNT(*) FROM timetable_slots;
   
   -- Check room distribution
   SELECT room, needs_ac, COUNT(*) as slot_count
   FROM timetable_slots
   GROUP BY room, needs_ac
   ORDER BY needs_ac DESC, room;
   ```

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the schema
supabase db reset
```

---

## Database Schema Overview

### Tables Created

1. **`professors`** - Dimension table
   - Stores professor information
   - 10 sample professors included

2. **`timetable_slots`** - Fact table (Live Schedule)
   - Current active class schedule
   - 22 sample slots included (14 AC, 8 non-AC)
   - Foreign key to professors with CASCADE delete

3. **`generated_schedules`** - Dimension table
   - Metadata for AI-generated schedules
   - Tracks fitness scores and status

4. **`generated_schedule_slots`** - Fact table
   - AI-generated schedule assignments
   - Links to generated_schedules

### Key Features

✅ **Foreign Key Constraints** with CASCADE delete
✅ **Unique Constraints** preventing scheduling conflicts
✅ **Check Constraints** for valid time ranges and days
✅ **Indexes** for optimized queries
✅ **Sample Data** ready to use

---

## Sample Data Included

### Professors (10 total)
- Victor Wembanyama (Spurs)
- Stephon Castle (Spurs)
- Harrison Barnes (Spurs)
- Devin Vassell (Spurs)
- De'Aaron Fox (Kings)
- Domantas Sabonis (Kings)
- Kevin Huerter (Kings)
- Keegan Murray (Kings)
- LEBRON JAMES (Lakers)
- Tristan Thompson (Cavaliers)

### Courses (10 subjects)
- Data Structures
- Linear Algebra
- Ethics
- Programming
- Calculus
- Physics
- Chemistry
- Statistics
- Philosophy
- Purposive Communication

### Rooms
- **AC Rooms**: 322, 323, 324
- **Non-AC Rooms**: 101, 141, 212, 305

---

## After Setup

### 1. Restart Backend
```bash
cd ga-backend
python3 main.py
```

### 2. Test the API
```bash
# Check professors
curl http://localhost:8000/api/data/professors

# Check timetable
curl http://localhost:8000/api/timetable

# Generate a schedule
curl -X POST http://localhost:8000/api/generate-schedule
```

### 3. Open Frontend
- Navigate to http://localhost:3000
- Main page shows live timetable (AC rooms only)
- Admin page at http://localhost:3000/admin

---

## Troubleshooting

### Error: "relation does not exist"
- Run the schema.sql again
- Make sure all DROP TABLE statements executed

### Error: "duplicate key value"
- The schema includes sample data with specific IDs
- Drop all tables first, then run the full schema

### No data showing in frontend
- Check backend is running: http://localhost:8000
- Verify professors exist: `SELECT * FROM professors;`
- Check timetable: `SELECT * FROM timetable_slots;`

---

## Maintenance Commands

### Clear Generated Schedules
```sql
DELETE FROM generated_schedules;
-- CASCADE will also delete generated_schedule_slots
```

### Clear Timetable (Keep Professors)
```sql
DELETE FROM timetable_slots;
```

### Reset Everything
```bash
# Run the full schema.sql again
# This drops and recreates all tables
```

---

## Schema Changes

If you need to modify the schema:

1. Update `schema.sql`
2. Run the updated SQL in Supabase
3. Restart the backend
4. Test the changes

---

Last Updated: December 15, 2025
