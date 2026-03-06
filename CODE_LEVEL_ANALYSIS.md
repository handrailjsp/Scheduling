# Detailed Code-Level Analysis: `fetchLatestSchedule` Function

## Executive Summary

The `fetchLatestSchedule` function in `app/page.tsx` (lines 61-189) contains **9 critical issues** that affect data reliability, error handling, and user experience. This document provides code-level analysis with specific line numbers and actionable fixes.

---

## Issues Identified

### 1. ❌ **Missing API_URL Validation (Line 67)**

**Severity:** CRITICAL  
**Lines:** 67  
**Current Code:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
```

**Problem:**
- No fallback if `NEXT_PUBLIC_API_URL` is undefined
- `fetch()` will execute with `undefined/api/schedules`
- Network request fails silently or creates runtime error
- User sees indefinite "Loading schedule..." state

**Impact:**
- App appears frozen if env var is missing
- No error message to user
- Difficult to debug in production

**Fix:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[fetchLatestSchedule] NEXT_PUBLIC_API_URL not configured, using default')
}
```

---

### 2. ❌ **No HTTP Status Code Validation (Lines 71-73)**

**Severity:** CRITICAL  
**Lines:** 71-73  
**Current Code:**
```typescript
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
const schedulesResult = await schedulesResponse.json()

if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
```

**Problem:**
- Never checks `schedulesResponse.status`
- A 500 server error still tries to parse `.json()`
- If server returns HTML error page, `.json()` throws
- Silent failure in catch block sets empty events

**Impact:**
- Server errors masked completely
- No indication to user that data is stale
- Can't distinguish between "no data" and "server error"

**Fix:**
```typescript
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)

if (!schedulesResponse.ok) {
  throw new Error(
    `Failed to fetch schedules: ${schedulesResponse.status} ${schedulesResponse.statusText}`
  )
}

const schedulesResult = await schedulesResponse.json()
```

---

### 3. ❌ **Race Condition in Error Handling (Lines 180-189)**

**Severity:** HIGH  
**Lines:** 180-189  
**Current Code:**
```typescript
} catch (error) {
  console.error("Error fetching timetable_slots:", error)
}

console.log("No schedule data found, calendar will be empty")
setEvents([])
```

**Problem:**
- Code after catch block always executes, even if fetch succeeds
- If timetable fetch succeeds, `setEvents([])` overwrites successful data
- Line 189 `setEvents([])` runs regardless of try/catch outcome
- Users see empty calendar even when data exists

**Impact:**
- Timetable fallback always clears events
- Calendar shows as empty when it shouldn't
- Breaks fallback mechanism entirely

**Fix:**
```typescript
} catch (error) {
  console.error("Error fetching timetable_slots:", error)
  console.log("No schedule data found, calendar will be empty")
  setEvents([])
}
// Only set events if we have data; otherwise handled in catch
```

---

### 4. ❌ **Unsafe Array Access (Lines 84)**

**Severity:** CRITICAL  
**Lines:** 84  
**Current Code:**
```typescript
const latestSchedule = approvedSchedules[0] // Already sorted by generation_date desc
```

**Problem:**
- Assumes `approvedSchedules` has at least 1 element
- But filter may return empty array
- Then `latestSchedule` is `undefined`
- Next line tries to access `.id` on `undefined` → TypeError

**Impact:**
- App crashes with "Cannot read property 'id' of undefined"
- Unhandled promise rejection
- Component unmounts

**Fix:**
```typescript
if (approvedSchedules.length === 0) {
  console.log('No approved schedules found, trying fallback...')
  // Continue to fallback logic instead
} else {
  const latestSchedule = approvedSchedules[0]
  // ... proceed with fetch
}
```

---

### 5. ❌ **Inconsistent Room Filter Logic (Lines 89-91 vs 141-142)**

**Severity:** HIGH  
**Lines:** 89-91 vs 141-142  

**Generated Schedule (Lines 89-91):**
```typescript
const AC_ROOMS = [322, 323, 324]  // Numbers
const acSlots = slots.filter((slot: any) => AC_ROOMS.includes(slot.room_id))
```

**Timetable Fallback (Lines 141-142):**
```typescript
const AC_ROOMS = ['322', '323', '324']  // Strings!
const acSlots = slots.filter((slot: any) => AC_ROOMS.includes(slot.room))
```

**Problem:**
- Numbers vs strings: `322 !== '322'`
- Property names differ: `room_id` vs `room`
- Fallback filters nothing (includes returns false)
- Silent failure in fallback

**Impact:**
- Fallback always returns empty array
- Room filtering doesn't work in fallback path
- Inconsistent data handling

**Fix:**
```typescript
// Both paths should use consistent types and properties
const AC_ROOM_IDS = [322, 323, 324]
const acSlots = slots.filter((slot: any) => 
  AC_ROOM_IDS.includes(parseInt(slot.room_id || slot.room))
)
```

---

### 6. ❌ **Missing Field Validation (Lines 99-106)**

**Severity:** HIGH  
**Lines:** 99-106  
**Current Code:**
```typescript
const calendarEvents: CalendarEvent[] = acSlots.map((slot: any) => {
  // ... code ...
  return {
    id: slot.id.toString(),
    title: slot.professors?.name || `Professor ${slot.professor_id}`,
    description: `${slot.subject || "Course"} - Room ${slot.room_id}`,
    startTime,
    endTime,
    color
  }
})
```

**Problem:**
- No validation that required fields exist
- If `slot.id` is `null/undefined`, `.toString()` throws
- If `slot.professor_id` is missing, fallback uses undefined
- `slot.room_id` might not exist in fallback data
- Color assignment assumes `slot.professor_id` exists (line 105)

**Impact:**
- Crashes with TypeError if fields missing
- Incomplete event data in calendar
- Runtime errors with malformed API responses

**Fix:**
```typescript
if (!slot.id || !slot.professor_id) {
  console.warn('Skipping invalid slot:', slot)
  return null // Filter out nulls after
}

return {
  id: String(slot.id),
  title: slot.professors?.name || `Professor ${slot.professor_id || 'Unknown'}`,
  // ... etc
}
```

---

### 7. ❌ **Incorrect Date Calculation (Lines 94-96)**

**Severity:** MEDIUM  
**Lines:** 94-96  
**Current Code:**
```typescript
const baseDate = new Date()
const dayOffset = slot.day_of_week - baseDate.getDay()
const eventDate = new Date(baseDate)
eventDate.setDate(baseDate.getDate() + dayOffset)
```

**Problem:**
- `day_of_week` from API is likely 0-6 (Sun-Sat)
- `baseDate.getDay()` returns current day (0-6)
- If slot is Monday (1) and today is Sunday (0): offset = 1 ✓
- If slot is Monday (1) and today is Friday (5): offset = -4
  - Event is placed 4 days in the PAST
- Events display on wrong week/day
- Next week's schedule shows as this week's

**Impact:**
- Events appear on incorrect dates
- User sees past/future events
- Confusion when reviewing schedules

**Fix:**
```typescript
const baseDate = new Date()
const currentDay = baseDate.getDay()
let dayOffset = slot.day_of_week - currentDay

// If offset is negative, event is in the past this week
if (dayOffset < 0) {
  dayOffset += 7 // Show next week's occurrence instead
}

const eventDate = new Date(baseDate)
eventDate.setDate(baseDate.getDate() + dayOffset)
```

---

### 8. ❌ **No Duplicate Prevention in Retry Logic (Lines 136-180)**

**Severity:** MEDIUM  
**Lines:** 136-180  
**Current Code:**
```typescript
const timetableResponse = await fetch(`${apiUrl}/api/timetable`)
const timetableResult = await timetableResponse.json()

// ... same mapping logic repeated ...
const calendarEvents: CalendarEvent[] = acSlots.map((slot: any, index: number) => {
  // Duplicated event mapping from lines 99-120
})
```

**Problem:**
- Entire event mapping logic duplicated (20+ lines)
- If both endpoints return data, duplicate code paths
- Bug fixes must be made in 2 places
- DRY principle violated

**Impact:**
- Code maintenance nightmare
- Easy to introduce inconsistencies
- Difficult to fix issues later

**Fix:**
```typescript
// Extract as separate function
const convertSlotsToEvents = (slots: any[], type: 'generated' | 'timetable') => {
  return slots
    .filter(slot => isValidSlot(slot))
    .map(slot => mapSlotToEvent(slot))
}
```

---

### 9. ❌ **No Error Context for Debugging (Lines 180, 186)**

**Severity:** MEDIUM  
**Lines:** 180, 186  
**Current Code:**
```typescript
} catch (error) {
  console.error("Error fetching timetable_slots:", error)
}
// ...
} catch (error) {
  console.error("Error fetching schedule:", error)
  setEvents([])
}
```

**Problem:**
- Generic error messages don't show context
- No indication of which API failed
- No retry information
- No timestamp or request details
- Difficult to debug in production logs

**Impact:**
- Poor observability
- Hard to diagnose issues
- Can't track recurring problems

**Fix:**
```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('[fetchLatestSchedule] Timetable fallback failed', {
    error: errorMessage,
    endpoint: `${apiUrl}/api/timetable`,
    timestamp: new Date().toISOString(),
  })
}
```

---

## Additional Issues

### 10. ⚠️ **Type Safety with `any` (Throughout)**

**Severity:** MEDIUM  
**Lines:** 73, 89, 95, 105, 123, 141, 149

**Problem:**
```typescript
const approvedSchedules = schedulesResult.data.filter((s: any) => s.status === 'approved')
```

- `any` type disables TypeScript checking
- No IDE autocomplete
- Easy to access wrong property names
- Typos aren't caught at compile time

**Fix:**
```typescript
interface Schedule {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  slots: ScheduleSlot[]
  generation_date: string
}

const approvedSchedules: Schedule[] = schedulesResult.data.filter(
  (s: Schedule) => s.status === 'approved'
)
```

---

### 11. ⚠️ **No Loading State During Fallback (Lines 133-189)**

**Severity:** LOW  
**Problem:**
- UI shows "Loading schedule..." during first fetch
- If that fails and fallback runs, UI still shows loading
- User has no idea a second fetch is happening
- Could appear stuck if timetable API is also slow

**Fix:**
```typescript
// Add step tracking
const [loadingStep, setLoadingStep] = useState<string>('initial')
// Then update during different stages
setLoadingStep('Fetching generated schedules...')
// Later: setLoadingStep('Trying timetable fallback...')
```

---

## Summary Table

| Issue | Severity | Lines | Impact | Fix Time |
|-------|----------|-------|--------|----------|
| Missing API_URL fallback | CRITICAL | 67 | App hangs | 5 min |
| No HTTP status check | CRITICAL | 71-73 | Errors masked | 10 min |
| Race condition in catch | CRITICAL | 180-189 | Data loss | 10 min |
| Unsafe array access | CRITICAL | 84 | Crashes | 10 min |
| Room filter inconsistency | HIGH | 89-91, 141-142 | Fallback broken | 10 min |
| Missing field validation | HIGH | 99-106 | Runtime errors | 15 min |
| Wrong date calculation | MEDIUM | 94-96 | Wrong dates | 15 min |
| Code duplication | MEDIUM | 136-180 | Maintenance burden | 20 min |
| Poor error context | MEDIUM | 180, 186 | Hard to debug | 10 min |
| `any` types | MEDIUM | Throughout | Type unsafety | 20 min |
| No fallback UI feedback | LOW | 133-189 | UX issue | 10 min |

**Total Fix Time:** 2-3 hours

---

## Testing Checklist

After implementing fixes, verify:

- [ ] API_URL undefined → Uses fallback, shows error
- [ ] Server returns 500 → Shows error, not empty calendar
- [ ] No approved schedules → Falls back to timetable
- [ ] Timetable also fails → Shows "No schedule available"
- [ ] Events match current week dates
- [ ] All event fields present → No missing professor/room names
- [ ] Room filtering works in both paths
- [ ] Refresh button updates correctly
- [ ] Error messages appear in browser console with context
- [ ] Multiple refreshes don't accumulate events

