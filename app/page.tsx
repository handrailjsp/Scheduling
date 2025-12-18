"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { getWeekDays } from "@/lib/date-utils"
import SidebarNavigation from "@/components/sidebar-navigation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import LoginModal from "@/components/login-modal"
import { cn } from "@/lib/utils"

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

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 23))
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fetch latest approved schedule on mount
  useEffect(() => {
    fetchLatestSchedule()
  }, [])

  const fetchLatestSchedule = async () => {
    try {
      setLoading(true)
      
      console.log("Fetching latest approved generated schedule...")
      // Fetch latest approved generated schedule
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const schedulesResponse = await fetch(`${apiUrl}/api/schedules`)
      const schedulesResult = await schedulesResponse.json()
      
      if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
        // Find the latest approved schedule
        const approvedSchedules = schedulesResult.data.filter((s: any) => s.status === 'approved')
        
        if (approvedSchedules.length > 0) {
          const latestSchedule = approvedSchedules[0] // Already sorted by generation_date desc
          console.log(`Using approved schedule ID: ${latestSchedule.id}`)
          
          // Fetch the schedule details
          const detailsResponse = await fetch(`${apiUrl}/api/schedules/${latestSchedule.id}`)
          const detailsResult = await detailsResponse.json()
          
          console.log("Schedule details response:", detailsResult)
          
          if (detailsResult.success && detailsResult.data && detailsResult.data.slots) {
            const slots = detailsResult.data.slots
            console.log(`Processing ${slots.length} generated schedule slots...`)
            
            // Filter to show only AC room slots (322, 323, 324) in main calendar view
            const AC_ROOMS = [322, 323, 324]
            const acSlots = slots.filter((slot: any) => AC_ROOMS.includes(slot.room_id))
            console.log(`Filtered to ${acSlots.length} AC room slots for main calendar view`)
            
            // Convert slots to calendar events
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
              
              // Color code by professor
              const colors = [
                "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500",
                "bg-red-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
                "bg-orange-500", "bg-cyan-500"
              ]
              const color = colors[slot.professor_id % colors.length]
              
              return {
                id: slot.id.toString(),
                title: slot.professors?.name || `Professor ${slot.professor_id}`,
                description: `${slot.subject || "Course"} - Room ${slot.room_id}`,
                startTime,
                endTime,
                color
              }
            })
            
            console.log("Calendar events created:", calendarEvents.length)
            setEvents(calendarEvents)
            return
          }
        }
      }
      
      console.log("No approved schedule found, calendar will be empty")
      setEvents([])
    } catch (error) {
      console.error("Error fetching schedule:", error)
      // Set empty events if fetch fails
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

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
                  {getWeekDays(currentDate).map((date, dayOfWeek) => (
                    <div key={date.toISOString()} className="flex-1 divide-y divide-border/50">
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                        // Find events for this time slot
                        const eventsAtTime = events.filter((event: CalendarEvent) => {
                          const eventDay = event.startTime.getDay()
                          const eventHour = event.startTime.getHours()
                          return eventDay === dayOfWeek && eventHour === hour
                        })

                        const event = eventsAtTime[0]
                        const isInSpan = eventsAtTime.some((e: CalendarEvent) => {
                          const eventHour = e.startTime.getHours()
                          const eventEndHour = e.endTime.getHours()
                          return hour > eventHour && hour < eventEndHour
                        })

                        return (
                          <div
                            key={`${date.toISOString()}-${hour}`}
                            className={cn(
                              "h-20 bg-card hover:bg-muted/5 transition relative group cursor-pointer flex items-center justify-center",
                              (event || isInSpan) && "bg-blue-100 dark:bg-blue-900/20 border-l-4 border-blue-600",
                            )}
                            onClick={() => event && setSelectedEvent(event)}
                          >
                            {event && (
                              <div className="w-full h-full p-2 flex flex-col justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-foreground truncate">{event.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                                  <p className="text-xs text-primary mt-1">AC Room</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
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
                <div className={`w-3 h-3 rounded-full ${selectedEvent.color}`}></div>
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
