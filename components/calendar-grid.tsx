"use client"

import type { CalendarEvent } from "@/app/page"
import { getMonthDays, getWeekDays } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[]
  view: "month" | "week" | "day"
  onSelectEvent: (event: CalendarEvent) => void
  onSelectDate: (date: Date) => void
}

export default function CalendarGrid({ currentDate, events, view, onSelectEvent, onSelectDate }: CalendarGridProps) {
  const monthDays = getMonthDays(currentDate)
  const weekDays = getWeekDays(currentDate)

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
    const currentMonthDays = monthDays.filter((date) => date.getMonth() === currentDate.getMonth())

    return (
      <div className="p-8">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-4">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthDays[0].getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-32 p-3 rounded border border-border/0 bg-transparent" />
          ))}
          {currentMonthDays.map((date, index) => {
            const dateEvents = getEventsForDate(date)
            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()

            return (
              <div
                key={index}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "min-h-32 p-3 rounded border cursor-pointer transition hover:bg-muted/50 bg-card border-border",
                  isToday && "bg-primary/5 border-primary/30",
                )}
              >
                <div
                  className={cn("text-sm font-semibold mb-2", isToday && "text-primary", !isToday && "text-foreground")}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dateEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(event)
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition text-white truncate",
                        event.color,
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dateEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground px-2">+{dateEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (view === "week") {
    const hours = Array.from({ length: 24 }, (_, i) => i)

    const getEventsForDateAndHour = (date: Date, hour: number) => {
      return events.filter((event) => {
        const eventDate = new Date(event.startTime)
        const eventHour = eventDate.getHours()
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear() &&
          eventHour === hour
        )
      })
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex border-b border-border sticky top-0 bg-background z-10">
          <div className="w-20 flex-shrink-0 border-r border-border bg-background"></div>
          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date) => {
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()

              return (
                <div key={date.toISOString()} className="flex-1 text-center py-5">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={cn("text-xl font-light mt-2", isToday ? "text-primary" : "text-foreground")}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-1 overflow-auto">
          <div className="w-20 flex-shrink-0 border-r border-border bg-muted/10">
            {hours.map((hour) => (
              <div key={hour} className="h-16 border-b border-border flex items-start justify-center pt-2">
                <span className="text-xs text-muted-foreground font-light">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date) => (
              <div key={date.toISOString()} className="flex-1 divide-y divide-border/50">
                {hours.map((hour) => {
                  const hourEvents = getEventsForDateAndHour(date, hour)
                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className="h-16 bg-card hover:bg-muted/5 transition relative group"
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => onSelectEvent(event)}
                          className={cn(
                            "text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition text-white truncate m-1",
                            event.color,
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
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

  const dayStart = new Date(currentDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(currentDate)
  dayEnd.setHours(23, 59, 59, 999)

  const dayEvents = events.filter((event) => event.startTime >= dayStart && event.startTime <= dayEnd)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-6 bg-background">
        <h3 className="text-lg font-light tracking-wide">
          {currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {dayEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events scheduled</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="p-4 rounded border border-border bg-card hover:bg-muted/50 cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("w-2 h-2 rounded-full", event.color)}></div>
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground mb-2">{event.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {event.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {event.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
