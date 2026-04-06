"use client"

import { useState } from "react"
import { getWeekDays } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Trash2, Snowflake, AlertCircle } from "lucide-react"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import TimetableSlotModal from "@/components/timetable-slot-modal"
import { cn } from "@/lib/utils"

export const SCHEDULE_START_HOUR = 8
export const SCHEDULE_END_HOUR = 19

export function clampStartHour(start: number, duration = 1): number {
  return Math.max(SCHEDULE_START_HOUR, Math.min(start, SCHEDULE_END_HOUR - duration))
}

interface AdminCalendarGridProps {
  professor: Professor
  timetableSlots: TimetableSlot[]
  allSlots?: TimetableSlot[]
  onAddSlot: (slot: Omit<TimetableSlot, "id">) => void
  onUpdateSlot?: (id: number, updates: Omit<TimetableSlot, "id">) => void
  onDeleteSlot: (id: number) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export default function AdminCalendarGrid({
  professor,
  timetableSlots,
  allSlots = [],
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  currentDate,
  onDateChange,
}: AdminCalendarGridProps) {
  const weekDays = getWeekDays(currentDate)

  const hours = Array.from(
    { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR },
    (_, i) => i + SCHEDULE_START_HOUR,
  )

  const fmt = (h: number) => `${h % 12 || 12}${h >= 12 ? "pm" : "am"}`

  const [modalOpen, setModalOpen] = useState<{
    date: Date; hour: number; slotId?: number
  } | null>(null)

  const [previewSlot, setPreviewSlot] = useState<{
    dayOfWeek: number; startHour: number; endHour: number
  } | null>(null)

  const slotAt = (day: number, hr: number) =>
    timetableSlots.find(s => s.dayOfWeek === day && s.hour === hr)

  const slotSpanning = (day: number, hr: number) =>
    timetableSlots.find(s => s.dayOfWeek === day && hr >= s.hour && hr < s.endHour)

  const conflicts = (day: number, hr: number, room: string) =>
    (allSlots.length > 0 ? allSlots : timetableSlots)
      .filter(s => s.dayOfWeek === day && s.room === room && hr >= s.hour && hr < s.endHour)

  const inPreview = (day: number, hr: number) =>
    !!previewSlot &&
    previewSlot.dayOfWeek === day &&
    hr >= previewSlot.startHour &&
    hr < previewSlot.endHour

  function enforceBounds(slot: Omit<TimetableSlot, "id">): Omit<TimetableSlot, "id"> {
    const dur = (slot.endHour ?? slot.hour + 1) - slot.hour
    const start = clampStartHour(slot.hour, dur)
    return { ...slot, hour: start, endHour: Math.min(start + dur, SCHEDULE_END_HOUR) }
  }

  const openAdd = (date: Date, hr: number) =>
    setModalOpen({ date, hour: clampStartHour(hr) })

  const openEdit = (slot: TimetableSlot) => {
    const ws = new Date(currentDate)
    ws.setDate(currentDate.getDate() - currentDate.getDay())
    const d = new Date(ws)
    d.setDate(ws.getDate() + slot.dayOfWeek)
    setModalOpen({ date: d, hour: slot.hour, slotId: slot.id })
  }

  const handleSave = (slot: Omit<TimetableSlot, "id">) => {
    onAddSlot(enforceBounds(slot))
    setModalOpen(null); setPreviewSlot(null)
  }

  const handleUpdate = (id: number, slot: Omit<TimetableSlot, "id">) => {
    onUpdateSlot?.(id, enforceBounds(slot))
    setModalOpen(null); setPreviewSlot(null)
  }

  const handlePreview = (day: number, start: number, end: number) => {
    const dur = end - start
    const s = clampStartHour(start, dur)
    setPreviewSlot({ dayOfWeek: day, startHour: s, endHour: Math.min(s + dur, SCHEDULE_END_HOUR) })
  }

  const today = new Date()

  return (
    <div className="flex flex-col h-full select-none">
      <div className="border-b border-border px-8 py-4 bg-background flex items-center gap-4">
        <Button
          onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); onDateChange(d) }}
          variant="ghost" size="icon"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold text-foreground min-w-40 text-center">
          {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
          {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </h3>
        <Button
          onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); onDateChange(d) }}
          variant="ghost" size="icon"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col h-full overflow-auto">
        <div className="flex border-b border-border sticky top-0 bg-background z-20">
          <div className="w-20 flex-shrink-0 border-r border-border bg-background" />
          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map(date => {
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
              return (
                <div key={date.toISOString()} className="flex-1 text-center py-4 bg-muted/5">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={cn("text-xl font-bold mt-1", isToday ? "text-primary" : "text-foreground")}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-1 min-h-fit">
          <div className="w-20 flex-shrink-0 border-r border-border bg-muted/5">
            {hours.map(hr => (
              <div key={hr} className="h-24 border-b border-border flex items-start justify-center pt-3">
                <span className="text-[10px] font-bold text-muted-foreground/60">{fmt(hr)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date, dayOfWeek) => (
              <div key={date.toISOString()} className="flex-1 divide-y divide-border/50 relative">
                {hours.map(hr => {
                  const slot = slotAt(dayOfWeek, hr)
                  const spanning = slotSpanning(dayOfWeek, hr)
                  const inSpan = spanning && !slot
                  const preview = inPreview(dayOfWeek, hr)

                  const activeRoom = slot?.room || spanning?.room
                  const cfls = activeRoom ? conflicts(dayOfWeek, hr, activeRoom) : []
                  const hasConflict = cfls.length > 1

                  return (
                    <div
                      key={`${date.toISOString()}-${hr}`}
                      className={cn(
                        "h-24 transition-all relative group cursor-pointer flex items-center justify-center border-b border-border/30",
                        preview && "bg-primary/10 border-2 border-primary/40 z-10",
                        (slot || inSpan) && !hasConflict && (spanning?.needsAC
                          ? "bg-blue-50/80 border-l-4 border-blue-500 hover:bg-blue-100"
                          : "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100"),
                        hasConflict && "bg-red-50 border-l-4 border-red-500 hover:bg-red-100",
                      )}
                      onClick={() => {
                        if (slot) openEdit(slot)
                        else if (spanning) openEdit(spanning)
                        else if (!inSpan) openAdd(date, hr)
                      }}
                    >
                      {hasConflict && (
                        <div className="absolute top-1 right-1 z-20">
                          <AlertCircle className="w-4 h-4 text-red-600 fill-red-50" />
                        </div>
                      )}

                      {slot && (
                        <div className="w-full h-full p-3 flex flex-col justify-between z-10">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className={cn(
                                "text-[11px] font-bold leading-none truncate",
                                hasConflict ? "text-red-700" : "text-foreground",
                              )}>
                                {slot.subject}
                              </p>
                              {slot.needsAC && !hasConflict && (
                                <Snowflake className="w-3 h-3 text-blue-500 animate-pulse shrink-0" />
                              )}
                            </div>
                            <p className={cn(
                              "text-[10px] font-medium",
                              hasConflict ? "text-red-600 font-bold" : "text-muted-foreground",
                            )}>
                              Room {slot.room}{hasConflict && " - DOUBLE BOOKED"}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (confirm("Delete this slot?")) onDeleteSlot(slot.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}

                      {!slot && !inSpan && (
                        <Plus className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {modalOpen && (
          <TimetableSlotModal
            professor={professor}
            selectedDate={modalOpen.date}
            hour={modalOpen.hour}
            slotId={modalOpen.slotId}
            existingSlot={modalOpen.slotId ? timetableSlots.find(s => s.id === modalOpen.slotId) : undefined}
            onSubmit={
              modalOpen.slotId
                ? slot => handleUpdate(modalOpen.slotId!, slot)
                : handleSave
            }
            onClose={() => { setModalOpen(null); setPreviewSlot(null) }}
            onPreviewUpdate={handlePreview}
            minHour={SCHEDULE_START_HOUR}
            maxHour={SCHEDULE_END_HOUR}
          />
        )}
      </div>
    </div>
  )
}