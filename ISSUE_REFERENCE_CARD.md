# fetchLatestSchedule() Issues - Quick Reference Card

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### Issue #1: Missing API_URL Fallback
- **Location:** Line 68 in `fetchLatestSchedule()`
- **Severity:** CRITICAL
- **Description:** If `NEXT_PUBLIC_API_URL` env var is missing, `fetch(undefined/api/schedules)` is called, causing network error
- **Symptom:** App loading spinner freezes indefinitely on initial load
- **Fix Time:** 5 minutes
- **Fix:** Add fallback: `const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`

---

### Issue #2: No Response Status Validation
- **Location:** Lines 71-73 in `fetchLatestSchedule()`
- **Severity:** CRITICAL
- **Description:** Code calls `response.json()` without checking if `response.ok === true`, so 500 errors try to parse HTML as JSON
- **Symptom:** Silent failure when API returns error, empty calendar with no message
- **Fix Time:** 5 minutes
- **Fix:** Check `if (!response.ok)` before calling `.json()`

---

### Issue #3: Race Condition in Error Handling
- **Location:** Lines 65-130 in `fetchLatestSchedule()`
- **Severity:** CRITICAL
- **Description:** If error is thrown in catch block, `finally` might not execute (in edge cases), leaving `loading` state true
- **Symptom:** UI loading spinner stuck forever after any error
- **Fix Time:** 3 minutes
- **Fix:** Ensure `setLoading(false)` is guaranteed to execute; prefer explicit state management

---

### Issue #4: Type Safety with `any` Types
- **Location:** Lines 75+, throughout function
- **Severity:** CRITICAL
- **Description:** Using `any` types hides TypeScript errors; if backend changes field names (e.g., `status` → `approved_status`), code silently fails
- **Symptom:** Unpredictable behavior, data corruption, no compile-time detection
- **Fix Time:** 10 minutes
- **Fix:** Define proper interfaces: `interface Schedule { id: string, status: 'approved' | 'pending' }`

---

### Issue #5: Unsafe Array Access
- **Location:** Line 81 in `fetchLatestSchedule()`
- **Severity:** CRITICAL
- **Description:** Code accesses `approvedSchedules[0]` without checking if array has elements, causing `undefined` reference
- **Symptom:** TypeError crash: "Cannot read property 'id' of undefined"
- **Fix Time:** 3 minutes
- **Fix:** Check `if (approvedSchedules.length === 0)` before accessing `[0]`

---

### Issue #6: Broken Date Calculation Logic
- **Location:** Lines 94-96 in `fetchLatestSchedule()`
- **Severity:** CRITICAL
- **Description:** Date offset calculation is wrong: `dayOffset = slot.day_of_week - baseDate.getDay()` places events on wrong weeks
- **Symptom:** Events appear on past or future weeks instead of correct week
- **Fix Time:** 10 minutes
- **Fix:** Use proper ISO week calculation: determine Monday of current week, then add days

---

## 🟡 MAJOR ISSUES (Fix This Sprint)

### Issue #7: Inconsistent Room Filter Logic
- **Location:** Lines 88-90 (generated) vs 110-112 (fallback)
- **Severity:** MAJOR
- **Description:** Room filter defined twice with different data types: `[322, 323]` vs `["322", "323"]`, inconsistent field names `room_id` vs `room`
- **Symptom:** Silent filtering failures when data types differ between APIs
- **Fix Time:** 5 minutes
- **Fix:** Create single `isACRoom(slot)` helper function that handles both types

---

### Issue #8: No Field Validation Before Use
- **Location:** Lines 93-101 in calendar event mapping
- **Severity:** MAJOR
- **Description:** Code doesn't validate required fields exist before using them: `slot.id.toString()` crashes if `id` is null
- **Symptom:** TypeErrors when slot data structure varies or has missing fields
- **Fix Time:** 5 minutes
- **Fix:** Filter slots before mapping: `filter(slot => slot?.id && slot?.start_hour !== undefined)`

---

### Issue #9: Polling Hook Timing Issues
- **Location:** Lines 55-59 in `page.tsx`
- **Severity:** MAJOR
- **Description:** Polling set to 10 seconds; if admin generates schedule within 10s of user opening app, they won't see it immediately
- **Symptom:** Delayed schedule updates for users
- **Fix Time:** 2 minutes
- **Fix:** Call `fetchLatestSchedule()` immediately in useEffect, then set up polling separately

---

### Issue #10: Excessive Console Logging
- **Location:** Lines 67, 81, 86, 104 (throughout)
- **Severity:** MEDIUM
- **Description:** Heavy logging makes console noisy, makes it hard to spot real errors
- **Symptom:** Console spam, harder to debug production issues
- **Fix Time:** 5 minutes
- **Fix:** Use conditional logging: `if (isDev) console.log(...)`

---

### Issue #11: Code Duplication in Fallback
- **Location:** Lines 104-123 (entire fallback has same issues as primary)
- **Severity:** MEDIUM
- **Description:** Fallback timetable fetch has identical validation and mapping issues as primary path
- **Symptom:** Multiple failure points with no consistency
- **Fix Time:** 10 minutes
- **Fix:** Extract slot-to-event mapping into reusable function

---

### Issue #12: Generic Error Handling
- **Location:** Lines 126-129 in catch block
- **Severity:** MEDIUM
- **Description:** All errors treated the same; doesn't distinguish between network errors, parse errors, and logic errors
- **Symptom:** User doesn't know what went wrong, hard to debug
- **Fix Time:** 5 minutes
- **Fix:** Catch different error types: `if (error instanceof TypeError)`, `if (error instanceof SyntaxError)`

---

## Fix Priority Matrix

```
        Must Fix Today    Fix This Sprint    Fix Later
          (Critical)         (Major)         (Minor)
          
#1 API fallback ✓
#2 Status check ✓
#3 Race condition ✓
#4 Type safety ✓
#5 Array bounds ✓
#6 Date calc ✓
                         #7 Room filter
                         #8 Validation
                         #9 Polling
                         #10 Logging
                         #11 Duplication
                         #12 Error handling
```

---

## Checklist for Fixes

### Day 1 - Critical Fixes (Target: 1 hour)
- [ ] Issue #1: Add API URL fallback
- [ ] Issue #2: Check response.ok before .json()
- [ ] Issue #3: Verify finally block always executes
- [ ] Issue #5: Check array length before accessing [0]
- [ ] Issue #6: Fix date calculation to use proper week math
- [ ] Issue #4: Add proper TypeScript interfaces

### Day 2 - Major Issues (Target: 2 hours)
- [ ] Issue #7: Consolidate room filter to single function
- [ ] Issue #8: Add field validation before mapping
- [ ] Issue #9: Call fetchLatestSchedule immediately on mount
- [ ] Issue #10: Add conditional logging based on NODE_ENV
- [ ] Issue #11: Extract slot-to-event mapping function
- [ ] Issue #12: Add error type checking in catch block

### Testing (Target: 1 hour)
- [ ] Test with missing NEXT_PUBLIC_API_URL
- [ ] Test with API returning 500 status
- [ ] Test with no approved schedules in database
- [ ] Test with mixed room ID types (numeric and string)
- [ ] Test with network throttling
- [ ] Verify dates are correct for all days of week
- [ ] Verify events span correct hours

---

## Quick Diagnosis Guide

**Symptom: Loading spinner freezes forever**
→ Check Issue #1 (API URL) or Issue #3 (error handling)

**Symptom: Empty calendar with no errors**
→ Check Issue #2 (status validation) or Issue #5 (array access)

**Symptom: Events on wrong dates/weeks**
→ Check Issue #6 (date calculation)

**Symptom: Some AC rooms don't show**
→ Check Issue #7 (room filter) or Issue #8 (field validation)

**Symptom: TypeError crash when opening app**
→ Check Issue #4 (type safety) or Issue #5 (array bounds)

**Symptom: User sees stale schedule after admin generates new one**
→ Check Issue #9 (polling interval)

---

## Files to Reference

1. **FETCHLATESTSCHEDULE_ANALYSIS.md** (469 lines)
   - Full detailed analysis of all 12 issues
   - Best for understanding the "why"

2. **QUICK_FIXES_GUIDE.md** (296 lines)
   - Line-by-line fixes for current code
   - Best for implementing fixes quickly

3. **IMPROVED_FETCHLATESTSCHEDULE.tsx** (401 lines)
   - Complete rewritten function
   - Best for code review and refactoring

4. **EXECUTION_FLOW_ANALYSIS.md** (345 lines)
   - Visual flow diagrams and timing examples
   - Best for understanding interactions

5. **ANALYSIS_SUMMARY.md** (168 lines)
   - Executive overview and risk matrix
   - Best for stakeholder communication

---

## Performance Impact of Fixes

| Fix | Performance Impact | Network Impact | UX Impact |
|-----|-------------------|-----------------|-----------|
| #1 Add fallback | None | None | Better error handling |
| #2 Check status | None | None | Better error handling |
| #3 Fix race | Negligible | None | Prevents UI freeze |
| #4 Type safety | Negligible | None | Prevents crashes |
| #5 Array bounds | None | None | Prevents crashes |
| #6 Date calc | None | None | Shows correct schedule |
| #7 Room filter | None | None | Shows correct rooms |
| #8 Validation | Negligible | None | Handles bad data |
| #9 Polling | Negligible | +1 request every 10s | Faster updates |
| #10 Logging | Positive | None | Easier debugging |
| #11 Duplication | Positive | None | Better maintainability |
| #12 Error msgs | None | None | Better error feedback |

**Summary:** Fixes improve reliability, UX, and maintainability with negligible performance cost.

---

## References

**React Docs:** https://react.dev/reference/react/useEffect  
**TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/  
**Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API  
**JavaScript Date:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date  

---

**Version:** 1.0  
**Last Updated:** 2026-03-06  
**Analysis Status:** Complete - Ready for implementation  
**Estimated Total Fix Time:** 6-9 hours
