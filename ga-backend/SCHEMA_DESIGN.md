# Database Star Schema Design

## Overview
The system uses a **star schema** pattern where `generated_schedule_slots` is the **fact table** and dimension tables include `professors`, `generated_schedules`, and course data extracted from `timetable_slots`.

---

## Schema Structure

### Fact Table: `generated_schedule_slots`
The central table storing all schedule assignments.

```sql
generated_schedule_slots
├── id (PK)
├── schedule_id (FK → generated_schedules)
├── professor_id (FK → professors)
├── course_id (Integer - maps to course index)
├── room_id (Integer - room number)
├── day_of_week (Integer: 1=Monday, 5=Friday)
├── start_hour (Integer: 7-17)
├── end_hour (Integer: 8-18)
├── section_id (Nullable)
└── created_at (Timestamp)
```

### Dimension Tables

#### 1. `generated_schedules`
Metadata about each generated schedule.

```sql
generated_schedules
├── id (PK)
├── fitness_score (Decimal)
├── hard_constraint_violations (Integer)
├── soft_constraint_score (Decimal)
├── status (Text: "pending" | "approved" | "rejected")
├── generation_date (Timestamp)
└── notes (Text)
```

#### 2. `professors`
Professor information.

```sql
professors
├── id (PK)
├── name (Text)
├── title (Text)
├── department (Text)
└── created_at (Timestamp)
```

#### 3. `timetable_slots` (Live Schedule)
The active schedule - also serves as source for course/subject names.

```sql
timetable_slots
├── id (PK)
├── professor_id (FK → professors)
├── subject (Text - course name)
├── room (Text)
├── day_of_week (Integer)
├── hour (Integer)
├── end_hour (Integer)
└── needs_ac (Boolean)
```

---

## Data Flow

### 1. Schedule Generation (GA Engine)
```
load_data_from_database()
  ↓
Extract subjects from timetable_slots
  ↓
Map to course_id (1, 2, 3...)
  ↓
Generate schedule assignments
  ↓
Save to generated_schedule_slots (without subject field)
```

### 2. Schedule Retrieval (API)
```
GET /api/schedules/{id}
  ↓
Fetch generated_schedule_slots (with professor join)
  ↓
Fetch timetable_slots for subject mapping
  ↓
Match course_id → subject name
  ↓
Return slots with subject field added dynamically
```

### 3. Schedule Approval
```
POST /api/schedules/{id}/approve
  ↓
Copy generated_schedule_slots → timetable_slots
  ↓
Transform: course_id → subject name
  ↓
Update generated_schedules.status = "approved"
```

---

## Course/Subject Mapping Logic

Since courses are extracted from existing timetable data, the mapping is handled dynamically:

```python
# In ga_engine.py
courses = [
    {"id": 1, "code": "Data Structures", "name": "Data Structures"},
    {"id": 2, "code": "Ethics", "name": "Ethics"},
    ...
]

# In database.py get_schedule_details()
# Match professor_id + course_id to find subject from timetable_slots
for slot in slots:
    prof_subjects = [ts["subject"] for ts in timetable_slots 
                     if ts["professor_id"] == slot["professor_id"]]
    slot["subject"] = prof_subjects[course_id - 1]  # Map by index
```

---

## Query Patterns

### Generate New Schedule
```python
POST /api/generate-schedule
→ GA extracts 10 unique subjects from timetable_slots
→ Assigns each professor 2-3 classes
→ Runs genetic algorithm
→ Saves slots with course_id (no subject field in DB)
```

### Fetch Schedule with Subject Names
```python
GET /api/schedules/24
→ SELECT * FROM generated_schedule_slots WHERE schedule_id=24
→ JOIN with professors table
→ Fetch timetable_slots for subject mapping
→ Dynamically add subject field to response
```

### Display on Frontend
```typescript
// app/page.tsx
events = slots.map(slot => ({
  title: slot.professors.name,
  description: `${slot.subject} - Room ${slot.room_id}`,
  startTime: calculateTime(slot.day_of_week, slot.start_hour),
  endTime: calculateTime(slot.day_of_week, slot.end_hour)
}))
```

---

## AC Room Constraint Logic

**AC Rooms**: 322, 323, 324 (hardcoded - only 3 AC rooms available)

```python
# Detect AC preference from existing timetable
for prof in professors:
    prof_slots = [s for s in existing_slots if s.professor_id == prof.id]
    ac_count = sum(1 for s in prof_slots if s.needs_ac or s.room in ['322', '323', '324'])
    professors_prefer_ac[prof.id] = ac_count > len(prof_slots) / 2

# During schedule generation - intelligent room assignment
# All slots with needs_ac=true are distributed into rooms 322, 323, 324
# Conflicts are resolved by finding available time slots in AC rooms
```

**Distribution Strategy**:
- All `needs_ac=true` slots are assigned to rooms 322, 323, or 324
- If time conflicts occur, slots are assigned to next available room
- Typical distribution: ~72 AC slots fit perfectly in 3 AC rooms
- Remaining AC slots (~11) overflow to other rooms when no AC room time is available

**Fitness Function**:
- AC match: +100 points
- AC mismatch: -50 points

---

## Current System Status

✅ **Working**: Schedule generation with 0 conflicts  
✅ **Working**: Subject names displayed on frontend  
✅ **Working**: AC room distribution (rooms 322, 323, 324)  
✅ **Working**: Professor/room conflict detection  
✅ **Working**: Star schema with dynamic subject mapping  
✅ **Working**: Intelligent AC slot distribution with time-based conflict resolution

**Schema Files**:
- `generated_schedule_slots` - Fact table (no subject column)
- `generated_schedules` - Dimension table
- `professors` - Dimension table
- `timetable_slots` - Source for subject names + live schedule (includes needs_ac field)

**AC Room Configuration**:
- Total AC slots: 83 (needs_ac=true)
- AC rooms available: 3 (rooms 322, 323, 324)
- Successfully distributed: ~72 slots in AC rooms
- Overflow slots: ~11 slots in other rooms (due to time conflicts)

**Note**: The `subject` field is **not stored** in `generated_schedule_slots`. It's added dynamically during API queries by mapping `course_id` to subjects from `timetable_slots`.

---

## API Response Example

```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 24,
      "fitness_score": 21500.0,
      "hard_constraint_violations": 0,
      "status": "pending"
    },
    "slots": [
      {
        "id": 571,
        "schedule_id": 24,
        "professor_id": 2,
        "course_id": 1,
        "room_id": 323,
        "day_of_week": 2,
        "start_hour": 7,
        "end_hour": 8,
        "subject": "Data Structures",  // Added dynamically
        "professors": {
          "id": 2,
          "name": "Victor Wembanyama",
          "title": "Center",
          "department": "Spurs"
        }
      }
    ]
  }
}
```

---

Last Updated: December 16, 2025  
Working System: Frontend (localhost:3000) + Backend (localhost:8000)  
AC Rooms: 322, 323, 324 (only 3 AC rooms available)
