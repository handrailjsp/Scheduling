# Schedule Display Feature Guide

## What Was Implemented

### Problem
Previously, the user dashboard timetable would only show classes in a single hourly block, regardless of their actual duration. A class from 1pm to 3pm would only appear in the 1pm slot, not properly representing its two-hour span.

### Solution
Implemented multi-block event highlighting that accurately displays class durations across all relevant hourly blocks with automatic real-time updates.

---

## How It Works

### 1. Automatic Schedule Refresh
The user dashboard now automatically polls for new schedules every 10 seconds. When an admin generates a new schedule:
- The schedule is instantly available to fetch
- The user view automatically refreshes without requiring a page reload
- Users see the updated timetable within ~10 seconds

### 2. Multi-Block Event Rendering
When displaying events in the week view:
- **Identifies event duration**: Calculates start hour to end hour (e.g., 1pm to 3pm = 2 hours)
- **Positions absolutely**: Uses CSS positioning to span the event across multiple hourly blocks
- **Shows time labels**: Displays start and end times within the event block
- **Maintains interactivity**: Events remain clickable with hover effects

### 3. Manual Refresh Option
Users can click the refresh button (↻ icon) in the header for immediate updates without waiting for automatic polling.

---

## Example Scenario

### Admin Perspective
1. Admin opens the admin dashboard
2. Admin clicks "Generate Schedule"
3. System creates optimized schedule and auto-approves it
4. Admin sees success message

### User Perspective (Automatic)
1. User has the calendar open in week view
2. Admin generates schedule (user doesn't need to do anything)
3. Within ~10 seconds, the user's timetable updates automatically
4. Previously empty slots now show classes spanning their full duration

### User Perspective (Manual)
1. User can click the refresh button (↻) anytime
2. Schedule immediately updates
3. No page reload needed

---

## Visual Example

### Before Implementation
```
Time    Monday
1pm     [Class A]
2pm     
3pm     
```

### After Implementation
```
Time    Monday
1pm     [Class A ↓]
2pm     [Class A ↓]
3pm     

CLASS A: 1pm-3pm
Spans 2 blocks vertically
```

---

## Technical Architecture

### Components Modified
1. **`app/page.tsx`** - User dashboard
   - Added polling logic with `useScheduleRefresh` hook
   - Added manual refresh button with loading state
   - Updates `events` state when schedule changes

2. **`components/calendar-grid.tsx`** - Week view rendering
   - New: `getEventsStartingAtHour()` - Find events starting at each hour
   - New: `getEventRowSpan()` - Calculate event duration in hours
   - Updated: Event rendering with absolute positioning
   - Uses `Set<string>` to prevent duplicate event rendering

3. **`hooks/use-schedule-refresh.ts`** - New custom hook
   - Manages polling interval
   - Triggers refresh callback on schedule
   - Configurable interval and enabled state

### Data Flow
```
Admin Generate Schedule
    ↓
Backend saves approved schedule
    ↓
User dashboard polls /api/schedules (every 10s)
    ↓
Calendar grid re-renders with updated events
    ↓
Events span multiple blocks based on duration
```

---

## Configuration

### Polling Interval
Edit the `useScheduleRefresh` call in `app/page.tsx`:
```typescript
useScheduleRefresh({
  enabled: true,
  interval: 10000, // milliseconds (currently 10 seconds)
  onRefresh: fetchLatestSchedule,
})
```

### Time Range
The week view shows 7am to 9pm (15 hours). Each hour is 64px tall.
To change, edit `calendar-grid.tsx`:
```typescript
const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 7am to 9pm
```

---

## Browser Compatibility
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design works on mobile and desktop
- Uses standard CSS positioning and Tailwind utilities

---

## Performance Notes
- Polling interval is set conservatively (10 seconds) to balance responsiveness and server load
- Each poll only fetches metadata until a schedule is found, then fetches details once
- Event rendering uses Set for O(1) duplicate detection
- No unnecessary re-renders due to React hook optimization

---

## Troubleshooting

### Schedule not updating?
1. Check browser console for fetch errors
2. Verify NEXT_PUBLIC_API_URL environment variable is set correctly
3. Click the manual refresh button
4. Check admin dashboard to ensure schedule was generated successfully

### Events showing in wrong position?
1. Verify event start/end times in the API response
2. Check that events are in the AC_ROOMS filter (322, 323, 324)
3. Ensure browser time zone matches server time zone

### Performance issues?
1. Reduce polling interval if updates aren't frequent enough
2. Increase polling interval if server load is high
3. Check browser DevTools Network tab for slow requests
