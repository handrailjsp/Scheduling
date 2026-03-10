"use client"

import { getMonthDays, getWeekDaysNoSunday } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

// Local interface so you don't need to import it from elsewhere
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color?: string
}

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[] // Changed from 'timetableSlots' to 'events' to match common naming
  view: "month" | "week" | "day"
  onSelectEvent: (event: CalendarEvent) => void
  onSelectDate: (date: Date) => void
}

export default function CalendarGrid({ currentDate, events, view, onSelectEvent, onSelectDate }: CalendarGridProps) {
  const monthDays = getMonthDays(currentDate)
  const weekDays = getWeekDaysNoSunday(currentDate) 

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const today = new Date()

  if (view === "month") {
    const currentMonthDays = monthDays.filter((date) => 
      date.getMonth() === currentDate.getMonth() && date.getDay() !== 0 
    )

    return (
      <div className="p-8">
        <div className="grid grid-cols-6 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-4">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: monthDays[0].getDay() === 0 ? 5 : monthDays[0].getDay() - 1 }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-32 p-3" />
          ))}
          {currentMonthDays.map((date, index) => {
            const dateEvents = getEventsForDate(date)
            return (
              <div
                key={index}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "min-h-32 p-3 rounded border cursor-pointer transition hover:bg-muted/50 bg-card border-border",
                  date.toDateString() === today.toDateString() && "bg-primary/5 border-primary/30"
                )}
              >
                <div className="text-sm font-semibold mb-2">{date.getDate()}</div>
                <div className="space-y-1">
                  {dateEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                      className={cn("text-[10px] px-2 py-1 rounded text-white truncate", event.color || "bg-primary")}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (view === "week") {
    const hours = Array.from({ length: 15 }, (_, i) => i + 7) 
    return (
      <div className="flex flex-col h-full">
        <div className="flex border-b sticky top-0 bg-background z-10">
          <div className="w-20 border-r" />
          <div className="flex flex-1 divide-x">
            {weekDays.map((date) => (
              <div key={date.toISOString()} className="flex-1 text-center py-4">
                <p className="text-[10px] uppercase text-muted-foreground">{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className="text-lg font-bold">{date.getDate()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-auto">
          <div className="w-20 border-r bg-muted/10">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b flex items-start justify-center pt-2">
                <span className="text-[10px] text-muted-foreground">{hour % 12 || 12}{hour >= 12 ? 'pm' : 'am'}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-1 divide-x relative">
            {weekDays.map((date) => (
              <div key={date.toISOString()} className="flex-1 relative divide-y divide-border/50">
                {hours.map((hour) => (
                  <div key={hour} className="h-20" />
                ))}
                {events
                  .filter(e => new Date(e.startTime).toDateString() === date.toDateString())
                  .map(event => {
                    const start = new Date(event.startTime).getHours()
                    const end = new Date(event.endTime).getHours()
                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={cn("absolute left-1 right-1 rounded p-2 text-white text-[10px] cursor-pointer z-20", event.color || "bg-primary")}
                        style={{ 
                          top: `${(start - 7) * 80 + 4}px`, 
                          height: `${(end - start) * 80 - 8}px` 
                        }}
                      >
                        <p className="font-bold">{event.title}</p>
                        <p className="opacity-80">{event.description}</p>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return <div className="p-8">Select a view</div>
}