"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { RotateCw, Calendar, ChevronLeft, Info, X, Filter, Users } from "lucide-react"
import { getWeekDays } from "@/lib/date-utils"
import SidebarNavigation from "@/components/sidebar-navigation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import LoginModal from "@/components/login-modal"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────
const SCHEDULE_START_HOUR = 8
const SCHEDULE_END_HOUR   = 19
const HOUR_HEIGHT         = 100
const SLOT_WIDTH          = 160
const SLOT_GAP            = 4

// ─── SECTIONS LIST ────────────────────────────────────────────────────────────
// REPLACE or ADD entries here when the actual full section list is provided.
const SECTIONS: string[] = [
  "BSCS 1A", "BSCS 1B", "BSCS 2A",
  "BSIT 1A", "BSIT 1B", "BSIT 2A",
  "BSIS 1A", "BSIS 1B", "BSIS 2A",
  // ADD MORE SECTIONS HERE
]

// ─── Gini explanation ─────────────────────────────────────────────────────────
const GINI_METRICS = [
  {
    name: "Workload Gini",
    description: "Measures whether all professors are teaching roughly the same number of hours per week. A low score means no professor is overloaded while another sits idle.",
  },
  {
    name: "Room Gini",
    description: "Measures whether all 8 rooms (322, 324, 326, 328, LAB A–D) are being used equally. A low score means no single room is monopolized while others go empty.",
  },
  {
    name: "AC Fairness Gini",
    description: "Measures whether access to air-conditioned rooms (322, 324, 326, 328) is spread fairly across all professors. Since only 4 of 8 rooms are AC, some classes must be in labs — this score ensures no professor always gets AC while another never does.",
  },
]

const COLORS = [
  "#dc2626","#2563eb","#16a34a","#d97706",
  "#7c3aed","#db2777","#0891b2","#65a30d",
  "#b45309","#0f766e","#7c2d12","#1e3a5f",
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduleSlot {
  id: string
  professor_id: string
  subject?: string
  room?: string
  section?: string
  day_of_week: number
  hour: number
  end_hour: number
  professors?: { name: string; title?: string; department?: string }
}

interface CalendarEvent {
  id: string
  professorName: string
  professorTitle: string
  department: string
  subject: string
  room: string
  section: string
  dayOfWeek: number
  startHour: number
  endHour: number
  startTime: Date
  endTime: Date
  hex: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function fmt12(h: number) {
  const period = h >= 12 ? "PM" : "AM"
  const hour   = h % 12 || 12
  return `${hour}:00 ${period}`
}

function assignLanes(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) =>
    a.startTime.getTime() - b.startTime.getTime() ||
    b.endTime.getTime() - a.endTime.getTime()
  )
  const laneMap      = new Map<string, number>()
  const laneEndTimes: number[] = []
  sorted.forEach(ev => {
    let lane = -1
    for (let i = 0; i < laneEndTimes.length; i++) {
      if (ev.startTime.getTime() >= laneEndTimes[i]) {
        lane = i; laneEndTimes[i] = ev.endTime.getTime(); break
      }
    }
    if (lane === -1) { lane = laneEndTimes.length; laneEndTimes.push(ev.endTime.getTime()) }
    laneMap.set(ev.id, lane)
  })
  return { laneMap, totalLanes: laneEndTimes.length }
}

// ─── Hover Tooltip ────────────────────────────────────────────────────────────
function EventTooltip({ event, visible }: { event: CalendarEvent; visible: boolean }) {
  return (
    <div className={cn(
      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 pointer-events-none transition-all duration-150",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
    )}>
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-[11px] space-y-1.5">
        <div className="font-black uppercase text-[10px] tracking-widest text-white/60 border-b border-white/10 pb-1.5">
          Class Details
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-2">
            <span className="text-white/60">Professor</span>
            <span className="font-bold text-right">{event.professorName}</span>
          </div>
          {event.professorTitle && (
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Title</span>
              <span className="font-medium text-right">{event.professorTitle}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-white/60">Subject</span>
            <span className="font-bold text-right">{event.subject}</span>
          </div>
          {event.section && (
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Section</span>
              <span className="font-bold text-right">{event.section}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-white/60">Room</span>
            <span className="font-bold text-right">{event.room}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/60">Time</span>
            <span className="font-bold text-right">{fmt12(event.startHour)} – {fmt12(event.endHour)}</span>
          </div>
          {event.department && (
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Dept</span>
              <span className="font-medium text-right text-[10px]">{event.department}</span>
            </div>
          )}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({
  event, style, className,
}: {
  event: CalendarEvent
  style: React.CSSProperties
  className?: string
}) {
  const [hovered, setHovered] = useState(false)
  const duration = event.endHour - event.startHour
  const isShort  = duration <= 1

  return (
    <div
      className={cn(
        "absolute rounded-lg text-white shadow-lg z-10 border border-black/10 overflow-visible",
        "transition-all hover:scale-[1.02] hover:z-30 cursor-pointer group",
        className,
      )}
      style={{ ...style, backgroundColor: event.hex, borderLeft: "5px solid rgba(0,0,0,0.3)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <EventTooltip event={event} visible={hovered} />
      <div className="p-2 h-full flex flex-col justify-start gap-0.5 overflow-hidden">
        <p className="font-black text-[11px] uppercase truncate leading-tight">{event.professorName}</p>
        <p className="text-[10px] font-bold opacity-90 truncate">{event.subject}</p>
        {!isShort && event.section && (
          <p className="text-[9px] opacity-80 truncate">{event.section}</p>
        )}
        {!isShort && (
          <p className="text-[9px] opacity-70 truncate">Room {event.room}</p>
        )}
        {!isShort && (
          <p className="text-[9px] opacity-60 mt-auto truncate">{fmt12(event.startHour)} – {fmt12(event.endHour)}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserCalendarPage() {
  const router = useRouter()

  const [currentDate, setCurrentDate]     = useState(new Date())
  const [selectedDay, setSelectedDay]     = useState<Date | null>(null)
  const [allEvents, setAllEvents]         = useState<CalendarEvent[]>([])
  const [professors, setProfessors]       = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading]             = useState(true)
  const [isRefreshing, setIsRefreshing]   = useState(false)
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null)
  const [isLoginOpen, setIsLoginOpen]     = useState(false)
  const [showGiniInfo, setShowGiniInfo]   = useState(false)
  const [filterSection, setFilterSection] = useState<string>("all")
  const [filterProfessor, setFilterProfessor] = useState<string>("all")

  const weekStart = getWeekStart(currentDate)
  const weekDays  = getWeekDays(currentDate)
  const gridHours = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR }, (_, i) => i + SCHEDULE_START_HOUR)
  const today     = new Date()

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSchedule = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setIsRefreshing(true)
      const res  = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/timetable`
      )
      const data = await res.json()
      const slots: ScheduleSlot[] = Array.isArray(data) ? data : (data.data || [])

      const colorMap = new Map<string, string>()
      let colorIdx   = 0
      const profMap  = new Map<string, string>()
      const events: CalendarEvent[] = []

      slots.forEach(s => {
        if (!colorMap.has(s.professor_id))
          colorMap.set(s.professor_id, COLORS[colorIdx++ % COLORS.length])
        const profName = s.professors?.name || "Unknown"
        profMap.set(s.professor_id, profName)

        const day = weekDays[s.day_of_week]
        if (!day || s.hour == null) return

        const start = new Date(day); start.setHours(s.hour, 0, 0, 0)
        const end   = new Date(day); end.setHours(s.end_hour || s.hour + 1, 0, 0, 0)

        events.push({
          id:             String(s.id),
          professorName:  profName,
          professorTitle: s.professors?.title || "",
          department:     s.professors?.department || "",
          subject:        s.subject || "No Subject",
          room:           s.room || "TBD",
          section:        s.section || "",
          dayOfWeek:      s.day_of_week,
          startHour:      s.hour,
          endHour:        s.end_hour || s.hour + 1,
          startTime:      start,
          endTime:        end,
          hex:            colorMap.get(s.professor_id)!,
        })
      })

      setAllEvents(events)
      setProfessors(
        Array.from(profMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setLastUpdated(new Date())
    } catch {
      setAllEvents([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { fetchSchedule() }, [weekStart])

  // Poll every 8 seconds so schedule appears quickly after admin generates
  useEffect(() => {
    const id = setInterval(() => fetchSchedule(true), 8000)
    return () => clearInterval(id)
  }, [weekStart])

  // ── Filtered events ────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const secOk  = filterSection   === "all" || ev.section === filterSection
      const profOk = filterProfessor === "all" || ev.professorName === filterProfessor
      return secOk && profOk
    })
  }, [allEvents, filterSection, filterProfessor])

  // ── Date click → day view ──────────────────────────────────────────────────
  const handleSelectDate = (date: Date) => {
    if (selectedDay && date.toDateString() === selectedDay.toDateString()) {
      setSelectedDay(null)
    } else {
      setSelectedDay(date)
      setCurrentDate(date)
    }
  }

  // ─── Section filter buttons ────────────────────────────────────────────────
  function SectionFilterBar() {
    // Only show sections that actually have events this week
    const activeSections = useMemo(() => {
      const inData = new Set(allEvents.map(e => e.section).filter(Boolean))
      // Show all defined sections but dim ones with no data
      return SECTIONS
    }, [allEvents])

    return (
      <div className="border-b border-border bg-muted/30 px-6 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-shrink-0">
          <Users className="w-3.5 h-3.5" />
          Section
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => setFilterSection("all")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold transition-all border",
              filterSection === "all"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
            )}
          >
            All
          </button>
          {/* ── REPLACE / ADD SECTIONS HERE when full list is provided ── */}
          {activeSections.map(sec => {
            const hasEvents = allEvents.some(e => e.section === sec)
            return (
              <button
                key={sec}
                onClick={() => setFilterSection(sec === filterSection ? "all" : sec)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap",
                  filterSection === sec
                    ? "bg-primary text-white border-primary shadow-sm"
                    : hasEvents
                      ? "bg-background text-foreground border-border hover:border-primary/40"
                      : "bg-background text-muted-foreground/40 border-border/40 cursor-default",
                )}
              >
                {sec}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Gini modal ────────────────────────────────────────────────────────────
  function GiniModal() {
    if (!showGiniInfo) return null
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b bg-muted/10 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold">Understanding the Gini Coefficient</h2>
              <p className="text-[11px] text-muted-foreground">How fairness is measured in this scheduling system</p>
            </div>
            <button onClick={() => setShowGiniInfo(false)} className="text-muted-foreground hover:text-foreground transition p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Gini coefficient measures how fairly a resource is distributed. A score of 0 means perfectly equal; 1 means one person has everything.
            </p>
            <div className="flex items-center gap-3 text-xs text-center">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-black text-green-700 text-lg">0.0</p>
                <p className="text-green-600 font-semibold">Perfectly Equal</p>
                <p className="text-green-500/80 text-[10px]">Everyone gets the same</p>
              </div>
              <div className="text-muted-foreground font-bold">→</div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-black text-red-700 text-lg">1.0</p>
                <p className="text-red-600 font-semibold">Completely Unequal</p>
                <p className="text-red-500/80 text-[10px]">One person has everything</p>
              </div>
            </div>
            {GINI_METRICS.map(m => (
              <div key={m.name} className="border border-border rounded-lg p-4">
                <p className="text-sm font-bold mb-1">{m.name}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{m.description}</p>
              </div>
            ))}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-[12px] text-purple-700 leading-relaxed font-medium">
                The AI tries to minimize all three Gini scores simultaneously while eliminating hard conflicts (same professor in two rooms at once). Lower Gini = fairer schedule.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Day view ──────────────────────────────────────────────────────────────
  if (selectedDay) {
    const dayEvents  = filteredEvents.filter(ev => ev.startTime.toDateString() === selectedDay.toDateString())
    const { laneMap, totalLanes } = assignLanes(dayEvents)
    const colWidth   = Math.max(300, totalLanes * (SLOT_WIDTH + SLOT_GAP) + 24)

    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r bg-card z-50">
          <SidebarNavigation currentDate={currentDate} onSelectDate={handleSelectDate} view="day" onViewChange={() => {}} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b px-6 py-3 flex items-center justify-between bg-card shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button onClick={() => setSelectedDay(null)} variant="ghost" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">
                  {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h2>
                <p className="text-[10px] text-muted-foreground">{dayEvents.length} class{dayEvents.length !== 1 ? "es" : ""} scheduled · hover a block for details</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <select value={filterProfessor} onChange={e => setFilterProfessor(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background outline-none">
                <option value="all">All Faculty</option>
                {professors.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <Button onClick={() => fetchSchedule()} variant="ghost" size="icon">
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          <SectionFilterBar />
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="inline-flex min-w-full">
              <div className="w-20 flex-shrink-0 border-r bg-muted/5 sticky left-0 z-10">
                {gridHours.map(hr => (
                  <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b flex items-start justify-center pt-3">
                    <span className="text-[10px] font-bold text-muted-foreground/60">{fmt12(hr)}</span>
                  </div>
                ))}
              </div>
              <div className="relative flex-shrink-0" style={{ width: colWidth }}>
                <div className="sticky top-0 z-20 bg-background border-b text-center py-3">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {selectedDay.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={cn("text-xl font-bold", selectedDay.toDateString() === today.toDateString() && "text-primary")}>
                    {selectedDay.getDate()}
                  </p>
                </div>
                {gridHours.map(hr => (
                  <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b border-muted/20" />
                ))}
                {dayEvents.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm" style={{ top: 64 }}>
                    No classes scheduled
                  </div>
                ) : dayEvents.map(ev => {
                  const start   = ev.startTime.getHours() + ev.startTime.getMinutes() / 60
                  const end     = ev.endTime.getHours()   + ev.endTime.getMinutes()   / 60
                  const laneIdx = laneMap.get(ev.id) || 0
                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      style={{
                        top:    `${(start - SCHEDULE_START_HOUR) * HOUR_HEIGHT + 4 + 68}px`,
                        height: `${(end - start) * HOUR_HEIGHT - 8}px`,
                        width:  `${SLOT_WIDTH}px`,
                        left:   `${laneIdx * (SLOT_WIDTH + SLOT_GAP) + 8}px`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <BottomButtons />
        <GiniModal />
        {isLoginOpen && <LoginModal onSuccess={() => { setIsLoginOpen(false); router.push("/admin") }} onClose={() => setIsLoginOpen(false)} />}
        <style jsx global>{scrollbarCss}</style>
      </div>
    )
  }

  // ─── Week view ─────────────────────────────────────────────────────────────
  const dayData = weekDays.map(date => {
    const dayEvents = filteredEvents.filter(ev => ev.startTime.toDateString() === date.toDateString())
    const { laneMap, totalLanes } = assignLanes(dayEvents)
    const width = Math.max(180, totalLanes * (SLOT_WIDTH + SLOT_GAP) + 20)
    return { dayEvents, laneMap, width }
  })

  function BottomButtons() {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground text-right px-1">
            Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        <Button onClick={() => setShowGiniInfo(true)} variant="outline" size="sm" className="shadow-lg gap-1.5 text-xs">
          <Info className="w-3.5 h-3.5" />
          What is Gini?
        </Button>
        <Button onClick={() => setIsLoginOpen(true)} variant="secondary" className="shadow-2xl">
          Admin Portal
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="w-80 flex-shrink-0 border-r bg-card z-50">
        <SidebarNavigation currentDate={currentDate} onSelectDate={handleSelectDate} view="week" onViewChange={() => {}} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center justify-between bg-card shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <p className="text-[10px] text-muted-foreground">Click any date to view that day · hover blocks for details</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={filterProfessor}
              onChange={e => setFilterProfessor(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Faculty</option>
              {professors.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <Button onClick={() => fetchSchedule()} variant="ghost" size="icon">
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button onClick={() => setCurrentDate(new Date())} variant="outline" className="text-xs font-bold">Today</Button>
          </div>
        </div>

        {/* Section filter buttons */}
        <SectionFilterBar />

        {/* Week grid */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="inline-flex flex-col min-w-full">
            {/* Sticky day headers */}
            <div className="flex sticky top-0 bg-background z-30 border-b">
              <div className="w-20 flex-shrink-0 border-r bg-muted/5" />
              {weekDays.map((date, i) => {
                const isToday   = date.toDateString() === today.toDateString()
                const hasEvents = dayData[i].dayEvents.length > 0
                return (
                  <div
                    key={i}
                    style={{ width: dayData[i].width }}
                    className="flex-shrink-0 text-center py-3 border-r last:border-0 bg-background cursor-pointer group hover:bg-primary/5 transition-colors"
                    onClick={() => handleSelectDate(date)}
                  >
                    <p className="text-[10px] text-muted-foreground uppercase font-black group-hover:text-primary transition-colors">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className={cn("text-lg font-black transition-colors group-hover:text-primary", isToday && "text-primary")}>
                      {date.getDate()}
                    </p>
                    {hasEvents && <div className="flex justify-center mt-0.5"><span className="w-1 h-1 rounded-full bg-primary/50 inline-block" /></div>}
                  </div>
                )
              })}
            </div>

            {/* Grid body */}
            <div className="flex">
              <div className="w-20 flex-shrink-0 border-r bg-background sticky left-0 z-20">
                {gridHours.map(hr => (
                  <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b text-center pt-2 text-[10px] font-black text-muted-foreground">
                    {fmt12(hr)}
                  </div>
                ))}
              </div>
              <div className="flex relative divide-x">
                {weekDays.map((date, dayIdx) => {
                  const { dayEvents, laneMap, width } = dayData[dayIdx]
                  return (
                    <div key={dayIdx} style={{ width }} className="flex-shrink-0 relative cursor-pointer" onClick={() => handleSelectDate(date)}>
                      {gridHours.map(hr => (
                        <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b border-muted/20" />
                      ))}
                      {dayEvents.map(ev => {
                        const start   = ev.startTime.getHours() + ev.startTime.getMinutes() / 60
                        const end     = ev.endTime.getHours()   + ev.endTime.getMinutes()   / 60
                        const laneIdx = laneMap.get(ev.id) || 0
                        return (
                          <EventCard
                            key={ev.id}
                            event={ev}
                            style={{
                              top:    `${(start - SCHEDULE_START_HOUR) * HOUR_HEIGHT + 4}px`,
                              height: `${(end - start) * HOUR_HEIGHT - 8}px`,
                              width:  `${SLOT_WIDTH}px`,
                              left:   `${laneIdx * (SLOT_WIDTH + SLOT_GAP) + 8}px`,
                            }}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomButtons />
      <GiniModal />
      {isLoginOpen && (
        <LoginModal
          onSuccess={() => { setIsLoginOpen(false); router.push("/admin") }}
          onClose={() => setIsLoginOpen(false)}
        />
      )}
      <style jsx global>{scrollbarCss}</style>
    </div>
  )
}

const scrollbarCss = `
  .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`