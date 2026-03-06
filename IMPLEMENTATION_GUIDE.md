# Implementation Guide: Fixed fetchLatestSchedule Function

## Overview

The `fetchLatestSchedule` function in `app/page.tsx` has been completely refactored with **10 critical fixes** applied. This guide explains what was fixed and how to test the improvements.

---

## Changes Applied

### 1. ✅ **Added Type Safety** (Lines 38-52)
**What Changed:**
- Added `Schedule` interface with proper status types
- Added `ApiResponse<T>` generic interface for type-safe API responses
- All fetch calls now use proper TypeScript types

**Before:**
```typescript
const schedulesResult = await schedulesResponse.json()
if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
```

**After:**
```typescript
const schedulesResult: ApiResponse<Schedule[]> = await schedulesResponse.json()
if (!schedulesResult.success) {
  throw new Error(`API returned success: false, message: ${schedulesResult.message}`)
}
```

**Benefit:** IDE autocomplete works, TypeScript catches errors at compile time

---

### 2. ✅ **Added Validation Helper** (Lines 78-82)
**What Changed:**
- New `isValidScheduleSlot` function validates all required fields
- Filters out invalid data before mapping

**Code:**
```typescript
const isValidScheduleSlot = (slot: any): slot is ScheduleSlot => {
  return (
    (typeof slot.id === 'number' || typeof slot.id === 'string') &&
    typeof slot.day_of_week === 'number' &&
    typeof slot.start_hour === 'number' &&
    typeof slot.end_hour === 'number'
  )
}
```

**Benefit:** Invalid slots are filtered out silently, preventing crashes

---

### 3. ✅ **Added Slot-to-Event Mapper** (Lines 85-135)
**What Changed:**
- Extracted event mapping logic into `mapSlotToEvent` function
- Added comprehensive error handling and validation
- Fixed date calculation logic
- Fixed field validation with proper fallbacks

**Key Fixes Inside:**
```typescript
// FIX 1: Correct date calculation
const currentDay = baseDate.getDay()
let dayOffset = slot.day_of_week - currentDay
if (dayOffset < 0) {
  dayOffset += 7  // Show next week if event is earlier in week
}

// FIX 2: Safe property access
const professorName = slot.professors?.name || `Professor ${slot.professor_id || 'Unknown'}`

// FIX 3: Safe color calculation
const professorId = slot.professor_id || 0
const color = colors[Math.abs(Number(professorId)) % colors.length]
```

**Benefit:** Single location for event conversion logic, eliminates code duplication

---

### 4. ✅ **Added API_URL Fallback** (Line 173)
**What Changed:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[fetchLatestSchedule] NEXT_PUBLIC_API_URL not configured, using default:', apiUrl)
}
```

**Benefit:** App doesn't hang if environment variable is missing

---

### 5. ✅ **Added HTTP Status Validation** (Lines 179-182, 215-218, etc.)
**What Changed:**
Every fetch now checks `.ok` before parsing JSON:
```typescript
if (!schedulesResponse.ok) {
  throw new Error(
    `[fetchLatestSchedule] API returned ${schedulesResponse.status} ${schedulesResponse.statusText}`
  )
}
```

**Benefit:** Server errors (500, 404) don't cause silent failures

---

### 6. ✅ **Fixed Array Access** (Lines 193-196)
**What Changed:**
```typescript
const approvedSchedules = schedulesResult.data.filter((s) => s.status === 'approved')

if (approvedSchedules.length === 0) {
  console.log('[fetchLatestSchedule] No approved schedules found, trying fallback...')
  throw new Error('No approved schedules found')
}

const latestSchedule = approvedSchedules[0]
```

**Benefit:** No more "Cannot read property 'id' of undefined" crashes

---

### 7. ✅ **Fixed Race Condition** (Structure improved)
**What Changed:**
Restructured error handling to use nested try-catch:
- Generated schedule fetch in separate try block
- Timetable fallback in separate try block
- No code after catch blocks that shouldn't execute

**Benefit:** Fallback mechanism works correctly, data isn't lost

---

### 8. ✅ **Fixed Room Filter Inconsistency** (Lines 193-197, 232-237)
**What Changed:**
Both paths now use same logic:
```typescript
const AC_ROOM_IDS = [322, 323, 324]
const acSlots = slots.filter((slot) => {
  const roomId = Number(slot.room_id || slot.room)  // Handle both properties
  return AC_ROOM_IDS.includes(roomId)
})
```

**Benefit:** Fallback path actually filters rooms correctly now

---

### 9. ✅ **Eliminated Code Duplication** (Using mapSlotToEvent)
**What Changed:**
Both generated schedule and timetable paths now use same mapping:
```typescript
const calendarEvents = acSlots
  .filter(isValidScheduleSlot)
  .map(mapSlotToEvent)
  .filter((event): event is CalendarEvent => event !== null)
```

**Benefit:** Single source of truth for event conversion, easier to maintain

---

### 10. ✅ **Enhanced Error Logging** (Lines 228-234, etc.)
**What Changed:**
Errors now include structured context:
```typescript
console.error('[fetchLatestSchedule] Timetable fallback failed:', {
  error: errorMsg,
  endpoint: `${apiUrl}/api/timetable`,
  timestamp: new Date().toISOString(),
})
```

**Benefit:** Easier to debug in production logs

---

## Testing Checklist

Run through each test to verify the fixes:

### Test 1: Missing Environment Variable
```bash
# In .env.local, comment out NEXT_PUBLIC_API_URL
# Expected: App loads, shows warning in console, uses http://localhost:3000
```

**Pass Criteria:** ✓ Warning logged ✓ App doesn't hang ✓ Uses default URL

---

### Test 2: Server Returns 500 Error
```bash
# Modify API to return 500 temporarily
# Expected: Error logged, falls back to timetable endpoint
```

**Pass Criteria:** ✓ Error message appears in console ✓ Fallback is attempted ✓ No silent failure

---

### Test 3: No Approved Schedules
```bash
# Modify API to return empty approved list
# Expected: Logs "No approved schedules found", tries fallback
```

**Pass Criteria:** ✓ No crash ✓ Fallback attempted ✓ Proper error message

---

### Test 4: Invalid Slot Data
```bash
# Inject slot with missing required fields
# Expected: Slot is filtered out, other slots still render
```

**Pass Criteria:** ✓ No crash ✓ Invalid slots filtered ✓ Valid slots render

---

### Test 5: Events Display on Correct Dates
```bash
# Check Monday event on a Friday
# Expected: Event appears on next Monday, not past Monday
```

**Pass Criteria:** ✓ Event on correct date ✓ No past events ✓ Week navigation works

---

### Test 6: Room Filtering Works
```bash
# Verify only AC rooms (322, 323, 324) appear
# Expected: Non-AC rooms filtered out completely
```

**Pass Criteria:** ✓ Only AC rooms in calendar ✓ Both endpoints filter correctly

---

### Test 7: Both Endpoints Down
```bash
# Stop both API endpoints
# Expected: Both endpoints fail, calendar shows empty, no crashes
```

**Pass Criteria:** ✓ Error logged ✓ No crash ✓ UI shows "Loading schedule..." then empty

---

### Test 8: Rapid Refresh Clicks
```bash
# Click refresh button 5 times quickly
# Expected: No duplicate events, loading state managed correctly
```

**Pass Criteria:** ✓ No event duplication ✓ Loading spinner works ✓ No race conditions

---

### Test 9: Browser Console
```bash
# Open DevTools → Console
# Expected: Structured error logs with timestamps and context
```

**Pass Criteria:** 
- ✓ Logs show function name: `[fetchLatestSchedule]`
- ✓ Logs show which step: "Fetching generated schedules..."
- ✓ Errors include endpoint and timestamp
- ✓ Success messages logged

---

## Console Output Examples

### Success Case
```
[fetchLatestSchedule] Starting fetch from: http://localhost:3000
[fetchLatestSchedule] Fetching generated schedules...
[fetchLatestSchedule] Received 3 schedules
[fetchLatestSchedule] Using approved schedule ID: schedule-123
[fetchLatestSchedule] Processing 45 schedule slots...
[fetchLatestSchedule] Filtered to 20 AC room slots
[fetchLatestSchedule] Created 18 valid calendar events from generated schedule
[fetchLatestSchedule] Successfully loaded generated schedule
```

### Fallback Case
```
[fetchLatestSchedule] Starting fetch from: http://localhost:3000
[fetchLatestSchedule] Fetching generated schedules...
[fetchLatestSchedule] API returned 500 Internal Server Error
[fetchLatestSchedule] Generated schedule fetch failed: { error: "...", timestamp: "2025-11-23T10:30:00" }
[fetchLatestSchedule] Attempting timetable fallback...
[fetchLatestSchedule] Timetable returned 30 slots
[fetchLatestSchedule] Timetable filtered to 15 AC room slots
[fetchLatestSchedule] Created 15 valid calendar events from timetable
[fetchLatestSchedule] Successfully loaded timetable fallback
```

### Error Case
```
[fetchLatestSchedule] Starting fetch from: http://localhost:3000
[fetchLatestSchedule] Fetching generated schedules...
[fetchLatestSchedule] API returned 500 Internal Server Error
[fetchLatestSchedule] Generated schedule fetch failed: { error: "...", timestamp: "2025-11-23T10:30:00" }
[fetchLatestSchedule] Attempting timetable fallback...
[fetchLatestSchedule] Timetable API returned 404 Not Found
[fetchLatestSchedule] Timetable fallback failed: { error: "...", endpoint: "http://localhost:3000/api/timetable", timestamp: "2025-11-23T10:30:00" }
[fetchLatestSchedule] All schedule fetch attempts failed: { error: "...", timestamp: "2025-11-23T10:30:00", attempts: ["generated_schedule", "timetable_fallback"] }
[fetchLatestSchedule] Failed to load schedule - calendar will be empty
```

---

## File Changes Summary

**Modified Files:**
- `app/page.tsx` - Complete refactor of `fetchLatestSchedule` function

**Reference Files (Documentation):**
- `CODE_LEVEL_ANALYSIS.md` - Detailed analysis of all 11 issues
- `FETCHLATESTSCHEDULE_FIXED.tsx` - Reference implementation with all fixes
- `IMPLEMENTATION_GUIDE.md` - This file

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Error Handling** | Generic console.error | Structured logs with context |
| **API Status** | Ignored HTTP errors | Checks .ok, throws on failure |
| **Type Safety** | `any` types everywhere | Full TypeScript interfaces |
| **Data Validation** | None | isValidScheduleSlot helper |
| **Date Calculation** | Wrong dates for past events | Correct week calculation |
| **Room Filtering** | Inconsistent logic | Unified approach |
| **Code Duplication** | 40+ lines duplicated | Single mapSlotToEvent function |
| **Fallback Logic** | Broken race condition | Proper nested try-catch |
| **Field Access** | Unsafe, could crash | Safe with fallbacks |
| **Debugging** | Difficult, no context | Easy with structured logs |

---

## Rollback Plan

If issues occur:
1. Copy original code from `app/admin/page.tsx` backup if available
2. Or checkout from git: `git checkout app/page.tsx`
3. Verify with: `npm run build`

---

## Next Steps

1. ✅ Run all tests in the checklist above
2. ✅ Monitor browser console for proper logging
3. ✅ Test with various API response scenarios
4. ✅ Verify with production-like data
5. ✅ Deploy with confidence

