// ========================================
// IMPROVED fetchLatestSchedule() Function
// All 12 issues addressed with production-ready code
// ========================================

// First, define proper types to replace `any`
interface ScheduleSlot {
  id: number | string
  professor_id: number
  course_id: number
  subject?: string
  room_id: number | string
  day_of_week: number
  start_hour: number
  end_hour: number
  professors?: {
    name: string
    title?: string
    department?: string
  }
}

interface ScheduleResponse {
  success: boolean
  data: Schedule[]
}

interface Schedule {
  id: string | number
  status: 'approved' | 'pending' | 'rejected'
  generation_date: string
  created_at?: string
}

interface ScheduleDetails {
  success: boolean
  data?: {
    id: string | number
    status: string
    slots: ScheduleSlot[]
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Safely validate API URL with fallback
 * FIX for Issue #1: Missing API_URL fallback
 */
function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  
  if (!apiUrl) {
    // Use intelligent fallback based on environment
    const isDevelopment = process.env.NODE_ENV === 'development'
    const fallback = isDevelopment ? 'http://localhost:3001' : window.location.origin
    
    console.warn('NEXT_PUBLIC_API_URL not configured, using fallback:', fallback)
    return fallback
  }
  
  return apiUrl
}

/**
 * Validate HTTP response before parsing
 * FIX for Issue #2: No response status validation
 */
async function validateAndParseJson<T>(response: Response, context: string): Promise<T | null> {
  // Check HTTP status
  if (!response.ok) {
    const status = response.status
    const statusText = response.statusText
    
    // Try to get error message from response
    let errorMessage = `HTTP ${status}: ${statusText}`
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const errorBody = await response.json()
        errorMessage = errorBody.message || errorMessage
      }
    } catch (e) {
      // Response wasn't JSON, stick with HTTP message
    }
    
    console.error(`[${context}] ${errorMessage}`)
    return null
  }

  // Check content type before parsing
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    console.error(`[${context}] Expected JSON but got ${contentType || 'unknown'} content type`)
    return null
  }

  try {
    const data = await response.json()
    
    // Validate response has expected structure
    if (!data || typeof data !== 'object') {
      console.error(`[${context}] Response is not a valid JSON object`)
      return null
    }
    
    return data as T
  } catch (error) {
    console.error(`[${context}] Failed to parse JSON:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Calculate correct week dates using ISO week definition
 * FIX for Issue #6: Date calculation broken for multi-week scheduling
 */
function getWeekDateForSlot(slotDayOfWeek: number, baseDate: Date = new Date()): Date {
  // ISO week: Monday = 1, Sunday = 7
  // JavaScript getDay: Sunday = 0, Monday = 1, ..., Saturday = 6
  
  // Convert JavaScript day (0-6) to ISO day (1-7)
  const jsDay = baseDate.getDay()
  const currentIsoDay = jsDay === 0 ? 7 : jsDay
  
  // Calculate days to add (negative if we need to go back)
  const daysToAdd = slotDayOfWeek - currentIsoDay
  
  const eventDate = new Date(baseDate)
  eventDate.setDate(baseDate.getDate() + daysToAdd)
  
  // Ensure time is reset to avoid off-by-one errors
  eventDate.setHours(0, 0, 0, 0)
  
  return eventDate
}

/**
 * Validate slot has required fields
 * FIX for Issue #8: No validation that required fields exist
 */
function isValidSlot(slot: any): slot is ScheduleSlot {
  return (
    slot &&
    typeof slot === 'object' &&
    (typeof slot.id === 'number' || typeof slot.id === 'string') &&
    typeof slot.start_hour === 'number' &&
    typeof slot.end_hour === 'number' &&
    slot.start_hour >= 0 &&
    slot.start_hour <= 23 &&
    slot.end_hour > slot.start_hour &&
    slot.end_hour <= 24
  )
}

/**
 * Safe room filter with type handling
 * FIX for Issue #7: Inconsistent room filter logic
 */
function isACRoom(slot: any, acRoomIds: number[] = [322, 323, 324]): boolean {
  // Handle both numeric and string room IDs
  let roomId: number | null = null
  
  if (typeof slot.room_id === 'number') {
    roomId = slot.room_id
  } else if (typeof slot.room_id === 'string') {
    roomId = parseInt(slot.room_id, 10)
  } else if (typeof slot.room === 'number') {
    roomId = slot.room
  } else if (typeof slot.room === 'string') {
    roomId = parseInt(slot.room, 10)
  }
  
  return roomId !== null && acRoomIds.includes(roomId)
}

/**
 * Convert schedule slot to calendar event
 * FIX for Issues #8 (validation) extracted to reduce duplication
 */
function convertSlotToCalendarEvent(
  slot: ScheduleSlot,
  eventDate: Date,
  colorPalette: string[]
): CalendarEvent | null {
  // Validate required fields
  if (!isValidSlot(slot)) {
    console.warn('Invalid slot structure:', slot)
    return null
  }

  // Create time objects
  const startTime = new Date(eventDate)
  startTime.setHours(slot.start_hour, 0, 0, 0)

  const endTime = new Date(eventDate)
  endTime.setHours(slot.end_hour, 0, 0, 0)

  // Select color consistently
  const professorId = typeof slot.professor_id === 'number' ? slot.professor_id : 0
  const color = colorPalette[Math.abs(professorId) % colorPalette.length]

  // Safely access professor name
  const professorName = slot.professors?.name || `Professor ${slot.professor_id || 'Unknown'}`
  const roomId = slot.room_id || 'TBD'

  return {
    id: String(slot.id),
    title: professorName,
    description: `${slot.subject || 'Course'} - Room ${roomId}`,
    startTime,
    endTime,
    color,
  }
}

// ========== MAIN FUNCTION ==========

/**
 * Fetch and parse the latest approved schedule
 * All 12 issues from analysis report fixed
 */
async function fetchLatestScheduleImproved(
  setEvents: (events: CalendarEvent[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> {
  const colorPalette = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ]

  try {
    setLoading(true)

    // ===== STEP 1: Get API URL with fallback =====
    const apiUrl = getApiUrl()

    // ===== STEP 2: Fetch approved schedules =====
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) console.log('Fetching latest approved generated schedule...')

    const schedulesResponse = await fetch(`${apiUrl}/api/schedules`, {
      headers: { Accept: 'application/json' },
    })

    // FIX Issue #2: Validate response before parsing
    const schedulesData = await validateAndParseJson<ScheduleResponse>(
      schedulesResponse,
      'GET /api/schedules'
    )

    if (!schedulesData) {
      console.log('No schedule response received, trying timetable fallback...')
      // Fall through to fallback logic below
    } else {
      // ===== STEP 3: Find approved schedules =====
      // FIX Issue #4: Proper type safety
      if (!Array.isArray(schedulesData.data)) {
        console.error('Schedules data is not an array:', typeof schedulesData.data)
      } else {
        const approvedSchedules = schedulesData.data.filter(
          (s): s is Schedule => s && typeof s === 'object' && s.status === 'approved'
        )

        // ===== STEP 4: Get latest schedule =====
        // FIX Issue #5: Safe array access with bounds checking
        if (approvedSchedules.length === 0) {
          console.log('No approved schedules found in list')
        } else {
          const latestSchedule = approvedSchedules[0]

          // Validate schedule has ID
          if (!latestSchedule?.id) {
            console.error('Approved schedule missing ID:', latestSchedule)
          } else {
            if (isDev) console.log(`Using approved schedule ID: ${latestSchedule.id}`)

            // ===== STEP 5: Fetch schedule details =====
            const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`, {
              headers: { Accept: 'application/json' },
            })

            const detailsData = await validateAndParseJson<ScheduleDetails>(
              detailsResponse,
              `GET /api/schedules/${latestSchedule.id}`
            )

            // ===== STEP 6: Process slots =====
            if (detailsData?.success && Array.isArray(detailsData.data?.slots)) {
              const slots = detailsData.data.slots
              if (isDev) console.log(`Processing ${slots.length} generated schedule slots...`)

              // FIX Issue #7: Safe room filtering with type handling
              const acSlots = slots.filter((slot) => isACRoom(slot))
              if (isDev) console.log(`Filtered to ${acSlots.length} AC room slots`)

              // FIX Issue #11: Extract common mapping logic
              // FIX Issue #6: Use proper date calculation
              const calendarEvents: CalendarEvent[] = []
              for (const slot of acSlots) {
                const eventDate = getWeekDateForSlot(slot.day_of_week)
                const event = convertSlotToCalendarEvent(slot, eventDate, colorPalette)

                if (event) {
                  calendarEvents.push(event)
                } else if (isDev) {
                  console.warn(`Failed to convert slot ${slot.id} to calendar event`)
                }
              }

              if (isDev) console.log(`Created ${calendarEvents.length} calendar events`)
              setEvents(calendarEvents)
              return
            }
          }
        }
      }
    }

    // ===== FALLBACK: Fetch from timetable =====
    console.log('Using timetable fallback...')

    const timetableResponse = await fetch(`${apiUrl}/api/timetable`, {
      headers: { Accept: 'application/json' },
    })

    // FIX Issue #2: Validate response
    interface TimetableResponse {
      success: boolean
      data: ScheduleSlot[]
    }
    
    const timetableData = await validateAndParseJson<TimetableResponse>(
      timetableResponse,
      'GET /api/timetable'
    )

    if (timetableData?.success && Array.isArray(timetableData.data)) {
      const slots = timetableData.data
      if (isDev) console.log(`Using ${slots.length} slots from live timetable`)

      // FIX Issue #7: Safe room filtering
      const acSlots = slots.filter((slot) => isACRoom(slot))

      // FIX Issue #11: Use common mapping logic
      const calendarEvents: CalendarEvent[] = []
      for (const slot of acSlots) {
        const eventDate = getWeekDateForSlot(slot.day_of_week)
        const event = convertSlotToCalendarEvent(slot, eventDate, colorPalette)

        if (event) {
          calendarEvents.push(event)
        }
      }

      setEvents(calendarEvents)
      return
    }

    // ===== FINAL FALLBACK: Empty calendar =====
    console.log('No schedule data available from any source')
    setEvents([])
  } catch (error) {
    // FIX Issue #12: Distinguish error types
    if (error instanceof TypeError) {
      console.error('Type error during schedule fetch (likely data structure):', error.message)
    } else if (error instanceof SyntaxError) {
      console.error('Syntax error during schedule fetch (likely JSON parsing):', error.message)
    } else if (error instanceof ReferenceError) {
      console.error('Reference error (likely missing variable):', error.message)
    } else {
      console.error('Unexpected error fetching schedule:', error)
    }

    // FIX Issue #3: Always reset loading state
    setEvents([])
  } finally {
    // FIX Issue #3: Always reset loading state, even on error
    setLoading(false)
  }
}

// ========================================
// USAGE in page.tsx:
// ========================================
/*

const fetchLatestSchedule = () => {
  return fetchLatestScheduleImproved(setEvents, setLoading)
}

*/
