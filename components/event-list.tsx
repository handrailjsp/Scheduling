"use client"

import type { CalendarEvent } from "@/app/page"
import { cn } from "@/lib/utils"

interface EventListProps {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

export default function EventList({ events, onSelectEvent }: EventListProps) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No upcoming events</p>
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => onSelectEvent(event)}
          className="p-2 rounded bg-card border border-border/50 hover:border-border cursor-pointer transition group"
        >
          <div className="flex items-start gap-2">
            <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", event.color)}></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.startTime.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
