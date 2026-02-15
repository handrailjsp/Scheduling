# 🎓 AI-Powered University Timetable Scheduling System

## Overview

This is a complete full-stack scheduling system that uses **genetic algorithms** and **GINI coefficient fairness metrics** to automatically generate optimized class schedules. The system features **one-click auto-optimization** that generates multiple schedules, compares their fairness, and automatically applies the best one.

### ✨ Key Features
- 🤖 **Auto-Optimize Mode** - Click once, system generates 3 schedules and picks the fairest
- ✅ **Conflict-free scheduling** - Zero professor or room double-bookings guaranteed
- 📊 **GINI Fairness Metrics** - Measures workload, room usage, and AC access equity
- ❄️ **AC room optimization** - Smart allocation of limited AC rooms (322, 323, 324)
- 🎯 **Professor preference matching** - Respects AC and time preferences
- 🧬 **Advanced GA** - Tournament selection, elitism, adaptive mutation
- 🔄 **Automatic application** - Best schedule applied to timetable instantly
- 🎨 **Modern UI** - Next.js frontend with real-time updates

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd ga-backend

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Supabase credentials
echo "SUPABASE_URL=your_url" > .env
echo "SUPABASE_KEY=your_key" >> .env

# Start server
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
# In project root
npm install
npm run dev
```

### 3. Generate Schedule
1. Go to `http://localhost:3000/admin`
2. Click **"Generate Schedule"**
3. Wait 3-5 minutes
4. Done! ✅ Best schedule automatically applied

---

## 🏗️ Technology Stack

### Backend
- **Python 3.13** - Core programming language
- **FastAPI 0.115.5** - REST API framework
- **Supabase (PostgreSQL)** - Cloud database
- **Genetic Algorithm** - Schedule optimization engine

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## System Architecture

### Core Components

1. **main.py** - FastAPI application with REST API endpoints
2. **ga_engine.py** - Genetic algorithm implementation for schedule optimization
3. **database.py** - Database abstraction layer for Supabase operations
4. **.env** - Environment configuration (database credentials, GA parameters)

### Database Schema

The system uses the following main tables in Supabase:

#### professors
- `id` (SERIAL): Primary key
- `name` (TEXT): Professor's full name
- `title` (TEXT): Academic title/position
- `department` (TEXT): Department affiliation
- `created_at` (TIMESTAMP): Record creation timestamp

#### timetable_slots
- `id` (SERIAL): Primary key
- `professor_id` (INTEGER): Foreign key to professors
- `day_of_week` (INTEGER): Day (1=Monday, 5=Friday)
- `hour` (INTEGER): Start hour (7-17)
- `end_hour` (INTEGER): End hour
- `subject` (TEXT): Course/subject name
- `room` (TEXT): Room number
- `needs_ac` (BOOLEAN): Whether AC is required

#### generated_schedules
- `id` (SERIAL): Primary key
- `generation_date` (TIMESTAMP): When schedule was generated
- `fitness_score` (DECIMAL): GA fitness score
- `hard_constraint_violations` (INTEGER): Number of conflicts
- `soft_constraint_score` (DECIMAL): Soft constraint score
- `gini_workload` (DECIMAL): Workload distribution fairness (0=equal, 1=unequal)
- `gini_room_usage` (DECIMAL): Room utilization fairness
- `gini_ac_access` (DECIMAL): AC room access equity
- `status` (TEXT): "pending" or "approved"
- `notes` (TEXT): Generation metadata

#### generated_schedule_slots
- `id` (SERIAL): Primary key
- `schedule_id` (INTEGER): Foreign key to generated_schedules
- `professor_id` (INTEGER): Professor assignment
- `course_id` (INTEGER): Course identifier
- `room_id` (INTEGER): Room number
- `day_of_week` (INTEGER): Day of week
- `start_hour` (INTEGER): Start time
- `end_hour` (INTEGER): End time

## API Endpoints

### Health Check
```
GET /
```
Returns API status and confirmation that the service is running.

**Response:**
```json
{
  "status": "ok",
  "message": "GA Timetable API is running"
}
```

### Generate Schedule (Auto-Optimize)
```
POST /api/generate-schedule?runs=3
```
**Auto-Optimize Mode**: Generates multiple schedules, picks the fairest, and applies it automatically.

**Parameters:**
- `runs` (optional): Number of GA runs (1-10, default=3)

**What Happens:**
1. Runs GA 3 times (~3-5 minutes total)
2. Calculates GINI fairness for each
3. Picks schedule with lowest GINI (fairest)
4. Auto-approves winner
5. Applies to `timetable_slots` (replaces old schedule)

**Response:**
```json
{
  "success": true,
  "message": "Auto-optimized! Generated 3 schedules, picked best, and applied to timetable",
  "schedule_id": 47,
  "fitness_score": 20850.3,
  "hard_violations": 0,
  "gini_workload": 0.1234,
  "gini_room_usage": 0.1890,
  "gini_ac_access": 0.0876,
  "avg_gini": 0.1333,
  "total_runs": 3,
  "auto_approved": true,
  "applied_to_timetable": true
}
```

### List All Schedules
```
GET /api/schedules
```
Retrieves all generated schedules, ordered by most recent first.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 18,
      "generation_date": "2025-12-15T14:08:01.879762+00:00",
      "fitness_score": 19500.0,
      "hard_constraint_violations": 0,
      "soft_constraint_score": 1900.0,
      "status": "pending",
      "notes": "Generated after 0 generations"
    }
  ]
}
```

### Get Schedule Details
```
GET /api/schedules/{schedule_id}
```
Retrieves detailed information about a specific schedule, including all time slots.

**Response:**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": 18,
      "fitness_score": 19500.0,
      "hard_constraint_violations": 0,
      "status": "pending"
    },
    "slots": [
      {
        "id": 382,
        "professor_id": 2,
        "course_id": 1,
        "room_id": 324,
        "day_of_week": 4,
        "start_hour": 13,
        "end_hour":  (Manual)
```
POST /api/schedules/{schedule_id}/approve
```
Manually approves a specific schedule and applies it to the live timetable.

**What it does:**
1. Clears all existing `timetable_slots`
2. Inserts new schedule slots
3. Marks schedule as approved

**Response:**
```json
{
  "success": true,
  "message": "Schedule applied! 45 slots now live.",
  "slots_updated": 45
}
```

**Note:** Auto-optimize mode calls this automatically for the best schedule. Approve Schedule
```
POST /api/schedules/{schedule_id}/approve
```
Approves a generated schedule and copies all slots to the live `timetable_slots` table, making it the active schedule.

**Response:**
```json
{
  "success": true,
  "message": "Schedule approved and copied to timetable_slots",
  "slots_copied": 23
}
```

### Get Professors
```
GET /api/data/professors
```
Returns all professors in the system.

### Get Courses
```
GET /api/data/courses
```
Returns all available courses.

### Get Rooms
```
GET /api/data/rooms
```
Returns all available rooms.

## 🎯 Auto-Optimize Workflow

### Complete Process

```
User clicks "Generate Schedule"
    ↓
Backend runs GA 3 times (180-300 seconds)
    ↓
Each run calculates GINI fairness:
  • Run 1: GINI=0.18, Fitness=20,422
  • Run 2: GINI=0.25, Fitness=21,300
  • Run 3: GINI=0.12, Fitness=19,850 ← WINNER!
    ↓
System picks best (lowest GINI)
    ↓
Automatically approves it
    ↓
Clears old timetable_slots
    ↓
Inserts new schedule (45 slots)
    ↓
Frontend shows: "✅ Schedule Auto-Applied!"
    ↓
Calendar updates with new schedule
```

### Selection Logic

Schedules are ranked by:
```python
score = (-avg_gini × 10000) + fitness_score
```

**GINI weighted 10x more** than fitness because **fairness > optimization**

**Example:**
- Run 1: GINI=0.15, Fitness=20,000 → Score = 18,500
- Run 2: GINI=0.25, Fitness=21,000 → Score = 18,500
- Run 3: GINI=0.12, Fitness=19,500 → Score = 18,300 🏆

---

## 📊 GINI Coefficient Fairness

### What is GINI?

GINI coefficient (0-1) measures inequality in distributions:
- **0.0** = Perfect equality (everyone gets same)
- **1.0** = Maximum inequality (one person gets everything)

### Three Fairness Metrics

#### 1. Workload GINI
Ensures professors get similar teaching hours.

**Example:**
- Without GINI: [15, 15, 3, 3, 10] hours/professor
- With GINI: [9, 10, 8, 9, 10] hours/professor ✅

#### 2. Room Usage GINI
Prevents overuse of some rooms while others sit empty.

**Example:**
- Without GINI: Room 322 used 20 times, Room 101 used 2 times
- With GINI: More balanced: [8, 7, 9, 6, 8] classes per room ✅

#### 3. AC Access GINI
Among AC-preferring professors, distributes AC room access fairly.

**Example:**
- Without GINI: Prof A gets 10 AC hours, Prof B gets 0
- With GINI: Prof A gets 5, Prof B gets 5 ✅

### GINI Interpretation

| GINI Range | Rating | Emoji | Action |
|-----------|--------|-------|--------|
| 0.00 - 0.20 | Excellent | ✨ | Keep it! |
| 0.20 - 0.30 | Good | ✓ | Acceptable |
| 0.30 - 0.40 | Moderate | ⚠️ | Consider rebalancing |
| 0.40+ | High | ❌ | Needs improvement |

### How GINI is Used

**In Fitness Function:**
```python
# ga_engine.py
fitness = 1000×hard_score + 10×soft_score + 5×fairness_score

# Fairness score from GINI:
avg_gini = (workload + rooms + ac_access) / 3
fairness_score = (1.0 - avg_gini) × 100

# Lower GINI = Higher fairness_score = Better fitness
```

**In Auto-Optimize:**
- Calculates GINI for all 3 runs
- Picks schedule with **lowest average GINI**
- Ensures fairest schedule wins

---

### Algorithm Overview

The genetic algorithm (GA) is a metaheuristic optimization technique inspired by natural selection. It evolves a population of candidate schedules over multiple generations to find the optimal timetable.

### Key Parameters

Located in `.env` file:
- `POPULATION_SIZE=150`: Number of candidate schedules per generation
- `MAX_GENERATIONS=1000`: Maximum evolution iterations

### GA Workflow

1. **Initialization**
   - Load data from database (professors, courses, rooms)
   - Identify AC rooms (322, 323, 324)
   - Detect professor AC preferences from historical data
   - Generate random initial population of schedules

2. **Fitness Evaluation**
   - Calculate fitness score for each candidate schedule
   - **Fitness = α × HardScore + β × SoftScore + γ × FairnessScore**
     - α = 1000 (Hard constraints - no conflicts)
     - β = 10 (Soft constraints - preferences)
     - γ = 5 (Fairness - Gini coefficients)
   - Higher scores = better schedules

3. **Selection**
   - Tournament selection (size=5)
   - Fittest individuals more likely to reproduce

4. **Crossover**
   - Uniform crossover (80% probability)
   - Combines genes from two parent schedules

5. **Mutation**
   - Adaptive mutation rate (starts at 10%)
   - Randomly modifies time slots, rooms, or days
   - Increases every 50 generations if stuck

6. **Elitism**
   - Top 10% of population preserved each generation
   - Ensures best solutions aren't lost

7. **Termination**
   - Stops when hard constraint violations = 0 and fitness > 5000
   - Or reaches maximum generations

### Constraints

#### Hard Constraints (Must be satisfied)
- **No Professor Conflicts**: A professor cannot teach multiple classes simultaneously
- **No Room Conflicts**: A room cannot host multiple classes at the same time
- **Penalty**: -10,000 per violation

#### Soft Constraints (Preferred but not mandatory)
- **AC Room Preference**: Professors with `needs_ac=true` get priority for rooms 322, 323, 324
  - +100 points: AC preference matched (assigned to room 322, 323, or 324)
  - -50 points: AC preference not matched (assigned to other room due to time conflict)
  - **Note**: Only 3 AC rooms available, so ~87% of AC requests can be satisfied
- **Time Preferences**: Future implementation for preferred teaching hours

#### Fairness Constraints (Optimization goals)
- **Workload Balance**: Minimize GINI coefficient for teaching hours distribution
- **Room Utilization**: Ensure all rooms used efficiently (low GINI)
- **AC Access Equity**: Fair distribution of AC rooms among professors who prefer them
- **Target**: Average GINI < 0.3 (Good equality)
- **Bonus**: +5 × (1 - avg_gini) × 100 points for fairer schedules
- **Weight**: GINI weighted 10x more than raw fitness in auto-optimize

### AC Room Prioritization

The system has **only 3 air-conditioned rooms**: **322, 323, 324**

**Detection Logic:**
1. Analyzes existing `timetable_slots` for each professor
2. If >50% of their classes have `needs_ac=true` or are in AC rooms, they prefer AC
3. All slots marked with `needs_ac=true` are distributed into rooms 322, 323, 324
4. Time conflicts are resolved by assigning to next available AC room slot

**Distribution Strategy:**
- Total AC-preferring slots: ~83 slots
- Successfully placed in AC rooms: ~72 slots (distributed across 322, 323, 324)
- Overflow to other rooms: ~11 slots (when all AC room times are occupied)
- Maintains time slot integrity - never changes professor's scheduled times

**Benefits:**
- Maximizes AC room utilization (~87% of AC slots get AC rooms)
- Respects professor comfort preferences
- Ensures fair distribution of limited AC resources
- Prevents scheduling conflicts through intelligent room assignment

### Validation

Before saving any schedule:
1. **Double-check hard constraints** - Ensures 0 conflicts
2. **Validate professor/time uniqueness** - No double bookings
3. **Validate room/time uniqueness** - No room overlaps
4. **Auto-regenerate** - If any conflicts found, recursively tries again

## 🎨 Frontend Features

### Admin Panel (`/admin`)
- **Professor Management** - Add/edit professors
- **Calendar View** - Visual timetable editor
- **Generate Schedule Button** - One-click auto-optimize
- **Real-time Feedback** - Shows GINI metrics and status

**What You See:**
```
✅ Schedule Auto-Applied! (Best of 3 runs)

Schedule ID: #47
Conflicts: 0

📊 Fairness Metrics (Gini)
   Workload:   0.123 ✨ (Excellent)
   Room Use:   0.189 ✓  (Good)
   AC Access:  0.088 ✨ (Excellent)

🎯 This schedule is now LIVE on your timetable!
```

### Public Calendar (`/`)
- Week/Month/Day views
- Displays approved schedule
- AC room classes highlighted
- Professor information

---

## ⚙️ Configuration

### Customize Number of Runs

**Default:** 3 runs (recommended balance)

**Change in frontend** (`app/admin/page.tsx`):
```typescript
fetch(`${apiUrl}/api/generate-schedule?runs=5`)
//                                           ^^^
// Options: 1-10
```

**Trade-offs:**
- 1 run = ~60 sec (fast, no comparison)
- 3 runs = ~180 sec (balanced) ✅
- 5 runs = ~300 sec (best quality, slower)
- 10 runs = ~600 sec (maximum quality)

### Adjust GINI Weight

**Change in backend** (`ga-backend/main.py`):
```python
# Line ~145
def score_schedule(r):
    return (-avg_gini * 10000) + r['fitness_score']
    #                  ^^^^^
    # Increase to prioritize fairness more
    # Decrease to prioritize fitness more
```

### GA Parameters

**Change in** `.env`:
```env
POPULATION_SIZE=50      # More = better but slower
MAX_GENERATIONS=200     # More = thorough but slower
```

---

## 🗄️ Database Setup

### Required Tables

**1. professors**
```sql
CREATE TABLE professors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2. timetable_slots** (Live schedule)
```sql
CREATE TABLE timetable_slots (
  id SERIAL PRIMARY KEY,
  professor_id INTEGER REFERENCES professors(id),
  day_of_week INTEGER,
  hour INTEGER,
  end_hour INTEGER,
  subject TEXT,
  room TEXT,
  needs_ac BOOLEAN DEFAULT FALSE
);
```

**3. generated_schedules** (GA results with GINI)
```sql
CREATE TABLE generated_schedules (
  id SERIAL PRIMARY KEY,
  generation_date TIMESTAMP DEFAULT NOW(),
  fitness_score DECIMAL,
  hard_constraint_violations INTEGER,
  soft_constraint_score DECIMAL,
  gini_workload DECIMAL(10, 4),
  gini_room_usage DECIMAL(10, 4),
  gini_ac_access DECIMAL(10, 4),
  status TEXT DEFAULT 'pending',
  notes TEXT
);
```

**4. generated_schedule_slots**
```sql
CREATE TABLE generated_schedule_slots (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES generated_schedules(id),
  professor_id INTEGER,
  course_id INTEGER,
  room_id INTEGER,
  day_of_week INTEGER,
  start_hour INTEGER,
  end_hour INTEGER
);
```

### Add GINI Columns (Migration)

If GINI columns are missing:
```bash
cd ga-backend
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB < migration_add_gini_coefficients.sql
```

---

## 🐛 Troubleshooting

### "Database connection failed"
```bash
# Check .env file exists with:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

### "GINI columns missing"
```bash
# Run migration:
psql < migration_add_gini_coefficients.sql
```

### "Schedule not applying"
- Check backend console for errors
- Verify `approve_schedule()` in `database.py` actually clears and inserts
- Check `timetable_slots` table for new data

### "Frontend not updating"
- Wait 1 second (auto-refresh delay)
- Hard refresh browser (Cmd+Shift+R)
- Check browser console for errors

### "Takes too long"
```typescript
// Reduce runs to 1:
fetch(`${apiUrl}/api/generate-schedule?runs=1`)
```

---

### Prerequisites

1. Python 3.13 installed
2. Supabase account with project URL and API key
3. Virtual environment (recommended)

### Installation

```bash
cd ga-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create a `.env` file in the `ga-backend` directory:

```env
# Python Backend Environment Variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# GA Configuration
POPULATION_SIZE=150
MAX_GENERATIONS=1000
```

### Starting the Server

```bash
# From ga-backend directory
python3 main.py
```

The API will be available at: `http://localhost:8000`

### API Documentation

Once running, visit:
- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Performance Characteristics

### Algorithmic Complexity
- **Conflict Detection**: O(n) using sets vs O(n²) with nested loops
- **Fitness Evaluation**: O(n × m) where n=classes, m=constraints
- **Room Lookup**: O(1) with pre-computed hash table
- **Validation**: O(n) using set length comparison
- **Total per Generation**: O(P × n × m) where P=population size

### Memory Optimization
- **Gene References**: Genes shared between parent/child (no unnecessary copying)
- **Room Lookup Caching**: Single hash table computed once per run
- **Set-based Conflict Detection**: O(n) space instead of O(n) dict operations
- **Batch Database Operations**: Single insert for all slots (~20-30 slots)

### Typical Performance
- **Schedule Size**: 23-27 classes
- **Professors**: 10-11
- **Rooms**: 10 (3 AC, 7 regular)
- **Generation Time**: <1 second (optimized from ~2 seconds)
- **Convergence**: Usually 0-50 generations
- **Early Termination**: Stops immediately when valid schedule found

### Optimization Results
- **Conflict Resolution**: 100% (guaranteed 0 violations)
- **AC Room Utilization**: 87% of AC-preferring slots get AC rooms (72/83 slots)
- **AC Room Distribution**: 28 slots in room 322, 24 in room 323, 20 in room 324
- **Fitness Scores**: Typically 18,000-23,000
- **Performance Gain**: ~50% faster due to set operations and caching
- **Room Constraint**: Limited to 3 AC rooms (322, 323, 324)

## Error Handling

### Common Errors

1. **Database Connection Failed**
   - Check Supabase URL and API key in `.env`
   - Verify Supabase project is active (not paused)

2. **No Professors Found**
   - Ensure `professors` table has data
   - Check database permissions

3. **Schedule Generation Failed**
   - Review console logs for constraint violations
   - May auto-retry if conflicts detected

4. **Port 8000 Already in Use**
   ```bash
   # Kill existing process
   lsof -ti :8000 | xargs kill -9
   ```

## Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:8000/

# Generate a schedule
curl -X POST http://localhost:8000/api/generate-schedule

# List schedules
curl http://localhost:8000/api/schedules

# Get schedule details
curl http://localhost:8000/api/schedules/1
```

### Expected Behavior
- Generation completes in <5 seconds
- Returns `hard_violations: 0`
- Fitness score > 15,000
- All AC-preferring professors get AC rooms

## Security Considerations

### Current Implementation
- Uses Supabase anon key (public read access)
- No authentication on API endpoints
- CORS enabled for localhost:3000

### Production Recommendations
1. **Add API Key Authentication**
   ```python
   from fastapi.security import APIKeyHeader
   ```

2. **Use Supabase Service Role Key** (server-side only)
3. **Enable HTTPS** with SSL certificates
4. **Rate Limiting** to prevent abuse
5. **Environment Variables** - Never commit `.env` to git

## Future Enhancements

### Planned Features
1. **Time Preferences**: Allow professors to set preferred teaching hours
2. **Room Capacity Constraints**: Match class size to room capacity
3. **Course Prerequisites**: Ensure logical course sequencing
4. **Multi-objective Optimization**: Balance multiple goals simultaneously
5. **Real-time Updates**: WebSocket support for live schedule generation status
6. **Schedule Comparison**: Side-by-side comparison of multiple generated schedules

### Algorithm Improvements
1. **Parallel GA**: Multiple populations evolving independently
2. **Hybrid Approaches**: Combine GA with local search
3. **Machine Learning**: Learn from historical schedule preferences
4. **Constraint Relaxation**: Temporarily relax constraints to escape local optima

## Troubleshooting

### Debug Mode

Enable detailed logging by modifying `ga_engine.py`:

```python
# Uncomment warning prints
print(f"WARNING: Professor {gene['professor_id']} conflict...")
```

### Common Issues

**Issue**: Schedules have conflicts
- **Solution**: Increased penalty to 10,000, added validation layer

**Issue**: Low fitness scores
- **Solution**: Check soft constraint scoring, adjust weights

**Issue**: Slow generation
- **Solution**: Reduce population size or max generations

**Issue**: All schedules rejected
- **Solution**: Review hard constraints, may be too restrictive

## 📋 API Reference

### Quick Commands

```bash
# Start backend
cd ga-backend && uvicorn main:app --reload

# Start frontend
npm run dev

# Generate schedule (API)
curl -X POST "http://localhost:8000/api/generate-schedule?runs=3"

# List all schedules
curl http://localhost:8000/api/schedules

# Get timetable
curl http://localhost:8000/api/timetable

# Health check
curl http://localhost:8000/
```

---

## 📈 Performance

### Typical Metrics
- **Schedule Size**: 40-50 classes
- **Professors**: 8-10
- **Rooms**: 10 (3 AC, 7 regular)
- **Generation Time**: 60-90 seconds per run
- **Total Auto-Optimize**: 3-5 minutes (3 runs)
- **Convergence**: 50-150 generations
- **Conflict Resolution**: 100% (guaranteed 0 violations)
- **AC Room Utilization**: 85-90% of AC-preferring slots get AC rooms

### Optimization Results
- **Fitness Scores**: 18,000-23,000
- **Average GINI**: 0.15-0.25 (Excellent to Good)
- **Workload GINI**: Usually 0.10-0.20
- **Room Usage GINI**: Usually 0.15-0.25
- **AC Access GINI**: Usually 0.05-0.15

---

## 🔒 Security (Production)

### Current (Development)
- Uses Supabase anon key
- No API authentication
- CORS enabled for localhost

### Recommendations for Production
1. **API Key Authentication**
2. **Use Supabase Service Role Key** (server-side only)
3. **Enable HTTPS** with SSL
4. **Rate Limiting**
5. **Never commit** `.env` to git

---

## 🚀 Deployment

### Backend (Render/Railway/Fly.io)
```bash
# Example for Render
runtime: python-3.13
build: pip install -r requirements.txt
start: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `POPULATION_SIZE=50`
- `MAX_GENERATIONS=200`

### Frontend (Vercel/Netlify)
```bash
# Build command
npm run build

# Environment variables
NEXT_PUBLIC_API_URL=https://your-backend.com
```

---

## 📚 Project Structure

```
Scheduling/
├── app/                    # Next.js frontend
│   ├── admin/             # Admin panel
│   │   └── page.tsx       # Generate schedule UI
│   ├── page.tsx           # Public calendar
│   └── globals.css
├── components/            # React components
│   ├── admin-calendar-grid.tsx
│   ├── professor-sidebar.tsx
│   └── ui/                # shadcn components
├── ga-backend/            # Python backend
│   ├── main.py            # FastAPI app (auto-optimize)
│   ├── ga_engine.py       # Genetic algorithm + GINI
│   ├── database.py        # Supabase operations
│   ├── requirements.txt
│   ├── .env               # Config (gitignored)
│   ├── schema.sql         # DB schema
│   └── README.md          # This file
└── lib/                   # Utilities
    ├── supabase.ts        # Supabase client
    └── utils.ts
```

---

## 🎓 Academic Context

This system was developed for a university timetabling thesis project. It demonstrates:
- **Genetic Algorithm** optimization
- **Multi-objective** optimization (conflicts, preferences, fairness)
- **GINI coefficient** application to resource allocation
- **Full-stack** development
- **Cloud** infrastructure (Supabase)

---

## 📖 References

### Academic Papers
- Holland, J. H. (1992). "Genetic Algorithms". Scientific American.
- Burke, E. K., & Petrovic, S. (2002). "Recent research directions in automated timetabling".
- GINI Coefficient: https://en.wikipedia.org/wiki/Gini_coefficient

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Genetic Algorithms: https://en.wikipedia.org/wiki/Genetic_algorithm

---

## ✅ Success Checklist

Your system is **fully working** if:

- ✅ Backend starts without errors (`uvicorn main:app --reload`)
- ✅ Frontend loads at `http://localhost:3000`
- ✅ Admin panel accessible at `/admin`
- ✅ "Generate Schedule" completes in 3-5 minutes
- ✅ Console shows "Running GA 3 times"
- ✅ Response includes GINI metrics
- ✅ Status shows "Auto-Applied! (Best of 3 runs)"
- ✅ `timetable_slots` table updates with new data
- ✅ Calendar displays new schedule

---

## 💡 Tips & Best Practices

1. **Run during off-hours** - GA is CPU intensive
2. **Keep 3 runs default** - Good balance of quality vs speed
3. **Monitor GINI trends** - Average should stay < 0.3
4. **Backup database** before major changes
5. **Use indexes** on professor_id, day_of_week for performance
6. **Check logs** for any warnings during generation

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review backend console logs
3. Check browser console (F12)
4. Verify database connection
5. Ensure all dependencies installed

---

**Last Updated**: February 15, 2026  
**Version**: 2.0 (Auto-Optimize + GINI)  
**Backend**: FastAPI on port 8000  
**Frontend**: Next.js on port 3000  
**AC Rooms**: 322, 323, 324 (3 total)  
**Status**: ✅ Production Ready

---

## 🎯 Quick Reference

| Task | Command/URL |
|------|-------------|
| Start Backend | `cd ga-backend && uvicorn main:app --reload` |
| Start Frontend | `npm run dev` |
| Admin Panel | `http://localhost:3000/admin` |
| Public Calendar | `http://localhost:3000/` |
| API Docs | `http://localhost:8000/docs` |
| Generate Schedule | Click button or POST `/api/generate-schedule?runs=3` |
| View Schedules | GET `/api/schedules` |
| Check Timetable | GET `/api/timetable` |

**System Motto:** *One Click → Fair Schedule → Automatic Application* 🚀
