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
  hex: string
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

const COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#9a3412",
  "#1d4ed8",
  "#15803d",
  "#b45309",
  "#7e22ce",
  "#0f766e",
  "#be123c",
  "#1e40af",
]

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildColorMap(slots: ScheduleSlot[]): Map<string, string> {
  const map = new Map<string, string>()
  let index = 0
  for (const slot of slots) {
    if (!map.has(slot.professor_id)) {
      map.set(slot.professor_id, COLORS[index % COLORS.length])
      index++
    }
  }
  return map
}

function mapSlot(
  slot: ScheduleSlot,
  ref: Date,
  colorMap: Map<string, string>,
): CalendarEvent | null {
  try {
    const days = getWeekDays(ref)
    const day  = days[slot.day_of_week]
    if (!day) return null

    const startH = slot.hour
    const endH   = slot.end_hour ?? startH + 1

    const startTime = new Date(day)
    startTime.setHours(startH, 0, 0, 0)

    const endTime = new Date(day)
    endTime.setHours(endH, 0, 0, 0)

    const name = slot.professors?.name || "Unknown"
    const room = slot.room && slot.room !== "TBD" && slot.room !== "PENDING"
      ? slot.room
      : "Room TBD"

    return {
      id:          String(slot.id),
      title:       name,
      description: `${slot.subject || "No Subject"} — ${room}`,
      startTime,
      endTime,
      hex:         colorMap.get(slot.professor_id) ?? COLORS[0],
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
      const data  = await res.json()
      const slots: ScheduleSlot[] = Array.isArray(data) ? data : (data.data || [])

      const colorMap = buildColorMap(slots)

      setEvents(
        slots
          .map(s => mapSlot(s, currentDate, colorMap))
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <SidebarNavigation
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
        view={view}
        onViewChange={setView}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-8 py-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setIsRefreshing(true)
                await fetchSchedule()
                setIsRefreshing(false)
              }}
              variant="ghost"
              size="icon"
            >
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button onClick={() => nudge(-7)} variant="ghost" size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setCurrentDate(new Date())}
              variant="outline"
              className="text-xs"
            >
              Today
            </Button>
            <Button onClick={() => nudge(7)} variant="ghost" size="icon">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
              Loading Schedule...
            </div>
          ) : (
            <div className="flex flex-col h-full min-w-[1000px]">
              <div className="flex border-b sticky top-0 bg-background z-30 shadow-sm">
                <div className="w-20 border-r" />
                {getWeekDays(currentDate).map(date => (
                  <div
                    key={date.toISOString()}
                    className="flex-1 text-center py-4 border-r last:border-0"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className={cn(
                      "text-lg font-black",
                      date.toDateString() === new Date().toDateString() && "text-primary",
                    )}>
                      {date.getDate()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-1">
                <div className="w-20 border-r bg-muted/10">
                  {gridHours.map(hr => (
                    <div
                      key={hr}
                      className="h-20 border-b text-center pt-2 text-[11px] font-medium text-muted-foreground"
                    >
                      {String(hr).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 relative divide-x border-r">
                  {getWeekDays(currentDate).map((dayDate, dayIdx) => {
                    const dayEvents = events.filter(
                      e => e.startTime.toDateString() === dayDate.toDateString(),
                    )

                    return (
                      <div key={dayIdx} className="flex-1 relative">
                        {dayEvents.map(event => {
                          const start = event.startTime.getHours()
                          const end   = event.endTime.getHours()

                          const overlapping = dayEvents.filter(ev => {
                            const s = ev.startTime.getHours()
                            const e = ev.endTime.getHours()
                            return s < end && e > start
                          })

                          const count      = overlapping.length
                          const idx        = overlapping.findIndex(ev => ev.id === event.id)
                          const hasOverlap = count > 1

                          return (
                            <div
                              key={event.id}
                              className="absolute rounded-lg text-white text-[11px] shadow-md z-20 overflow-hidden"
                              style={{
                                top:    `${(start - SCHEDULE_START_HOUR) * 80 + 4}px`,
                                height: `${(end - start) * 80 - 8}px`,
                                width:  `calc(${100 / count}% - 6px)`,
                                left:   `calc(${(idx * 100) / count}% + 3px)`,
                                backgroundColor: hexToRgba(event.hex, hasOverlap ? 0.70 : 1),
                                borderLeft: `5px solid ${hexToRgba(event.hex, 0.40)}`,
                                outline: hasOverlap ? `2px solid white` : "none",
                                outlineOffset: "-2px",
                              }}
                            >
                              <div className="p-2 h-full flex flex-col">
                                <p className="font-black truncate leading-none mb-1 uppercase text-[11px]">
                                  {event.title}
                                </p>
                                <p className="opacity-95 font-medium line-clamp-2 leading-tight text-[10px]">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => setIsLoginOpen(true)}
        variant="secondary"
        className="fixed bottom-6 right-6 shadow-2xl border border-primary/20"
      >
        Admin Portal
      </Button>

      {isLoginOpen && (
        <LoginModal
          onSuccess={() => router.push("/admin")}
          onClose={() => setIsLoginOpen(false)}
        />
      )}
    </div>
  )
}