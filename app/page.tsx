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

export const SCHEDULE_START_HOUR = 8
export const SCHEDULE_END_HOUR   = 19

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  color: string
}

interface ScheduleSlot {
  id: string
  professor_id: string
  subject?: string
  room?: string
  day_of_week: number
  hour: number
  end_hour: number
  needs_ac?: boolean
  professors?: {
    id: string
    name: string
    title: string
    department: string
  }
}

function mapSlot(slot: ScheduleSlot, ref: Date): CalendarEvent | null {
  try {
    const days = getWeekDays(ref)
    const day  = days[slot.day_of_week]
    if (!day) return null

    const startH = slot.hour
    const endH   = slot.end_hour ?? (startH + 1)

    if (startH < SCHEDULE_START_HOUR || endH > SCHEDULE_END_HOUR) return null

    const startTime = new Date(day)
    startTime.setHours(startH, 0, 0, 0)

    const endTime = new Date(day)
    endTime.setHours(endH, 0, 0, 0)

    const name = slot.professors?.name || "Unknown Professor"
    const room = slot.room && slot.room !== "TBD" && slot.room !== "PENDING"
      ? slot.room
      : "Room TBD"

    return {
      id:          String(slot.id),
      title:       name,
      description: `${slot.subject || "No Subject"} — ${room}`,
      startTime,
      endTime,
      color:       slot.needs_ac ? "bg-blue-600" : "bg-green-600",
    }
  } catch {
    return null
  }
}

export default function CalendarApp() {
  const [currentDate,  setCurrentDate]  = useState(new Date())
  const [view,         setView]          = useState<"month" | "week" | "day">("week")
  const [events,       setEvents]        = useState<CalendarEvent[]>([])
  const [isLoginOpen,  setIsLoginOpen]  = useState(false)
  const [loading,      setLoading]       = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const gridHours = Array.from(
    { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR },
    (_, i) => i + SCHEDULE_START_HOUR,
  )

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/timetable`)
      if (!res.ok) throw new Error("fetch failed")
      const data = await res.json()
      const slots: ScheduleSlot[] = Array.isArray(data) ? data : (data.data || [])
      setEvents(
        slots
          .map(s => mapSlot(s, currentDate))
          .filter((e): e is CalendarEvent => e !== null),
      )
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedule()
    const handler = (e: StorageEvent) => {
      if (e.key === "schedule_updated") fetchSchedule()
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [currentDate])

  useScheduleRefresh({ enabled: true, interval: 10000, onRefresh: fetchSchedule })

  const nudge = (n: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + n)
    setCurrentDate(d)
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNavigation
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
        view={view}
        onViewChange={setView}
      />

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
              <Button
                onClick={async () => { setIsRefreshing(true); await fetchSchedule(); setIsRefreshing(false) }}
                disabled={isRefreshing}
                variant="ghost"
                size="icon"
              >
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button onClick={() => nudge(-7)} variant="ghost" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={() => setCurrentDate(new Date())} variant="ghost" className="text-xs">
                Today
              </Button>
              <Button onClick={() => nudge(7)} variant="ghost" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-border sticky top-0 bg-background z-10">
                <div className="w-20 border-r border-border" />
                <div className="flex flex-1 divide-x divide-border">
                  {getWeekDays(currentDate).map(date => (
                    <div key={date.toISOString()} className="flex-1 text-center py-4">
                      <div className="text-xs text-muted-foreground font-medium uppercase">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className={cn(
                        "text-lg font-light",
                        date.toDateString() === new Date().toDateString() && "text-primary",
                      )}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-1">
                <div className="w-20 border-r border-border bg-muted/5">
                  {gridHours.map(hr => (
                    <div key={hr} className="h-20 border-b border-border text-center pt-2">
                      <span className="text-xs text-muted-foreground font-light">
                        {String(hr).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 divide-x divide-border relative">
                  {getWeekDays(currentDate).map((dayDate, dayIdx) => (
                    <div key={dayIdx} className="flex-1 relative bg-card/50">
                      {events
                        .filter(e => e.startTime.toDateString() === dayDate.toDateString())
                        .map(event => {
                          const s = event.startTime.getHours()
                          const e = event.endTime.getHours()
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "absolute left-1 right-1 rounded border-l-4 p-2 text-white text-xs z-20",
                                event.color,
                                event.color === "bg-blue-600" ? "border-blue-800" : "border-green-800",
                              )}
                              style={{
                                top:    `${(s - SCHEDULE_START_HOUR) * 80}px`,
                                height: `${(e - s) * 80}px`,
                              }}
                            >
                              <p className="font-bold truncate">{event.title}</p>
                              <p className="opacity-90 truncate">{event.description}</p>
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

      <button
        onClick={() => setIsLoginOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded bg-background border border-border shadow-sm"
      >
        Admin Portal
      </button>

      {isLoginOpen && (
        <LoginModal
          onSuccess={() => router.push("/admin")}
          onClose={() => setIsLoginOpen(false)}
        />
      )}
    </div>
  )
}