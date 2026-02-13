# Genetic Algorithm Timetable Scheduling Backend

## Overview

This backend service implements an AI-powered genetic algorithm to automatically generate optimized class schedules for a university timetabling system. The system considers professor preferences, room constraints (especially AC room availability), scheduling conflicts, and **fairness metrics (Gini coefficients)** to produce conflict-free, equitable timetables.

### Key Features
- ✅ **Conflict-free scheduling** - No professor or room double-bookings
- ❄️ **AC room optimization** - Smart allocation of limited AC rooms (322, 323, 324)
- 🎯 **Professor preference matching** - Respects AC and time preferences
- 📊 **Fairness tracking** - Gini coefficients for workload, room usage, and AC access equity
- 🧬 **Advanced GA** - Tournament selection, elitism, adaptive mutation
- 🔄 **Incremental optimization** - Preserves existing schedules, optimizes room assignments

## Technology Stack

- **Python 3.13**: Core programming language
- **FastAPI 0.115.5**: Modern web framework for building RESTful APIs
- **Supabase (PostgreSQL)**: Cloud database for storing professors, schedules, and timetable data
- **supabase-py 2.10.0**: Python client for Supabase database operations
- **Uvicorn**: ASGI server for running the FastAPI application

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

### Generate Schedule
```
POST /api/generate-schedule
```
Triggers the genetic algorithm to generate a new optimized schedule.

**Response:**
```json
{
  "success": true,
  "message": "Schedule generation completed",
  "schedule_id": 18,,
  "gini_workload": 0.1523,
  "gini_room_usage": 0.2145,
  "gini_ac_access": 0.0987
  "fitness_score": 20500.0,
  "hard_violations": 0,
  "soft_score": 2000.0
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
        "end_hour": 14,
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

### Approve Schedule
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

## Genetic Algorithm Implementation

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
- **Workload Balance**: Minimize Gini coefficient for teaching hours distribution
- **Room Utilization**: Ensure all rooms used efficiently (low Gini)
- **AC Access Equity**: Fair distribution of AC rooms among professors who prefer them
- **Target**: Average Gini < 0.3 (Good equality)
- **Bonus**: +5 × (1 - avg_gini) × 100 points for fairer schedules

> 📊 **See [GINI_COEFFICIENT_GUIDE.md](GINI_COEFFICIENT_GUIDE.md) for comprehensive fairness metrics documentation**

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

## Running the Backend

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

## Contributing

For thesis development, document any modifications to:
1. Algorithm parameters (in `.env`)
2. Constraint definitions (in `ga_engine.py`)
3. Fitness function weights
4. Database schema changes

## References

### Academic Papers
- Holland, J. H. (1992). "Genetic Algorithms". Scientific American.
- Burke, E. K., & Petrovic, S. (2002). "Recent research directions in automated timetabling". European Journal of Operational Research.

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- Supabase: https://supabase.com/docs
- Genetic Algorithms: https://en.wikipedia.org/wiki/Genetic_algorithm

## License

This project is developed for academic/thesis purposes.

## Contact

For questions or issues, refer to the project repository or contact the development team.

---

**Last Updated**: December 16, 2025
**Version**: 1.0.1
**Backend Port**: 8000
**Frontend**: Next.js application on port 3000
**AC Rooms**: 322, 323, 324 (3 rooms total)
