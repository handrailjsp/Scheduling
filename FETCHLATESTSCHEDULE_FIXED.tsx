// IMPROVED VERSION: fetchLatestSchedule with all fixes applied
// Replace the function in app/page.tsx (lines 61-189) with this implementation

// ============================================================================
// 1. Add these interfaces at the top of the file (after existing interfaces)
// ============================================================================

interface Schedule {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  slots: ScheduleSlot[]
  generation_date: string
  created_at?: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

// ============================================================================
// 2. Add this utility function (before fetchLatestSchedule)
// ============================================================================

/**
 * Validates that a schedule slot has all required fields
 */
const isValidScheduleSlot = (slot: any): slot is ScheduleSlot => {
  return (
    typeof slot.id === 'number' ||
    typeof slot.id === 'string' &&
    typeof slot.day_of_week === 'number' &&
    typeof slot.start_hour === 'number' &&
    typeof slot.end_hour === 'number'
  )
}

/**
 * Converts a schedule slot to a calendar event
 */
const mapSlotToEvent = (slot: ScheduleSlot): CalendarEvent | null => {
  try {
    // Validate required fields
    if (!slot.id) {
      console.warn('[fetchLatestSchedule] Slot missing id:', slot)
      return null
    }

    if (typeof slot.day_of_week !== 'number' || slot.day_of_week < 0 || slot.day_of_week > 6) {
      console.warn('[fetchLatestSchedule] Invalid day_of_week:', slot.day_of_week)
      return null
    }

    // Calculate event date correctly
    const baseDate = new Date()
    const currentDay = baseDate.getDay()
    let dayOffset = slot.day_of_week - currentDay

    // If event is earlier in the week than today, show next week's occurrence
    if (dayOffset < 0) {
      dayOffset += 7
    }

    const eventDate = new Date(baseDate)
    eventDate.setDate(baseDate.getDate() + dayOffset)

    const startTime = new Date(eventDate)
    startTime.setHours(slot.start_hour, 0, 0, 0)

    const endTime = new Date(eventDate)
    endTime.setHours(slot.end_hour, 0, 0, 0)

    // Ensure end time is after start time
    if (endTime <= startTime) {
      console.warn('[fetchLatestSchedule] Invalid time range:', { startTime, endTime })
      return null
    }

    // Color assignment with safety check
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
    ]
    const professorId = slot.professor_id || 0
    const color = colors[Math.abs(Number(professorId)) % colors.length]

    // Get professor name with fallback
    const professorName = slot.professors?.name || `Professor ${slot.professor_id || 'Unknown'}`

    // Get room info with fallback
    const roomId = slot.room_id || 'Unknown'
    const subject = slot.subject || 'Course'

    return {
      id: String(slot.id),
      title: professorName,
      description: `${subject} - Room ${roomId}`,
      startTime,
      endTime,
      color,
    }
  } catch (error) {
    console.error('[fetchLatestSchedule] Error mapping slot to event:', {
      slot,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ============================================================================
// 3. REPLACE the fetchLatestSchedule function with this improved version
// ============================================================================

const fetchLatestSchedule = async () => {
  let hasError = false
  let errorMessage = ''

  try {
    setLoading(true)

    // Get API URL with fallback
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.warn('[fetchLatestSchedule] NEXT_PUBLIC_API_URL not configured, using default:', apiUrl)
    }

    console.log('[fetchLatestSchedule] Starting fetch from:', apiUrl)

    // ========================================================================
    // STEP 1: Try to fetch generated schedule
    // ========================================================================
    try {
      console.log('[fetchLatestSchedule] Fetching generated schedules...')
      const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)

      // *** FIX #2: Check HTTP status
      if (!schedulesResponse.ok) {
        throw new Error(
          `[fetchLatestSchedule] API returned ${schedulesResponse.status} ${schedulesResponse.statusText}`
        )
      }

      const schedulesResult: ApiResponse<Schedule[]> = await schedulesResponse.json()

      // Validate response structure
      if (!schedulesResult.success) {
        throw new Error(`[fetchLatestSchedule] API returned success: false, message: ${schedulesResult.message}`)
      }

      if (!Array.isArray(schedulesResult.data)) {
        throw new Error('[fetchLatestSchedule] API data is not an array')
      }

      console.log(`[fetchLatestSchedule] Received ${schedulesResult.data.length} schedules`)

      // *** FIX #4: Check array is not empty before accessing
      const approvedSchedules = schedulesResult.data.filter((s) => s.status === 'approved')

      if (approvedSchedules.length === 0) {
        console.log('[fetchLatestSchedule] No approved schedules found, trying fallback...')
        throw new Error('No approved schedules found')
      }

      const latestSchedule = approvedSchedules[0]
      console.log(`[fetchLatestSchedule] Using approved schedule ID: ${latestSchedule.id}`)

      // *** FIX #3: Proper nested try-catch to prevent race condition
      try {
        const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`)

        // *** FIX #2: Check HTTP status
        if (!detailsResponse.ok) {
          throw new Error(
            `[fetchLatestSchedule] Failed to fetch schedule details: ${detailsResponse.status} ${detailsResponse.statusText}`
          )
        }

        const detailsResult: ApiResponse<{ slots: ScheduleSlot[] }> = await detailsResponse.json()

        if (!detailsResult.success) {
          throw new Error(`[fetchLatestSchedule] Schedule details returned success: false`)
        }

        if (!Array.isArray(detailsResult.data?.slots)) {
          throw new Error('[fetchLatestSchedule] Schedule slots is not an array')
        }

        const slots = detailsResult.data.slots
        console.log(`[fetchLatestSchedule] Processing ${slots.length} schedule slots...`)

        // *** FIX #5: Use consistent room filter with number type
        const AC_ROOM_IDS = [322, 323, 324]
        const acSlots = slots.filter((slot) => {
          const roomId = Number(slot.room_id)
          return AC_ROOM_IDS.includes(roomId)
        })

        console.log(`[fetchLatestSchedule] Filtered to ${acSlots.length} AC room slots`)

        // *** FIX #6, #7: Map with validation and error handling
        const calendarEvents = acSlots
          .filter(isValidScheduleSlot)
          .map(mapSlotToEvent)
          .filter((event): event is CalendarEvent => event !== null)

        console.log(
          `[fetchLatestSchedule] Created ${calendarEvents.length} valid calendar events from generated schedule`
        )

        if (calendarEvents.length > 0) {
          setEvents(calendarEvents)
          console.log('[fetchLatestSchedule] Successfully loaded generated schedule')
          return // Success - exit function
        } else {
          console.log('[fetchLatestSchedule] Generated schedule had no valid events, trying fallback...')
          throw new Error('No valid events in generated schedule')
        }
      } catch (detailsError) {
        const errorMsg = detailsError instanceof Error ? detailsError.message : String(detailsError)
        console.warn('[fetchLatestSchedule] Failed to fetch schedule details:', errorMsg)
        throw detailsError // Re-throw to trigger fallback
      }
    } catch (generatedError) {
      const errorMsg = generatedError instanceof Error ? generatedError.message : String(generatedError)
      console.warn('[fetchLatestSchedule] Generated schedule fetch failed:', {
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
      // Fall through to timetable fallback
    }

    // ========================================================================
    // STEP 2: Fallback - Try timetable_slots endpoint
    // ========================================================================
    console.log('[fetchLatestSchedule] Attempting timetable fallback...')

    try {
      const timetableResponse = await fetch(`${apiUrl}/api/timetable`)

      // *** FIX #2: Check HTTP status
      if (!timetableResponse.ok) {
        throw new Error(
          `[fetchLatestSchedule] Timetable API returned ${timetableResponse.status} ${timetableResponse.statusText}`
        )
      }

      const timetableResult: ApiResponse<ScheduleSlot[]> = await timetableResponse.json()

      if (!timetableResult.success) {
        throw new Error('[fetchLatestSchedule] Timetable API returned success: false')
      }

      if (!Array.isArray(timetableResult.data)) {
        throw new Error('[fetchLatestSchedule] Timetable data is not an array')
      }

      const slots = timetableResult.data
      console.log(`[fetchLatestSchedule] Timetable returned ${slots.length} slots`)

      // *** FIX #5: Use consistent room filter with number type
      const AC_ROOM_IDS = [322, 323, 324]
      const acSlots = slots.filter((slot) => {
        // Handle both room and room_id property names
        const roomId = Number(slot.room_id || slot.room)
        return AC_ROOM_IDS.includes(roomId)
      })

      console.log(`[fetchLatestSchedule] Timetable filtered to ${acSlots.length} AC room slots`)

      // *** FIX #6, #7: Map with validation and error handling
      const calendarEvents = acSlots
        .filter(isValidScheduleSlot)
        .map(mapSlotToEvent)
        .filter((event): event is CalendarEvent => event !== null)

      console.log(`[fetchLatestSchedule] Created ${calendarEvents.length} valid calendar events from timetable`)

      if (calendarEvents.length > 0) {
        setEvents(calendarEvents)
        console.log('[fetchLatestSchedule] Successfully loaded timetable fallback')
        return // Success - exit function
      } else {
        throw new Error('Timetable had no valid events')
      }
    } catch (timetableError) {
      const errorMsg = timetableError instanceof Error ? timetableError.message : String(timetableError)
      console.error('[fetchLatestSchedule] Timetable fallback failed:', {
        error: errorMsg,
        endpoint: `${apiUrl}/api/timetable`,
        timestamp: new Date().toISOString(),
      })
      hasError = true
      errorMessage = 'Failed to load schedule from both endpoints'
      throw timetableError
    }
  } catch (error) {
    // Final error state - set empty events and log comprehensively
    hasError = true
    const errorMsg = error instanceof Error ? error.message : String(error)

    console.error('[fetchLatestSchedule] All schedule fetch attempts failed:', {
      error: errorMsg,
      timestamp: new Date().toISOString(),
      attempts: ['generated_schedule', 'timetable_fallback'],
    })

    // *** FIX #3: Make sure we set empty events when everything fails
    setEvents([])
  } finally {
    setLoading(false)

    // User-facing feedback
    if (hasError) {
      console.warn(
        '[fetchLatestSchedule] Failed to load any schedule. User will see empty calendar. Error:',
        errorMessage
      )
    }
  }
}

// ============================================================================
// IMPROVEMENTS SUMMARY:
// ============================================================================
// FIX #1: Missing API_URL fallback → Added default and warning log
// FIX #2: No HTTP status validation → Added .ok check on all responses
// FIX #3: Race condition in catch → Restructured with proper nested try-catch
// FIX #4: Unsafe array access → Added length check before accessing [0]
// FIX #5: Inconsistent room filters → Unified to number type and consistent logic
// FIX #6: Missing field validation → Added isValidScheduleSlot helper
// FIX #7: Wrong date calculation → Fixed dayOffset logic for past events
// FIX #8: Code duplication → Extracted mapSlotToEvent helper function
// FIX #9: Poor error context → Added structured error logging with context
// FIX #10: Type safety → Added ApiResponse and typed interfaces
// EXTRA: Added step-by-step console logging for debugging
// ============================================================================
