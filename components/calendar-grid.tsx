"use client"

import { useMemo } from "react"
import { getWeekDaysNoSunday } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  hex?: string
}

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[]
  view: "month" | "week" | "day"
  onSelectEvent: (event: CalendarEvent) => void
  onSelectDate: (date: Date) => void
}

export const COLORS = [
  "#dc2626", "#2563eb", "#16a34a", "#d97706",
  "#7c3aed", "#db2777", "#0891b2", "#65a30d",
  "#9a3412", "#1d4ed8", "#15803d", "#b45309",
  "#7e22ce", "#0f766e", "#be123c", "#1e40af",
]

const HOURS_START = 8
const HOURS_END = 19

export default function CalendarGrid({
  currentDate,
  events,
  view,
  onSelectEvent,
}: CalendarGridProps) {
  const weekDays = getWeekDaysNoSunday(currentDate)
  const hours = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => i + HOURS_START)

  const columnWidths = useMemo(() => {
    return weekDays.map(date => {
      const dayEvents = events.filter(e => new Date(e.startTime).toDateString() === date.toDateString())
      let maxOverlap = 1
      
      dayEvents.forEach(e1 => {
        const s1 = new Date(e1.startTime).getTime()
        const e1End = new Date(e1.endTime).getTime()
        const overlapCount = dayEvents.filter(e2 => {
          const s2 = new Date(e2.startTime).getTime()
          const e2End = new Date(e2.endTime).getTime()
          return s2 < e1End && e2End > s1
        }).length
        if (overlapCount > maxOverlap) maxOverlap = overlapCount
      })
      
      return Math.max(250, maxOverlap * 220)
    })
  }, [events, weekDays])

  if (view !== "week") return <div className="p-8 text-center text-muted-foreground font-bold">Month view disabled.</div>

  return (
    <div className="flex flex-col h-full bg-background border rounded-xl">
      <div className="flex-1 overflow-auto bg-muted/5">
        <div className="inline-flex flex-col min-w-max">
          
          {/* Header Row - scrolls with grid */}
          <div className="flex sticky top-0 bg-card z-30 border-b shadow-sm">
            <div className="w-20 flex-shrink-0 border-r bg-muted/10" /> 
            {weekDays.map((date, i) => (
              <div 
                key={date.toISOString()} 
                style={{ width: columnWidths[i] }} 
                className="flex-shrink-0 text-center py-4 border-r last:border-0 bg-card"
              >
                <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={cn("text-lg font-black", date.toDateString() === new Date().toDateString() && "text-primary")}>
                  {date.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex">
            {/* Sticky Time Labels */}
            <div className="w-20 flex-shrink-0 border-r bg-card sticky left-0 z-20">
              {hours.map(hour => (
                <div key={hour} className="h-32 border-b flex items-start justify-center pt-3 border-muted/30">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                    {hour >= 12 ? `${hour === 12 ? 12 : hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event Columns - expands horizontally */}
            <div className="flex relative divide-x divide-muted/30 bg-grid-pattern">
              {weekDays.map((date, i) => {
                const dayEvents = events.filter(e => new Date(e.startTime).toDateString() === date.toDateString())
                
                return (
                  <div 
                    key={date.toISOString()} 
                    style={{ width: columnWidths[i] }} 
                    className="relative min-h-full flex-shrink-0"
                  >
                    {hours.map(h => (
                      <div key={h} className="absolute w-full border-b h-32 pointer-events-none border-muted/20" style={{ top: (h - HOURS_START) * 128 }} />
                    ))}

                    {dayEvents.map(event => {
                      const start = new Date(event.startTime).getHours()
                      const end = new Date(event.endTime).getHours()
                      
                      const overlapping = dayEvents.filter(ev => {
                        const s = new Date(ev.startTime).getHours()
                        const e = new Date(ev.endTime).getHours()
                        return s < end && e > start
                      })

                      const count = overlapping.length
                      const idx = overlapping.findIndex(ev => ev.id === event.id)
                      const hex = event.hex ?? COLORS[0]

                      return (
                        <div
                          key={event.id}
                          onClick={() => onSelectEvent(event)}
                          className="absolute rounded-lg text-white cursor-pointer z-10 shadow-lg p-4 border border-black/10 transition-all hover:scale-[1.01] hover:z-20 overflow-hidden"
                          style={{
                            top: `${(start - HOURS_START) * 128 + 4}px`,
                            height: `${(end - start) * 128 - 8}px`,
                            width: `calc(${100 / count}% - 8px)`,
                            left: `calc(${(idx * 100) / count}% + 4px)`,
                            backgroundColor: hex,
                            borderLeft: `6px solid rgba(0,0,0,0.2)`,
                          }}
                        >
                          <div className="flex flex-col h-full pointer-events-none">
                            <p className="font-black uppercase text-xs leading-none mb-1">
                              {event.title}
                            </p>
                            <p className="opacity-90 text-[10px] font-bold uppercase truncate">
                              {event.description}
                            </p>
                            <div className="mt-auto flex justify-between items-end">
                              <span className="text-[9px] font-black opacity-40">
                                {start}:00 - {end}:00
                              </span>
                            </div>
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
      </div>
    </div>
  )
}