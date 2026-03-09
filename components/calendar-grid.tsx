"use client"

import type { CalendarEvent } from "@/app/page"
import { getMonthDays, getWeekDays, getWeekDaysNoSunday } from "@/lib/date-utils"
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
  const weekDays = getWeekDaysNoSunday(currentDate)  // Monday to Saturday only

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
      date.getMonth() === currentDate.getMonth() && date.getDay() !== 0  // Exclude Sundays
    )

    return (
      <div className="p-8">
        <div className="grid grid-cols-6 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-4">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: monthDays[0].getDay() === 0 ? 6 : monthDays[0].getDay() - 1 }).map((_, index) => (
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
    // Week view with multi-block event highlighting
    // Events now span multiple hourly blocks based on their duration
    // Example: A class from 1pm-3pm will highlight both 1-2pm and 2-3pm blocks
    const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 7am to 9pm

    const formatHourLabel = (hour: number): string => {
      const isPM = hour >= 12
      const displayHour = hour % 12 || 12
      return `${displayHour}${isPM ? "pm" : "am"}`
    }

    // Get events that span a specific hour (start within or before, end after)
    // Used to visually highlight all blocks an event occupies
    const getEventsSpanningHour = (date: Date, hour: number) => {
      return events.filter((event) => {
        const eventDate = new Date(event.startTime)
        const eventEndDate = new Date(event.endTime)
        const eventStartHour = eventDate.getHours()
        const eventEndHour = eventEndDate.getHours()

        // Check if event is on the same date
        const isSameDate =
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()

        // Event spans this hour if it starts on or before this hour and ends after this hour
        return isSameDate && eventStartHour <= hour && eventEndHour > hour
      })
    }

    // Get events that start at a specific hour (only render once, at the start)
    const getEventsStartingAtHour = (date: Date, hour: number) => {
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

    // Calculate the row span for an event (how many hours it spans)
    const getEventRowSpan = (event: CalendarEvent): number => {
      const startHour = event.startTime.getHours()
      const endHour = event.endTime.getHours()
      const durationHours = endHour - startHour
      return Math.max(1, durationHours)
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
                <span className="text-xs text-muted-foreground font-light">{formatHourLabel(hour)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date) => {
              // Track which events have been rendered to avoid duplicates
              const renderedEventIds = new Set<string>()

              return (
                <div key={date.toISOString()} className="flex-1 relative">
                  {/* Background grid lines */}
                  <div className="absolute inset-0 divide-y divide-border/50 pointer-events-none">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16" />
                    ))}
                  </div>

                  {/* Events layer */}
                  <div className="relative">
                    {hours.map((hour) => {
                      const hourStartingEvents = getEventsStartingAtHour(date, hour)

                      return (
                        <div key={`${date.toISOString()}-${hour}`}>
                          {hourStartingEvents.map((event) => {
                            if (renderedEventIds.has(event.id)) return null

                            renderedEventIds.add(event.id)
                            const rowSpan = getEventRowSpan(event)

                            return (
                              <div
                                key={event.id}
                                onClick={() => onSelectEvent(event)}
                                style={{
                                  position: 'absolute',
                                  top: `${hour * 64}px`, // 64px = h-16
                                  left: '4px',
                                  right: '4px',
                                  height: `${rowSpan * 64 - 8}px`,
                                  zIndex: 5,
                                }}
                                className={cn(
                                  'rounded cursor-pointer hover:opacity-80 transition text-white px-2 py-1 text-xs overflow-hidden flex flex-col justify-center',
                                  event.color,
                                )}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                <div className="text-xs opacity-90 truncate">
                                  {event.startTime.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}{' '}
                                  -{' '}
                                  {event.endTime.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>

                  {/* Hour cells for hover effects */}
                  <div className="relative">
                    {hours.map((hour) => (
                      <div
                        key={`cell-${date.toISOString()}-${hour}`}
                        className="h-16 bg-card hover:bg-muted/5 transition relative group border-b border-border/50"
                      />
                    ))}
                  </div>
                </div>
              )
            })}
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
