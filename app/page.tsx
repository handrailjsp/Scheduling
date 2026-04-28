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

// Layout Constants
export const SCHEDULE_START_HOUR = 8
export const SCHEDULE_END_HOUR = 19
const HOUR_HEIGHT = 100        // Vertical pixels per hour
const SLOT_FIXED_WIDTH = 160   // Every block is exactly this wide
const SLOT_GAP = 4             // Space between side-by-side blocks

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
  professors?: { name: string }
}

const COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d"]

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const gridHours = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR }, (_, i) => i + SCHEDULE_START_HOUR)

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      setIsRefreshing(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/timetable`)
      const data = await res.json()
      const slots: ScheduleSlot[] = Array.isArray(data) ? data : (data.data || [])
      const colorMap = new Map(); let colorIdx = 0;
      
      setEvents(slots.map(s => {
        if (!colorMap.has(s.professor_id)) colorMap.set(s.professor_id, COLORS[colorIdx++ % COLORS.length])
        const days = getWeekDays(currentDate); 
        const day = days[s.day_of_week]
        if (!day) return null
        
        const start = new Date(day); start.setHours(s.hour, 0, 0, 0)
        const end = new Date(day); end.setHours(s.end_hour || s.hour + 1, 0, 0, 0)
        
        return { 
          id: String(s.id), 
          title: s.professors?.name || "Unknown", 
          description: `${s.subject || "No Subject"} — ${s.room || "TBD"}`, 
          startTime: start, 
          endTime: end, 
          hex: colorMap.get(s.professor_id) 
        }
      }).filter((e): e is CalendarEvent => e !== null))
    } catch { setEvents([]) } finally { 
      setLoading(false) 
      setIsRefreshing(false)
    }
  }

  useEffect(() => { fetchSchedule() }, [currentDate])
  useScheduleRefresh({ enabled: true, interval: 10000, onRefresh: fetchSchedule })

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="w-80 flex-shrink-0 border-r bg-card z-50">
        <SidebarNavigation currentDate={currentDate} onSelectDate={setCurrentDate} view={view} onViewChange={setView} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b px-8 py-3 flex items-center justify-between bg-card shadow-sm z-40">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSchedule} variant="ghost" size="icon">
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button onClick={() => setCurrentDate(new Date())} variant="outline" className="text-xs font-bold">Today</Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="inline-flex flex-col min-w-full">
            {(() => {
              const weekDays = getWeekDays(currentDate)
              
              // 1. Calculate how many lanes each day needs to determine column width
              const dayData = weekDays.map(date => {
                const dayEvents = (events || []).filter(e => e.startTime.toDateString() === date.toDateString())
                
                // Sort by start time then duration
                const sorted = [...dayEvents].sort((a, b) => {
                  if (a.startTime.getTime() !== b.startTime.getTime()) return a.startTime.getTime() - b.startTime.getTime()
                  return b.endTime.getTime() - a.endTime.getTime()
                })

                // Assign Lanes
                const eventLanes = new Map<string, number>()
                const laneEndTimes: number[] = []

                sorted.forEach(event => {
                  let assignedLane = -1
                  for (let i = 0; i < laneEndTimes.length; i++) {
                    if (event.startTime.getTime() >= laneEndTimes[i]) {
                      assignedLane = i
                      laneEndTimes[i] = event.endTime.getTime()
                      break
                    }
                  }
                  if (assignedLane === -1) {
                    assignedLane = laneEndTimes.length
                    laneEndTimes.push(event.endTime.getTime())
                  }
                  eventLanes.set(event.id, assignedLane)
                })

                const width = Math.max(200, laneEndTimes.length * (SLOT_FIXED_WIDTH + SLOT_GAP) + 20)
                return { sorted, eventLanes, width }
              })

              return (
                <>
                  {/* Sticky Header */}
                  <div className="flex sticky top-0 bg-background z-30 border-b">
                    <div className="w-20 flex-shrink-0 border-r bg-muted/5" />
                    {weekDays.map((date, i) => (
                      <div key={i} style={{ width: dayData[i].width }} className="flex-shrink-0 text-center py-4 border-r last:border-0 bg-background transition-all duration-200">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                        <p className={cn("text-lg font-black", date.toDateString() === new Date().toDateString() && "text-primary")}>{date.getDate()}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grid Body */}
                  <div className="flex">
                    <div className="w-20 flex-shrink-0 border-r bg-background sticky left-0 z-20">
                      {gridHours.map(hr => (
                        <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b text-center pt-2 text-[10px] font-black text-muted-foreground uppercase">
                          {hr}:00
                        </div>
                      ))}
                    </div>

                    <div className="flex relative divide-x">
                      {weekDays.map((_, dayIdx) => (
                        <div key={dayIdx} style={{ width: dayData[dayIdx].width }} className="flex-shrink-0 relative bg-grid-pattern transition-all duration-200">
                          {gridHours.map(hr => <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b border-muted/20" />)}
                          
                          {dayData[dayIdx].sorted.map(event => {
                            const start = event.startTime.getHours() + (event.startTime.getMinutes() / 60)
                            const end = event.endTime.getHours() + (event.endTime.getMinutes() / 60)
                            const laneIdx = dayData[dayIdx].eventLanes.get(event.id) || 0

                            return (
                              <div key={event.id} 
                                className="absolute rounded-lg text-white shadow-lg z-10 border border-black/10 overflow-hidden transition-all hover:scale-[1.02] hover:z-30"
                                style={{
                                  top: `${(start - SCHEDULE_START_HOUR) * HOUR_HEIGHT + 4}px`,
                                  height: `${(end - start) * HOUR_HEIGHT - 8}px`,
                                  width: `${SLOT_FIXED_WIDTH}px`,
                                  left: `${laneIdx * (SLOT_FIXED_WIDTH + SLOT_GAP) + 8}px`,
                                  backgroundColor: event.hex,
                                  borderLeft: `5px solid rgba(0,0,0,0.3)`
                                }}>
                                <div className="p-2 h-full flex flex-col justify-start">
                                  <p className="font-black text-[11px] uppercase truncate leading-tight mb-1">{event.title}</p>
                                  <p className="text-[10px] font-bold opacity-90 line-clamp-2 leading-none">{event.description}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px);
          background-size: ${SLOT_FIXED_WIDTH + SLOT_GAP}px 100%;
        }
      `}</style>

      <Button onClick={() => setIsLoginOpen(true)} variant="secondary" className="fixed bottom-6 right-6 shadow-2xl z-50">Admin Portal</Button>
      {isLoginOpen && <LoginModal onSuccess={() => router.push("/admin")} onClose={() => setIsLoginOpen(false)} />}
    </div>
  )
}