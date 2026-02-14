# GINI Coefficient Usage Guide

## 📊 What You Have Now

Three powerful tools to measure fairness in your scheduling system:

### 1. **Automatic Calculation** (Built into GA)
Every time you generate a schedule, GINI metrics are calculated automatically.

### 2. **Analysis Tools** (New!)
- `analyze_current_schedule.py` - Check fairness of your CURRENT timetable
- `compare_schedules.py` - Compare fairness across multiple GA runs
- `test_gini.py` - Unit tests to verify GINI calculations work correctly

---

## 🚀 Quick Start

### Analyze Your Current Schedule
```bash
cd ga-backend
python3 analyze_current_schedule.py
```

**Output:**
```
📊 Analyzing 45 classes across 8 professors

1️⃣  WORKLOAD DISTRIBUTION
   Dr. Smith                      → 12 hours/week (4 classes)
   Prof. Johnson                  →  9 hours/week (3 classes)
   ...
   📈 Workload GINI: 0.1523 ✅ (Excellent equality)

2️⃣  ROOM UTILIZATION
   Room 322       → 15 classes  ███████████████
   Room 323       →  8 classes  ████████
   ...
   📈 Room Usage GINI: 0.2145 ✓ (Good - mostly balanced)

3️⃣  AC ROOM ACCESS
   Dr. Smith                      →  8/12 hours (67% in AC)
   Prof. Lee                      →  6/9 hours (67% in AC)
   ...
   📈 AC Access GINI: 0.0987 ✅ (Excellent - fair AC distribution)

📊 OVERALL FAIRNESS SCORE: 0.1552 (EXCELLENT ✨)
```

---

### Compare Generated Schedules
```bash
# View all schedules
python3 compare_schedules.py

# View specific schedule details
python3 compare_schedules.py 42
```

**Output:**
```
  ID         Date  Fitness Hard  Workload     Rooms        AC       Avg Status
--------------------------------------------------------------------------------
  45   2026-02-15  12450.3    0    0.1523    0.2145    0.0987    0.1552 ✨ approved
  44   2026-02-14  11230.1    0    0.1834    0.2567    0.1123    0.1841 ✓  pending
  43   2026-02-13  10890.5    2    0.2341    0.3012    0.1456    0.2270 ✓  pending

🏆 MOST FAIR SCHEDULE: ID 45
   Average GINI: 0.1552
   • Workload:   0.1523
   • Rooms:      0.2145
   • AC Access:  0.0987
```

---

## 🎯 How to Use in Your Workflow

### Method 1: Via API (Recommended for Production)

```bash
# Generate schedule with GINI metrics
curl -X POST http://localhost:8000/api/generate-schedule
```

**Response includes GINI:**
```json
{
  "success": true,
  "schedule_id": 45,
  "fitness_score": 12450.3,
  "gini_workload": 0.1523,
  "gini_room_usage": 0.2145,
  "gini_ac_access": 0.0987
}
```

### Method 2: Direct Database Query

```sql
-- Get GINI metrics for all schedules
SELECT 
    id,
    generation_date,
    gini_workload,
    gini_room_usage,
    gini_ac_access,
    (gini_workload + gini_room_usage + gini_ac_access) / 3 as avg_gini
FROM generated_schedules
ORDER BY avg_gini ASC  -- Best (lowest) GINI first
LIMIT 10;
```

### Method 3: Python Analysis Scripts

```python
# In your own code
from analyze_current_schedule import analyze_current_schedule

# Analyze and get metrics
analyze_current_schedule()
```

---

## 📈 Interpreting GINI Values

| GINI Range | Rating | Meaning | Action |
|-----------|--------|---------|--------|
| 0.00 - 0.20 | ✨ Excellent | Nearly perfect equality | Keep it! |
| 0.20 - 0.30 | ✓ Good | Acceptable fairness | Minor tweaks OK |
| 0.30 - 0.40 | ⚠️ Moderate | Some inequality | Consider rebalancing |
| 0.40+ | ❌ High | Significant inequality | Need optimization |

---

## 🎓 Practical Examples

### Example 1: Find the Fairest Schedule
```bash
# Generate 5 schedules
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/generate-schedule
  sleep 5
done

# Compare them
python3 compare_schedules.py
```

The schedule with **lowest average GINI** is most fair.

### Example 2: Before/After Comparison
```bash
# 1. Analyze current schedule
python3 analyze_current_schedule.py > before.txt

# 2. Generate optimized schedule
curl -X POST http://localhost:8000/api/generate-schedule

# 3. Check if GINI improved
python3 compare_schedules.py
```

### Example 3: Target Specific Metric
If workload GINI is high (>0.3) but room GINI is low:
- The GA is good at distributing rooms
- But needs better workload balancing
- Consider adjusting GA parameters or adding more professors

---

## 🔧 Troubleshooting

### "No data found"
Make sure you have:
1. Professors in database: `SELECT * FROM professors;`
2. Timetable slots: `SELECT * FROM timetable_slots;`

### High GINI values
This is expected if:
- Few professors (hard to balance 2-3 people)
- Very different course loads
- Limited AC rooms (only 3 available: 322, 323, 324)

### GINI = 0.0
Usually means:
- Perfect equality (good!)
- OR no data for that metric
- Check the detailed breakdown

---

## 💡 Pro Tips

1. **Lower is better** - GINI of 0.15 beats 0.25
2. **Average matters most** - Focus on avg(workload, rooms, AC)
3. **Trade-offs exist** - Perfect workload balance may hurt AC access
4. **Run multiple times** - GA is stochastic, try 3-5 runs
5. **Compare trends** - Is GINI decreasing over time?

---

## 🎯 Your Dataset

Based on your schema, GINI tracks:

1. **Workload GINI** - Hours/week per professor (from `end_hour - hour`)
2. **Room Usage GINI** - Classes per room (from `room` column)
3. **AC Access GINI** - AC hours for AC-preferring profs (from `needs_ac` + rooms 322/323/324)

All automatically calculated from `timetable_slots` table!

---

## Next Steps

1. ✅ Run `python3 analyze_current_schedule.py` to see current fairness
2. ✅ Generate a schedule: `POST /api/generate-schedule`
3. ✅ Compare GINI before vs after
4. ✅ Approve the fairest schedule
5. ✅ Monitor GINI over time as you add more data

**Goal:** Keep average GINI < 0.3 for good fairness! 🎯
