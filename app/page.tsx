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
  course_id?: number
  subject?: string
  room?: string
  room_id?: number
  day_of_week: number
  start_hour?: number
  hour?: number
  end_hour?: number
  endHour?: number
  professors?: {
    name: string
    title: string
    department: string
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

const mapSlotToEvent = (slot: ScheduleSlot, referenceDate: Date): CalendarEvent | null => {
  try {
    // Determine the date for this specific day of the week
    const weekDays = getWeekDays(referenceDate);
    const eventDate = weekDays[slot.day_of_week];

    if (!eventDate) return null;

    const startH = slot.start_hour ?? slot.hour ?? 0;
    const endH = slot.end_hour ?? slot.endHour ?? (startH + 1);

    const startTime = new Date(eventDate);
    startTime.setHours(startH, 0, 0, 0);

    const endTime = new Date(eventDate);
    endTime.setHours(endH, 0, 0, 0);

    const professorName = slot.professors?.name || `Prof ID: ${slot.professor_id}`;
    const subject = slot.subject || "No Subject";
    const room = slot.room || slot.room_id || "TBA";

    return {
      id: String(slot.id),
      title: professorName,
      description: `${subject} - Room ${room}`,
      startTime,
      endTime,
      color: "bg-green-600",
    }
  } catch (error) {
    console.error('Error mapping slot:', error);
    return null;
  }
}

export default function CalendarApp() {
  // FIX: Default to today's date instead of Nov 2025
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const fetchLatestSchedule = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Fetching from the unified timetable endpoint
      const response = await fetch(`${apiUrl}/api/timetable`)
      if (!response.ok) throw new Error("Network response was not ok")
      
      const data = await response.json()
      
      // Handle both raw array and wrapped {success, data} responses
      const slots: ScheduleSlot[] = Array.isArray(data) ? data : data.data || []

      const calendarEvents = slots
        .map(slot => mapSlotToEvent(slot, currentDate))
        .filter((e): e is CalendarEvent => e !== null)

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Fetch error:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatestSchedule()
    const handler = (e: StorageEvent) => {
      if (e.key === 'schedule_updated') fetchLatestSchedule()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [currentDate])

  useScheduleRefresh({
    enabled: true,
    interval: 10000,
    onRefresh: fetchLatestSchedule,
  })

  const handlePreviousWeek = () => {
    const prev = new Date(currentDate)
    prev.setDate(currentDate.getDate() - 7)
    setCurrentDate(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentDate)
    next.setDate(currentDate.getDate() + 7)
    setCurrentDate(next)
  }

  const handleToday = () => setCurrentDate(new Date())
  
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await fetchLatestSchedule()
    setIsRefreshing(false)
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNavigation currentDate={currentDate} onSelectDate={setCurrentDate} view={view} onViewChange={setView} />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-sm font-light text-muted-foreground tracking-wide uppercase">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleManualRefresh} disabled={isRefreshing} variant="ghost" size="icon">
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button onClick={handlePreviousWeek} variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
              <Button onClick={handleToday} variant="ghost" className="text-xs">Today</Button>
              <Button onClick={handleNextWeek} variant="ghost" size="icon"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Updating schedule...</p></div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-border sticky top-0 bg-background z-10">
                <div className="w-20 border-r border-border"></div>
                <div className="flex flex-1 divide-x divide-border">
                  {getWeekDays(currentDate).map((date) => (
                    <div key={date.toISOString()} className="flex-1 text-center py-4">
                      <div className="text-xs text-muted-foreground font-medium uppercase">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className={cn("text-lg font-light", date.toDateString() === new Date().toDateString() && "text-primary")}>{date.getDate()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-1">
                <div className="w-20 border-r border-border bg-muted/5">
                  {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                    <div key={hour} className="h-20 border-b border-border text-center pt-2">
                      <span className="text-xs text-muted-foreground font-light">{String(hour).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 divide-x divide-border relative">
                  {getWeekDays(currentDate).map((dayDate, dayIdx) => (
                    <div key={dayIdx} className="flex-1 relative bg-card/50">
                      {events
                        .filter(e => e.startTime.toDateString() === dayDate.toDateString())
                        .map(event => {
                          const start = event.startTime.getHours();
                          const end = event.endTime.getHours();
                          return (
                            <div
                              key={event.id}
                              className={cn("absolute left-1 right-1 rounded border-l-4 border-green-700 p-2 text-white text-xs z-20", event.color)}
                              style={{ top: `${(start - 7) * 80}px`, height: `${(end - start) * 80}px` }}
                            >
                              <p className="font-bold">{event.title}</p>
                              <p className="opacity-90">{event.description}</p>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <button onClick={() => setIsLoginOpen(true)} className="fixed bottom-6 left-6 px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded">
        Login as Admin
      </button>

      {isLoginOpen && <LoginModal onSuccess={() => router.push("/admin")} onClose={() => setIsLoginOpen(false)} />}
    </div>
  )
}