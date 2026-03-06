"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar, RotateCw } from "lucide-react"
import { getWeekDays } from "@/lib/date-utils"
import SidebarNavigation from "@/components/sidebar-navigation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import LoginModal from "@/components/login-modal"
import { cn } from "@/lib/utils"
import { useScheduleRefresh } from "@/hooks/use-schedule-refresh"

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  color: string
}

interface ScheduleSlot {
  id: number
  professor_id: number
  course_id: number
  subject?: string
  room_id: number
  day_of_week: number
  start_hour: number
  end_hour: number
  professors?: {
    name: string
    title: string
    department: string
  }
}

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

// Validates that a schedule slot has all required fields
const isValidScheduleSlot = (slot: any): slot is ScheduleSlot => {
  return (
    (typeof slot.id === 'number' || typeof slot.id === 'string') &&
    typeof slot.day_of_week === 'number' &&
    typeof slot.start_hour === 'number' &&
    typeof slot.end_hour === 'number'
  )
}

// Converts a schedule slot to a calendar event with validation
const mapSlotToEvent = (slot: ScheduleSlot): CalendarEvent | null => {
  try {
    if (!slot.id) {
      console.warn('[fetchLatestSchedule] Slot missing id:', slot)
      return null
    }

    if (typeof slot.day_of_week !== 'number' || slot.day_of_week < 0 || slot.day_of_week > 6) {
      console.warn('[fetchLatestSchedule] Invalid day_of_week:', slot.day_of_week)
      return null
    }

    // Calculate event date correctly - handle events earlier in the week
    const baseDate = new Date()
    const currentDay = baseDate.getDay()
    let dayOffset = slot.day_of_week - currentDay

    if (dayOffset < 0) {
      dayOffset += 7
    }

    const eventDate = new Date(baseDate)
    eventDate.setDate(baseDate.getDate() + dayOffset)

    const startTime = new Date(eventDate)
    startTime.setHours(slot.start_hour, 0, 0, 0)

    const endTime = new Date(eventDate)
    endTime.setHours(slot.end_hour, 0, 0, 0)

    if (endTime <= startTime) {
      console.warn('[fetchLatestSchedule] Invalid time range:', { startTime, endTime })
      return null
    }

    // Use green color for all blocks to match admin dashboard design
    const color = "bg-green-500"

    // Get professor name - try multiple sources to ensure we always have a name
    let professorName = slot.professors?.name
    if (!professorName && slot.professor_id) {
      // Fallback: use "Prof {ID}" format if no name available
      professorName = `Prof ${slot.professor_id}`
    }
    
    const courseSubject = slot.subject || 'Course'
    if (!professorName) {
      // Last resort: use subject if no professor name
      professorName = courseSubject
    }

    const roomId = slot.room_id || 'Unknown'

    // Log for debugging if using fallback names
    if (!slot.professors?.name) {
      console.warn(
        `[mapSlotToEvent] Slot ${slot.id}: No professor name found. Using: "${professorName}" (Professor ID: ${slot.professor_id}, Course: "${courseSubject}", Room: ${roomId})`
      )
    }

    return {
      id: String(slot.id),
      title: professorName,
      description: `${courseSubject} - Room ${roomId}`,
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

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 23))
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const fetchLatestSchedule = async () => {
    let hasError = false

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

        // Check HTTP status
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

        // Check array is not empty before accessing
        const approvedSchedules = schedulesResult.data.filter((s) => s.status === 'approved')

        if (approvedSchedules.length === 0) {
          console.log('[fetchLatestSchedule] No approved schedules found, trying fallback...')
          throw new Error('No approved schedules found')
        }

        const latestSchedule = approvedSchedules[0]
        console.log(`[fetchLatestSchedule] Using approved schedule ID: ${latestSchedule.id}`)

        // Proper nested try-catch to prevent race condition
        try {
          const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`)

          // Check for 404 (schedule not found - might be old/deleted)
          if (detailsResponse.status === 404) {
            throw new Error(`Schedule ${latestSchedule.id} not found (may have been deleted)`)
          }

          // Check HTTP status
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

          // Show ALL rooms from generated schedule (not just AC rooms)
          // The generated schedule contains the optimized room assignments
          console.log(`[fetchLatestSchedule] Using all ${slots.length} rooms from generated schedule`)
            
          // Convert slots to calendar events
          const calendarEvents = slots
            .filter(isValidScheduleSlot)
            .map(mapSlotToEvent)
            .filter((event): event is CalendarEvent => event !== null)

          console.log(`[fetchLatestSchedule] Created ${calendarEvents.length} valid calendar events from generated schedule`)

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
          console.log(`[fetchLatestSchedule] Failed to fetch schedule details: ${errorMsg}. Will try timetable fallback...`)
          throw detailsError // Re-throw to trigger fallback
        }
      } catch (generatedError) {
        const errorMsg = generatedError instanceof Error ? generatedError.message : String(generatedError)
        console.log(`[fetchLatestSchedule] Generated schedule fetch failed: ${errorMsg}. Trying timetable fallback...`)
        // Fall through to timetable fallback
      }

      // ========================================================================
      // STEP 2: Fallback - Try timetable endpoint
      // ========================================================================
      console.log('[fetchLatestSchedule] Attempting timetable fallback...')

      try {
        const timetableResponse = await fetch(`${apiUrl}/api/timetable`)

        // Check HTTP status
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

        // Show all rooms from timetable (fallback)
        // Log unique room IDs to help with debugging
        const roomsInTimetable = Array.from(new Set(slots.map(s => s.room)))
        console.log(`[fetchLatestSchedule] Available rooms in timetable: ${roomsInTimetable.join(', ')}`)
        
        // Convert to calendar events from timetable
        const calendarEvents = slots
          .filter(isValidScheduleSlot)
          .map(mapSlotToEvent)
          .filter((event): event is CalendarEvent => event !== null)

        console.log(`[fetchLatestSchedule] Created ${calendarEvents.length} valid calendar events from timetable`)

        if (calendarEvents.length > 0) {
          setEvents(calendarEvents)
          console.log('[fetchLatestSchedule] Successfully loaded timetable fallback')
          return // Success - exit function
        } else {
          throw new Error(`Timetable had no valid AC room slots. Timetable has rooms: ${roomsInTimetable.join(', ')} but we're looking for: ${AC_ROOM_IDS.join(', ')}`)
        }
      } catch (timetableError) {
        const errorMsg = timetableError instanceof Error ? timetableError.message : String(timetableError)
        console.warn(`[fetchLatestSchedule] Timetable fallback failed: ${errorMsg} (endpoint: ${apiUrl}/api/timetable)`)
        hasError = true
        throw timetableError
      }
    } catch (error) {
      // Final error state
      hasError = true
      const errorMsg = error instanceof Error ? error.message : String(error)

      console.warn(`[fetchLatestSchedule] All schedule fetch attempts failed: ${errorMsg} (tried: generated_schedule, timetable_fallback). Check backend logs for /api/schedules/{id} 500 errors.`)

      setEvents([])
    } finally {
      setLoading(false)

      if (hasError) {
        console.warn('[fetchLatestSchedule] Failed to load schedule - calendar will be empty')
      }
    }
  }

  // Fetch latest approved schedule on mount
  useEffect(() => {
    fetchLatestSchedule()
  }, [])

  // Set up automatic schedule refresh (polling every 10 seconds)
  // DISABLED: This caused random reloads. Users can manually refresh using the button above.
  useScheduleRefresh({
    enabled: false,
    interval: 10000, // 10 seconds
    onRefresh: fetchLatestSchedule,
  })

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter((e: CalendarEvent) => e.id !== eventId))
    setSelectedEvent(null)
  }

  const handlePreviousWeek = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7))
  }

  const handleNextWeek = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleAdminLogin = () => {
    setIsLoginOpen(true)
  }

  const handleLoginSuccess = () => {
    setIsLoginOpen(false)
    router.push("/admin")
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchLatestSchedule()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNavigation currentDate={currentDate} onSelectDate={setCurrentDate} view={view} onViewChange={setView} />

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with navigation controls */}
        <div className="border-b border-border px-8 py-6 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-sm font-light text-muted-foreground tracking-wide uppercase">
                {view === "week"
                  ? `Week of ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : view === "month"
                    ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    : currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                variant="ghost"
                size="icon"
                className="hover:bg-muted text-muted-foreground"
                title="Refresh schedule"
              >
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                onClick={handlePreviousWeek}
                variant="ghost"
                size="icon"
                className="hover:bg-muted text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleToday}
                variant="ghost"
                className="text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Today
              </Button>
              <Button
                onClick={handleNextWeek}
                variant="ghost"
                size="icon"
                className="hover:bg-muted text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Full Width */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Week Header */}
              <div className="flex border-b border-border sticky top-0 bg-background z-10">
                <div className="w-20 flex-shrink-0 border-r border-border bg-background"></div>
                <div className="flex flex-1 divide-x divide-border">
                  {getWeekDays(currentDate).map((date) => {
                    const today = new Date()
                    const isToday =
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()

                    return (
                      <div key={date.toISOString()} className="flex-1 text-center py-4">
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className={cn("text-lg font-light mt-1", isToday ? "text-primary" : "text-foreground")}>
                          {date.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Hours and Slots Grid */}
              <div className="flex flex-1">
                {/* Time labels */}
                <div className="w-20 flex-shrink-0 border-r border-border bg-muted/10">
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <div key={hour} className="h-20 border-b border-border flex items-start justify-center pt-2">
                      <span className="text-xs text-muted-foreground font-light">{String(hour).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>

                {/* Slot grid */}
                <div className="flex flex-1 divide-x divide-border">
                  {getWeekDays(currentDate).map((date, dayOfWeek) => {
                    // Track rendered event IDs to prevent duplicates
                    const renderedEventIds = new Set<string>()

                    return (
                      <div key={date.toISOString()} className="flex-1 relative">
                        {/* Background grid lines */}
                        <div className="absolute inset-0 divide-y divide-border/50 pointer-events-none">
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <div key={hour} className="h-20" />
                          ))}
                        </div>

                        {/* Events layer - absolute positioning for multi-block spanning */}
                        <div className="relative">
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                            // Get events starting at this hour
                            const eventsStartingHere = events.filter((event: CalendarEvent) => {
                              const eventDay = event.startTime.getDay()
                              const eventHour = event.startTime.getHours()
                              return eventDay === dayOfWeek && eventHour === hour
                            })

                            return (
                              <div key={`${date.toISOString()}-${hour}`}>
                                {eventsStartingHere.map((event) => {
                                  if (renderedEventIds.has(event.id)) return null

                                  renderedEventIds.add(event.id)
                                  const startHour = event.startTime.getHours()
                                  const endHour = event.endTime.getHours()
                                  const durationHours = endHour - startHour

                                  return (
                                    <div
                                      key={event.id}
                                      onClick={() => setSelectedEvent(event)}
                                      style={{
                                        position: 'absolute',
                                        top: `${startHour * 80}px`, // 80px per hour (h-20)
                                        left: '4px',
                                        right: '4px',
                                        height: `${durationHours * 80}px`,
                                        zIndex: 5,
                                      }}
                                      className={cn(
                                        'rounded cursor-pointer hover:opacity-90 transition text-white px-3 py-2 text-xs overflow-visible flex flex-col justify-start gap-1 border-l-4 border-b-2 border-green-700 bg-green-600',
                                      )}
                                      title={`${event.title}\n${event.description}`}
                                    >
                                      <div className="font-semibold truncate leading-tight">{event.title}</div>
                                      <div className="text-xs opacity-90 truncate leading-tight">
                                        {event.startTime.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}{' '}
                                        -{' '}
                                        {event.endTime.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </div>
                                      {durationHours >= 2 && (
                                        <div className="text-xs opacity-85 truncate leading-tight">{event.description}</div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>

                        {/* Hour cells for hover effects */}
                        <div className="relative">
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <div
                              key={`cell-${date.toISOString()}-${hour}`}
                              className="h-20 bg-card hover:bg-muted/5 transition relative group border-b border-border/50"
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
              >
                <span className="sr-only">Close</span>✕
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <h4 className="text-lg font-semibold">{selectedEvent.title}</h4>
              </div>
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground mb-4">{selectedEvent.description}</p>
              )}
              <div className="space-y-2 text-sm mb-6">
                <p>
                  <span className="text-muted-foreground">Start:</span> {selectedEvent.startTime.toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">End:</span> {selectedEvent.endTime.toLocaleString()}
                </p>
              </div>
              <Button onClick={() => handleDeleteEvent(selectedEvent.id)} variant="destructive" className="w-full">
                Delete Event
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleAdminLogin}
        className="fixed bottom-6 left-6 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors duration-200 z-40"
      >
        Login as Admin
      </button>

      {isLoginOpen && <LoginModal onSuccess={handleLoginSuccess} onClose={() => setIsLoginOpen(false)} />}
    </div>
  )
}
