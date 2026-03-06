# Quick Fixes Guide - fetchLatestSchedule()

## Apply These Fixes Immediately (5 minutes)

### Fix 1: Add API URL Fallback (Line 68)
**Replace:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
```

**With:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
if (!apiUrl) {
  console.error("API_URL not configured")
  setEvents([])
  setLoading(false)
  return
}
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
```

---

### Fix 2: Add Response Status Validation (After Line 71)
**Replace:**
```typescript
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
const schedulesResult = await schedulesResponse.json()

if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
```

**With:**
```typescript
const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)

// Validate response before parsing
if (!schedulesResponse.ok) {
  console.error(`API returned ${schedulesResponse.status}`)
  setEvents([])
  setLoading(false)
  return
}

const schedulesResult = await schedulesResponse.json()

if (!schedulesResult || !schedulesResult.success || !Array.isArray(schedulesResult.data)) {
  console.error("Invalid schedules response structure")
  setEvents([])
  setLoading(false)
  return
}

if (schedulesResult.data.length > 0) {
```

---

### Fix 3: Safe Array Access (Line 81)
**Replace:**
```typescript
if (approvedSchedules.length > 0) {
  const latestSchedule = approvedSchedules[0]
  console.log(`Using approved schedule ID: ${latestSchedule.id}`)
```

**With:**
```typescript
if (approvedSchedules.length > 0) {
  const latestSchedule = approvedSchedules[0]
  
  if (!latestSchedule || !latestSchedule.id) {
    console.error("Approved schedule missing required ID field")
    // Continue to fallback
  } else {
    console.log(`Using approved schedule ID: ${latestSchedule.id}`)
```

---

### Fix 4: Validate Schedule Details Response (Line 86)
**Replace:**
```typescript
const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`)
const detailsResult = await detailsResponse.json()

console.log("Schedule details response:", detailsResult)

if (detailsResult.success && detailsResult.data && detailsResult.data.slots) {
```

**With:**
```typescript
const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`)

if (!detailsResponse.ok) {
  console.error(`Details API returned ${detailsResponse.status}`)
  // Continue to fallback
} else {
  const detailsResult = await detailsResponse.json()

  if (detailsResult && detailsResult.success && Array.isArray(detailsResult.data?.slots)) {
```

---

### Fix 5: Validate Slot Data Before Mapping (Line 93)
**Replace:**
```typescript
const calendarEvents: CalendarEvent[] = acSlots.map((slot: any) => {
  // Calculate the date for this slot
  const baseDate = new Date()
  const dayOffset = slot.day_of_week - baseDate.getDay()
  const eventDate = new Date(baseDate)
  eventDate.setDate(baseDate.getDate() + dayOffset)
  
  const startTime = new Date(eventDate)
  startTime.setHours(slot.start_hour, 0, 0, 0)
  
  const endTime = new Date(eventDate)
  endTime.setHours(slot.end_hour, 0, 0, 0)
```

**With:**
```typescript
const calendarEvents: CalendarEvent[] = acSlots
  .filter((slot: any) => {
    // Validate required fields exist and have correct types
    return (
      slot &&
      typeof slot.id !== 'undefined' &&
      typeof slot.start_hour === 'number' &&
      typeof slot.end_hour === 'number' &&
      slot.start_hour >= 0 &&
      slot.start_hour <= 23 &&
      slot.end_hour > slot.start_hour &&
      slot.end_hour <= 24
    )
  })
  .map((slot: any) => {
    // Calculate the date for this slot using proper ISO week logic
    const baseDate = new Date()
    // JavaScript day: 0=Sun, 1=Mon, ..., 6=Sat
    // slot.day_of_week: 0=Mon, 1=Tue, ..., 6=Sun (or similar - verify with backend)
    const jsDay = baseDate.getDay()
    const currentDay = jsDay === 0 ? 6 : jsDay - 1 // Convert to 0=Mon format
    const dayOffset = (slot.day_of_week - currentDay + 7) % 7
    const eventDate = new Date(baseDate)
    eventDate.setDate(baseDate.getDate() + (dayOffset === 0 ? 0 : dayOffset))
    
    const startTime = new Date(eventDate)
    startTime.setHours(slot.start_hour, 0, 0, 0)
    
    const endTime = new Date(eventDate)
    endTime.setHours(slot.end_hour, 0, 0, 0)
```

---

### Fix 6: Safe Default Values (Line 101)
**Replace:**
```typescript
return {
  id: slot.id.toString(),
  title: slot.professors?.name || `Professor ${slot.professor_id}`,
  description: `${slot.subject || "Course"} - Room ${slot.room_id}`,
  startTime,
  endTime,
  color
}
```

**With:**
```typescript
return {
  id: String(slot.id || 'unknown'),
  title: slot.professors?.name || `Professor ${slot.professor_id || 'Unknown'}`,
  description: `${slot.subject || 'Course'} - Room ${slot.room_id || 'TBD'}`,
  startTime,
  endTime,
  color
}
```

---

### Fix 7: Consolidate Room Filtering (Lines 88 & 110)
**Replace both:**
```typescript
// Line 88
const AC_ROOMS = [322, 323, 324]
const acSlots = slots.filter((slot: any) => AC_ROOMS.includes(slot.room_id))

// Line 110 (fallback)
const AC_ROOMS = ['322', '323', '324']
const acSlots = slots.filter((slot: any) => AC_ROOMS.includes(slot.room))
```

**With single function at top of file:**
```typescript
const AC_ROOM_IDS = [322, 323, 324]

const isACRoom = (slot: any): boolean => {
  const roomId = typeof slot.room_id === 'number' 
    ? slot.room_id 
    : parseInt(slot.room_id || slot.room || '0', 10)
  return AC_ROOM_IDS.includes(roomId)
}

// Then use in both places:
const acSlots = slots.filter(isACRoom)
```

---

### Fix 8: Improve Error Handling (Line 126-129)
**Replace:**
```typescript
} catch (error) {
  console.error("Error fetching schedule:", error)
  setEvents([])
}
```

**With:**
```typescript
} catch (error) {
  if (error instanceof TypeError) {
    console.error("Type error (likely invalid data structure):", error.message)
  } else if (error instanceof SyntaxError) {
    console.error("Syntax error (likely JSON parse failed):", error.message)
  } else if (error instanceof ReferenceError) {
    console.error("Reference error (likely missing variable):", error.message)
  } else {
    console.error("Error fetching schedule:", error)
  }
  setEvents([])
}
```

---

### Fix 9: Ensure Loading State Always Reset
**Verify the finally block exists:**
```typescript
} finally {
  setLoading(false)  // This MUST always execute, even on error
}
```

If it's missing, add it at the very end of the try-catch.

---

## Quick Validation Checklist

After applying fixes, verify:

- [ ] App doesn't hang when NEXT_PUBLIC_API_URL is missing
- [ ] No console errors when API returns 500 status
- [ ] Calendar shows empty state (not spinner) when no approved schedules exist
- [ ] Console shows clear error messages distinguishing between error types
- [ ] Loading spinner disappears even when errors occur
- [ ] Room filtering works with both number and string room IDs
- [ ] Classes appear on correct days of week
- [ ] Invalid slots don't crash the app

---

## Performance Notes

- Keep 10-second polling for now, but monitor network usage
- Consider increasing to 30 seconds if network issues occur
- Remove verbose console.log statements in production
- Consider adding toast notification when schedule refreshes

---

## Testing Commands

```bash
# Test missing API URL
unset NEXT_PUBLIC_API_URL
npm run dev

# Test API down (in browser console)
fetch('http://invalid-api.local/api/schedules')
  .then(r => r.json())
  .catch(console.error)

# Test invalid JSON response
curl -H 'Content-Type: text/html' 'http://localhost:3001/api/schedules'
```
