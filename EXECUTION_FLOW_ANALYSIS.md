# fetchLatestSchedule() - Execution Flow & Issue Points

## Current Implementation Flow Diagram

```
START
  │
  ├─→ setLoading(true)
  │
  ├─→ Get API URL (ISSUE #1: No fallback if undefined)
  │    └─→ fetch(`undefined/api/schedules`)  ❌ FAILS
  │
  ├─→ Parse response.json() (ISSUE #2: No status check)
  │    ├─→ If 500 error: tries to parse error HTML as JSON ❌
  │    └─→ If non-JSON: SyntaxError thrown ❌
  │
  ├─→ Filter approved schedules
  │    └─→ schedulesResult.data.filter(...) (ISSUE #4: any type, no validation)
  │
  ├─→ Get first approved (ISSUE #5: No bounds check)
  │    └─→ approvedSchedules[0]  (undefined if empty) ❌ CRASH
  │
  ├─→ Fetch details: fetch(`${apiUrl}/api/schedules/${id}`)
  │    └─→ Parse response (ISSUE #2: No status check)
  │
  ├─→ Filter AC rooms (ISSUE #7: Type mismatch, room_id vs room)
  │    └─→ slots.filter(slot => AC_ROOMS.includes(slot.room_id))
  │
  ├─→ Map slots to events (ISSUE #8: No field validation)
  │    │
  │    ├─→ Calculate date (ISSUE #6: Wrong day offset math)
  │    │    const dayOffset = slot.day_of_week - baseDate.getDay()  ❌ WRONG
  │    │
  │    ├─→ Create event object
  │    │    └─→ slot.id.toString() (ISSUE #8: id could be null) ❌ CRASH
  │    │
  │    └─→ Return array of CalendarEvent
  │
  ├─→ setEvents(calendarEvents)
  │
  ├─→ FALLBACK PATH if above fails:
  │    │
  │    ├─→ Fetch `/api/timetable` (ISSUE #11: Duplicate validation)
  │    │
  │    ├─→ Filter AC rooms (ISSUE #7: Different field names)
  │    │    └─→ slots.filter(slot => AC_ROOMS.includes(slot.room))
  │    │
  │    └─→ Map to events (ISSUE #8: Same validation issues)
  │
  └─→ CATCH block (ISSUE #12: Generic error handling)
       └─→ console.error("Error fetching schedule:", error)
       └─→ setEvents([])
       └─→ FINALLY: setLoading(false)  ✅ (Correct)
```

---

## Issue Manifestation Points

### Flow Path: Happy Path (API works, data valid)
```
START → getApiUrl ✅ → fetch ✅ → validate ✅ → parse ✅ → filter ✅ → get[0] ✅
→ fetch details ✅ → validate ✅ → parse ✅ → filter ✅ → map ✅ → setEvents ✅ → END
```
**Result:** Works correctly ✅

---

### Flow Path: Missing API_URL (Issue #1)
```
START → getApiUrl ❌ (undefined)
→ fetch(`undefined/api/schedules`) ❌
→ Network error thrown
→ CATCH block executes
→ setLoading(false) ✅
→ setEvents([])
→ END (but user sees loading spinner forever due to no error feedback) ❌
```
**Result:** App hangs, appears frozen 🔴

---

### Flow Path: API Server Error 500 (Issue #2)
```
START → getApiUrl ✅ → fetch ✅
→ Response: 500 Internal Server Error
→ response.ok = false ❌ (No check here)
→ response.json() tries to parse error HTML ❌
→ SyntaxError or malformed JSON object
→ schedulesResult.data.filter is called on error object
→ Returns undefined (no 'data' field) ❌
→ IF statement fails, goes to fallback
→ Same issues repeat
→ Eventually setEvents([])
→ User sees empty calendar with no error message ❌
```
**Result:** Silent failure, user confused 🔴

---

### Flow Path: No Approved Schedules (Issue #5)
```
START → ... → filter(s.status === 'approved')
→ approvedSchedules = [] (empty array)
→ const latestSchedule = approvedSchedules[0] = undefined
→ latestSchedule.id ❌ CRASH: Cannot read property 'id' of undefined
→ CATCH block catches TypeError
→ console.error shown
→ setEvents([])
→ setLoading(false) ✅
→ END (user sees empty calendar)
```
**Result:** Crash with error, but no graceful fallback 🔴

---

### Flow Path: Wrong Slot Date (Issue #6)
```
Example: Today is Wednesday (day 3), slot.day_of_week is Monday (1)
→ dayOffset = 1 - 3 = -2
→ eventDate.setDate(currentDate - 2)
→ Event placed 2 days in the PAST ❌
→ User views current week, event not visible
→ User thinks schedule is broken ❌
```
**Result:** Events on wrong dates 🔴

---

### Flow Path: Room Type Mismatch (Issue #7)
```
Generated schedule API returns:
{ room_id: 322, ... }

Timetable API returns:
{ room: "322", ... }

Filter logic:
const AC_ROOMS = [322, 323, 324]
const acSlots = slots.filter(s => AC_ROOMS.includes(s.room)) ❌
→ 322 (number) not in slots.room (string "322")
→ Comparison: includes("322") returns false for 322
→ No AC rooms pass filter
→ calendarEvents = []
→ User sees empty calendar (but data exists!)
```
**Result:** Silent data loss 🔴

---

### Flow Path: Missing Field Validation (Issue #8)
```
Malformed slot from API:
{ id: null, start_hour: 14, end_hour: 16, ... }

Mapping logic:
→ slot.id.toString() ❌ CRASH: Cannot read property 'toString' of null
→ OR slot.id.toString() = "null"
→ Event created with id: "null"
→ Event doesn't display properly
→ Modal click crashes: Cannot find event with id "null"
```
**Result:** Runtime crashes, unpredictable behavior 🔴

---

## State Management Issues

### Issue #3: Race Condition Example
```
Timeline:
T=0ms:  fetchLatestSchedule() called
        setLoading(true) ✅
        fetch(apiUrl) dispatched
        
T=50ms: Another fetchLatestSchedule() called (user clicked refresh)
        setLoading(true) again ✅
        fetch(apiUrl) dispatched again
        
T=100ms: First fetch completes with error
        → CATCH block throws
        → setLoading(false) from finally ✅
        
T=150ms: Second fetch completes with error
        → CATCH block throws
        → setLoading(false) from finally ✅
        
Result: Works OK because finally always executes ✅

But if error thrown in CATCH itself:
T=100ms: First fetch completes with error
        → CATCH block: console.error throws (hypothetically)
        → setLoading(false) never called ❌
        → Second fetch's finally can't fix it
        → UI stuck in loading state
```
**Result:** Potential loading state lock 🔴

---

## Error Path Analysis

### What Happens on Each Type of Error

| Error Type | Where | Current Behavior | Expected Behavior |
|-----------|-------|-----------------|-------------------|
| Network Error | fetch() | Thrown → CATCH → empty calendar | Toast: "Network error, retry?" |
| 500 Status | response.ok | Ignored → JSON parse fails | Show: "Server error, try later" |
| JSON Parse Error | response.json() | Thrown → CATCH → generic log | Toast: "Invalid server response" |
| Missing Field | slot mapping | .toString() crashes | Skip bad slot, log warning |
| Empty Approvals | filter()[0] | Undefined access → crash | Fall back gracefully |
| Type Mismatch | filter/map | Silent failure → empty | Validate types, log mismatch |

---

## Timing Diagram - Race Condition Scenario

```
User A (Admin Dashboard)              User B (User Dashboard)           Server

                                      Page load @ T=0
                                      fetchLatestSchedule() starts
                                      │
                                      fetch /api/schedules
                                      ├──────────────────────────→
                                      
Click "Generate Schedule" @ T=100
POST /api/generate-schedule
├───────────────────────────────────→
│
│                                     fetch still pending...
│                                     (setLoading = true)
│
│                                     fetch /api/schedules/detail @ T=200
│                                     ├──────────────────────────→
│
│ Generation complete @ T=300
│ GET /schedules returns
│ ├← [{ id: 1, status: 'approved' }]
│
Schedule saved to DB @ T=350
│
│                                     Detail fetch returns @ T=400
│                                     Response includes new schedule! ✅
│                                     calendarEvents mapped
│                                     setEvents(newEvents) @ T=410
│                                     
                                      User sees new schedule! ✅
                                      (Polling works correctly)

But if timing was different:

User A @ T=100: Generate                User B @ T=50: Initial load
                                        fetch /api/schedules
                                        ├──────────────────────→
User A @ T=200: Poll for approval
API returns 'pending' status
                                        Response returns @ T=100
                                        Shows only old schedules
                                        
                                        Polling @ T=110 (within 10s)
                                        fetch /api/schedules
                                        ├──────────────────────→
                                        Response still pending ❌
                                        
User A @ T=300: Finally approved
                                        Polling @ T=120
                                        fetch /api/schedules
                                        ├──────────────────────→
                                        Now shows new approved ✅
                                        
                                        User sees it! ✅
                                        (But had to wait extra 10s)
```

---

## Console Log Noise Example

```
// Current behavior:
[LOG] Fetching latest approved generated schedule...
[LOG] Using approved schedule ID: 5
[LOG] Schedule details response: Object { success: true, data: {...} }
[LOG] Processing 45 generated schedule slots...
[LOG] Filtered to 12 AC room slots for main calendar view
[LOG] Calendar events created: 12
[LOG] Created 12 calendar events

// If error occurs:
[ERROR] Error fetching schedule: TypeError: Cannot read property 'id' of undefined

// User sees mix of logs, doesn't know which error occurred
// Is it network? Missing data? Wrong format? ❌
```

---

## Summary: Critical Paths to Fix

| Path | Issue | Impact | Fix Time |
|------|-------|--------|----------|
| API URL missing | #1 | App hangs | 5 min |
| Status check | #2 | Silent failure | 5 min |
| Array bounds | #5 | Crash | 3 min |
| Field validation | #8 | Type errors | 5 min |
| Date calculation | #6 | Wrong dates | 10 min |
| Room filtering | #7 | Missing data | 5 min |
| Error handling | #12 | No feedback | 10 min |
| **Total** | | **6 Critical** | **43 min** |

All 6 critical issues must be fixed before production deployment.

---

## Testing These Flows

```bash
# Test Issue #1 (Missing API URL)
unset NEXT_PUBLIC_API_URL
# Expected: Should show friendly error, not hang
# Actual: App hangs with loading spinner

# Test Issue #5 (No approved schedules)
# Delete all approved schedules from DB
# Expected: Falls back to timetable gracefully
# Actual: Crashes with TypeError

# Test Issue #6 (Date calculation)
# Compare shown event dates with DB
# Expected: Events on current/future weeks
# Actual: Events on past weeks

# Test Issue #7 (Room filter)
# Mix numeric and string room IDs in DB
# Expected: All AC rooms show
# Actual: Some AC rooms hidden

# Test Issue #2 (Server error)
# curl -H 'Accept: application/json' http://localhost:3001/api/schedules
# Simulate 500 response
# Expected: Clear error message
# Actual: Silent failure, empty calendar
```
