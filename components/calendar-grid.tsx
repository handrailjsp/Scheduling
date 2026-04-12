"use client"

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

export function buildColorMap(events: CalendarEvent[]): Map<string, string> {
  const map   = new Map<string, string>()
  let   index = 0
  for (const event of events) {
    const key = event.id.split("-")[0]
    if (!map.has(key)) {
      map.set(key, COLORS[index % COLORS.length])
      index++
    }
  }
  return map
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const HOURS_START = 8
const HOURS_END   = 19

export default function CalendarGrid({
  currentDate,
  events,
  view,
  onSelectEvent,
}: CalendarGridProps) {
  const weekDays = getWeekDaysNoSunday(currentDate)
  const hours    = Array.from(
    { length: HOURS_END - HOURS_START },
    (_, i) => i + HOURS_START,
  )

  if (view !== "week") {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Month view is not available.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex sticky top-0 bg-card z-30 border-b shadow-sm">
        <div className="w-20 border-r" />
        {weekDays.map(date => (
          <div key={date.toISOString()} className="flex-1 text-center py-3 border-r last:border-0">
            <p className="text-[10px] uppercase text-muted-foreground font-black">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p className={cn(
              "text-sm font-bold",
              date.toDateString() === new Date().toDateString() && "text-primary",
            )}>
              {date.getDate()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-auto">
        <div className="w-20 border-r bg-muted/5">
          {hours.map(hour => (
            <div key={hour} className="h-20 border-b flex items-start justify-center pt-2">
              <span className="text-[11px] text-muted-foreground font-bold">
                {hour >= 12
                  ? `${hour === 12 ? 12 : hour - 12}pm`
                  : `${hour}am`}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-1 relative divide-x">
          {weekDays.map(date => {
            const dayEvents = events.filter(
              e => new Date(e.startTime).toDateString() === date.toDateString(),
            )

            return (
              <div key={date.toISOString()} className="flex-1 relative">
                {dayEvents.map(event => {
                  const start = new Date(event.startTime).getHours()
                  const end   = new Date(event.endTime).getHours()

                  const overlapping = dayEvents.filter(ev => {
                    const s = new Date(ev.startTime).getHours()
                    const e = new Date(ev.endTime).getHours()
                    return s < end && e > start
                  })

                  const count      = overlapping.length
                  const idx        = overlapping.findIndex(ev => ev.id === event.id)
                  const hasOverlap = count > 1

                  const hex = event.hex ?? COLORS[0]

                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="absolute rounded-md text-white text-[10px] cursor-pointer z-20 shadow-md overflow-hidden hover:scale-[1.02] transition-transform"
                      style={{
                        top:    `${(start - HOURS_START) * 80 + 2}px`,
                        height: `${(end - start) * 80 - 4}px`,
                        width:  `calc(${100 / count}% - 4px)`,
                        left:   `calc(${(idx * 100) / count}% + 2px)`,
                        backgroundColor: hexToRgba(hex, hasOverlap ? 0.70 : 1),
                        borderLeft: `4px solid ${hexToRgba(hex, 0.40)}`,
                        outline: hasOverlap ? "2px solid white" : "none",
                        outlineOffset: "-2px",
                      }}
                    >
                      <div className="p-2 h-full flex flex-col">
                        <p className="font-black truncate uppercase leading-none mb-1">
                          {event.title}
                        </p>
                        <p className="opacity-90 truncate text-[9px] font-medium">
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
  )
}