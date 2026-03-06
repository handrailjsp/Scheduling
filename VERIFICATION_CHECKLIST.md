# fetchLatestSchedule() - Pre-Production Verification Checklist

## Complete Verification Checklist

### Phase 1: Code Review (Before Implementation)

#### Code Structure Review
- [ ] Read through entire fetchLatestSchedule() function
- [ ] Identify all API calls made
- [ ] Map out the happy path and error paths
- [ ] Verify function signature and return types
- [ ] Check integration with useScheduleRefresh hook
- [ ] Verify state management (loading, events)

#### Issue Verification
- [ ] Issue #1: Confirm API_URL can be undefined - **Location: Line 68**
  ```javascript
  // Check if this code exists:
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  // Without fallback or null check
  ```

- [ ] Issue #2: Confirm no status validation before parse - **Location: Lines 71-73**
  ```javascript
  // Check if .json() called without checking response.ok
  const schedulesResponse = await fetch(...)
  const schedulesResult = await schedulesResponse.json()
  ```

- [ ] Issue #3: Confirm finally block exists - **Location: Line 127**
  ```javascript
  // Verify finally block is present
  } finally {
    setLoading(false)
  }
  ```

- [ ] Issue #4: Count uses of `any` type - **Location: Multiple**
  ```javascript
  // Search for and count occurrences
  .filter((s: any) =>
  .map((slot: any) =>
  ```

- [ ] Issue #5: Check for array bounds check - **Location: Line 81**
  ```javascript
  // Verify this line exists without length check:
  const latestSchedule = approvedSchedules[0]
  ```

- [ ] Issue #6: Verify date math - **Location: Lines 94-96**
  ```javascript
  // Check the offset calculation:
  const dayOffset = slot.day_of_week - baseDate.getDay()
  // Should be more complex for correct week handling
  ```

- [ ] Issue #7: Check for duplicate room definitions - **Location: Lines 88 & 110**
  ```javascript
  // Verify AC_ROOMS defined twice with different types
  const AC_ROOMS = [322, 323, 324]  // Line 88
  const AC_ROOMS = ['322', '323', '324']  // Line 110
  ```

- [ ] Issue #8: Check field validation before use - **Location: Lines 93-101**
  ```javascript
  // Verify no validation before:
  slot.id.toString()
  slot.professors?.name
  slot.room_id
  ```

- [ ] Issue #9: Check polling interval - **Location: Lines 55-59**
  ```javascript
  // Verify polling setup:
  useScheduleRefresh({
    enabled: true,
    interval: 10000, // Check if this is tested
  })
  ```

- [ ] Issue #10: Count console logs - **Location: Multiple**
  ```javascript
  // Count occurrences:
  console.log(
  console.error(
  // Verify only error-critical logs remain
  ```

- [ ] Issue #11: Check for code duplication - **Location: Lines 104-123**
  ```javascript
  // Verify fallback path has similar code:
  const acSlots = slots.filter(...)
  const calendarEvents: CalendarEvent[] = acSlots.map(...)
  ```

- [ ] Issue #12: Check error categorization - **Location: Lines 126-129**
  ```javascript
  // Verify only generic catch exists:
  } catch (error) {
    console.error("Error fetching schedule:", error)
    // No error type checking
  }
  ```

---

### Phase 2: Unit Testing

#### Test: Issue #1 - Missing API URL
```typescript
// Test Setup
process.env.NEXT_PUBLIC_API_URL = undefined

// Expected Behavior
// - Should not call fetch with undefined
// - Should either use fallback or show error
// - Should not hang indefinitely

// Test Code
await fetchLatestSchedule()
// Should complete without hanging
// Should set loading to false
// setEvents should be called (empty array or fallback data)
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #2 - HTTP 500 Status
```typescript
// Test Setup
fetch = jest.fn().mockResolvedValueOnce({
  ok: false,
  status: 500,
  statusText: 'Internal Server Error',
  json: async () => ({ error: 'Server error' })
})

// Expected Behavior
// - Should NOT call response.json() for non-ok responses
// - Should handle 500 gracefully
// - Should set loading to false
// - Should set events to empty or show fallback

// Verification
expect(loading).toBe(false)
expect(events).toBeDefined() // Either empty or fallback data
expect(console.error).toHaveBeenCalled()
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #3 - Error in Catch Block
```typescript
// Test Setup
fetch = jest.fn().mockRejectedValueOnce(
  new TypeError('Network error')
)

// Expected Behavior
// - finally block MUST execute
// - loading MUST be set to false
// - No UI should be stuck

// Verification Timeline
// T=0: fetchLatestSchedule() called, setLoading(true)
// T=1: fetch rejects with TypeError
// T=2: catch block executes
// T=3: finally block executes
// T=4: Verify setLoading(false) was called

expect(setLoading).toHaveBeenCalledWith(false)
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #4 - Type Safety
```typescript
// Test Setup - API returns different field name
const mockResponse = {
  success: true,
  data: [{
    status_approved: true,  // Wrong field name
    id: 'test-123'
  }]
}

// Expected Behavior
// - Should NOT find any approved schedules
// - Should fall back to timetable
// - Should NOT crash

// Verification
expect(events).toBeDefined()
expect(console.error || console.warn).toHaveBeenCalled()
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #5 - Empty Approved Schedules
```typescript
// Test Setup
const mockResponse = {
  success: true,
  data: [] // Empty array
}

// Expected Behavior
// - approvedSchedules[0] would be undefined
// - Should NOT crash with TypeError
// - Should fall back to timetable

// Verification
await fetchLatestSchedule()
expect(loading).toBe(false)
expect(events).toBeDefined()
expect(console.error).not.toHaveBeenCalledWith(
  expect.stringContaining('Cannot read property')
)
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #6 - Date Calculation
```typescript
// Test Setup
// Today: Wednesday, March 6, 2024 (getDay() = 3)
// Slot: Monday (day_of_week = 1)

const today = new Date(2024, 2, 6) // Wednesday
const slot = { day_of_week: 1, start_hour: 14, end_hour: 15 }

// Current (Wrong) Calculation
const dayOffset = 1 - 3 = -2
// Event placed March 4 (2 days ago) ❌

// Expected (Correct) Calculation
// Event should be March 4 of CURRENT WEEK (past Monday of this week)
// OR March 11 (next Monday)

// Verification
// Compare eventDate with expected date
const eventDate = calculateDateForSlot(slot, today)
expect(eventDate).toEqual(expectedDate)
// eventDate should be in current week or next week, not random past date
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #7 - Room Filter Consistency
```typescript
// Test Setup 1: Numeric room IDs (generated schedule)
const generatedSlots = [
  { room_id: 322, ... },
  { room_id: 323, ... },
  { room_id: 999, ... } // Non-AC room
]

// Test Setup 2: String room IDs (timetable)
const timetableSlots = [
  { room: "322", ... },
  { room: "323", ... },
  { room: "999", ... }
]

// Expected: Both should return 2 AC rooms
const acGenerated = generatedSlots.filter(isACRoom)
const acTimetable = timetableSlots.filter(isACRoom)

expect(acGenerated.length).toBe(2)
expect(acTimetable.length).toBe(2)
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #8 - Field Validation
```typescript
// Test Setup: Slot with missing required fields
const badSlots = [
  { id: null, start_hour: 14, end_hour: 15, ... },
  { id: 'test', start_hour: null, end_hour: 15, ... },
  { id: 'test', start_hour: 14, end_hour: 10, ... }, // end < start
  { id: 'test', start_hour: 14, end_hour: 15, ... } // Valid
]

// Expected Behavior
// - Null/invalid fields should be filtered out
// - Only valid slot should be included
// - No TypeError crashes

const calendarEvents = convertSlotsToEvents(badSlots)
expect(calendarEvents.length).toBe(1)
expect(calendarEvents[0].title).toBe('Valid event')
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #9 - Polling Interval
```typescript
// Test Setup
const startTime = Date.now()
let callCount = 0
const onRefresh = jest.fn(() => { callCount++ })

useScheduleRefresh({
  enabled: true,
  interval: 10000,
  onRefresh
})

// Wait and check
// T=0: Initial call (immediate)
// T=10s: Second call (polling)
// T=20s: Third call
// ...

await new Promise(resolve => setTimeout(resolve, 25000))

expect(callCount).toBeGreaterThanOrEqual(2)
// Should have called at least twice: immediate + one poll
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #10 - Console Output
```typescript
// Test Setup
const consoleSpy = jest.spyOn(console, 'log')
const consoleWarnSpy = jest.spyOn(console, 'warn')
const consoleErrorSpy = jest.spyOn(console, 'error')

// Run function
await fetchLatestSchedule()

// Expected Behavior
// - Errors logged with console.error
// - Warnings with console.warn
// - Info logs ONLY in development
// - No spam of .log() calls

const logs = consoleSpy.mock.calls
const errorLogs = consoleErrorSpy.mock.calls

if (process.env.NODE_ENV === 'production') {
  expect(logs.length).toBeLessThan(5) // Minimal logging
} else {
  expect(errorLogs.length).toBeGreaterThan(0) // Error details logged
}
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #11 - Code Duplication
```typescript
// Verify no duplicated logic between primary and fallback
// Both should use same:
// - Room filtering logic
// - Slot validation logic
// - Event conversion logic

// Use code coverage tools to verify:
// - No unreachable code paths
// - No duplicate functions
// - Common logic extracted
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Issue #12 - Error Categorization
```typescript
// Test Setup
const errorScenarios = [
  { error: new TypeError('Cannot read property'), expected: 'Type error' },
  { error: new SyntaxError('Unexpected token'), expected: 'Syntax error' },
  { error: new ReferenceError('undefined variable'), expected: 'Reference error' },
  { error: new Error('Network error'), expected: 'Unexpected error' }
]

// Expected Behavior
// Each error should be categorized correctly

for (const scenario of errorScenarios) {
  const spy = jest.spyOn(console, 'error')
  
  // Simulate error
  await expectThrow(() => simulateError(scenario.error))
  
  // Verify correct categorization
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining(scenario.expected)
  )
}
```
**Verification:** ✅ Pass / ❌ Fail

---

### Phase 3: Integration Testing

#### Test: Schedule Generation Flow
```typescript
// Test Setup
// 1. Admin generates schedule
// 2. Schedule is approved
// 3. User's calendar should update

// Step 1: Admin clicks "Generate Schedule"
// Expected: Backend creates and approves new schedule

// Step 2: User dashboard auto-polls
// Expected: Within 10 seconds, user sees new schedule

// Step 3: Verify dates are correct
// Expected: Events appear on correct days/weeks with correct times
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: Network Failure Recovery
```typescript
// Scenario 1: Network down initially, comes back
// Expected: Retry automatically through polling

// Scenario 2: API returns 500, then 200
// Expected: User sees data after recovery

// Scenario 3: Slow network (5 second response)
// Expected: Loading state shown, no timeout, eventual success
```
**Verification:** ✅ Pass / ❌ Fail

#### Test: User Experience
```typescript
// Scenario 1: User opens app, admin generates schedule
// Expected: User sees new schedule within ~10 seconds

// Scenario 2: User clicks manual refresh button
// Expected: Spinner shown, data updates, spinner hides

// Scenario 3: API returns invalid data
// Expected: Clear error message or graceful empty state
```
**Verification:** ✅ Pass / ❌ Fail

---

### Phase 4: Performance Testing

#### Load Testing
```typescript
// Test: Multiple rapid refreshes
// Setup: Click refresh button 10 times in 1 second
// Expected: No crashes, proper queuing, final state correct
```
**Verification:** ✅ Pass / ❌ Fail

#### Memory Testing
```typescript
// Test: Long-running app (1 hour)
// Monitor: Memory usage doesn't increase indefinitely
// Expected: Polling doesn't leak memory
```
**Verification:** ✅ Pass / ❌ Fail

#### Network Testing
```typescript
// Test: Throttled network (slow 3G)
// Expected: App still works, shows loading state appropriately
```
**Verification:** ✅ Pass / ❌ Fail

---

### Phase 5: Regression Testing

#### Existing Functionality
- [ ] Calendar displays correctly in month view
- [ ] Calendar displays correctly in week view
- [ ] Calendar displays correctly in day view
- [ ] Event selection works (clicking event shows details)
- [ ] Event deletion works
- [ ] Date navigation works (prev/next week)
- [ ] "Today" button works
- [ ] Manual refresh button works

#### Admin Functionality
- [ ] Generate schedule still works
- [ ] Approve schedule still works
- [ ] Schedule metrics display correctly
- [ ] Schedule history display works

---

### Phase 6: Staging Deployment

#### Pre-Deployment Checks
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Code review approved
- [ ] Performance benchmarks met
- [ ] No TypeScript errors
- [ ] No ESLint errors

#### Staging Validation
- [ ] Deploy to staging environment
- [ ] Run all test scenarios again
- [ ] Verify with production database (copy)
- [ ] Check error logging works
- [ ] Monitor for warnings/errors

#### Stakeholder Approval
- [ ] Product team approves behavior
- [ ] QA team confirms all tests pass
- [ ] DevOps confirms deployment readiness

---

### Phase 7: Production Deployment

#### Rollout Plan
- [ ] Plan deployment window
- [ ] Prepare rollback plan
- [ ] Notify users (if needed)
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Verify functionality
- [ ] Confirm schedule updates work

#### Post-Deployment Monitoring (24 hours)
- [ ] Check error logs for new issues
- [ ] Verify schedule updates are happening
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Be ready to rollback if needed

---

## Sign-Off Checklist

### Developer Sign-Off
- [ ] All 12 issues addressed
- [ ] Code review completed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Ready for QA

### QA Sign-Off
- [ ] All test scenarios passed
- [ ] No new bugs introduced
- [ ] Regression tests passing
- [ ] Performance acceptable
- [ ] Ready for deployment

### PM/Stakeholder Sign-Off
- [ ] Requirements met
- [ ] No breaking changes
- [ ] User experience improved
- [ ] Ready for production

### DevOps Sign-Off
- [ ] Deployment tested in staging
- [ ] Rollback plan documented
- [ ] Monitoring set up
- [ ] Performance metrics defined
- [ ] Ready for production deployment

---

## Final Verification Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Code Review | ⬜ | All 12 issues verified in code |
| Unit Tests | ⬜ | 12 test scenarios created |
| Integration Tests | ⬜ | Schedule flow verified |
| Performance Tests | ⬜ | Load/memory/network tested |
| Regression Tests | ⬜ | Existing features verified |
| Staging Deployment | ⬜ | Deployed and validated |
| Production Deployment | ⬜ | Ready for production |

---

## Go/No-Go Decision

**Date:** _____________  
**Reviewed By:** ________________  
**Decision:** ✅ GO / ❌ NO-GO

**Reason:** _________________________________________________________________

---

**This checklist ensures comprehensive verification before production deployment.**
