"use client"

import { useState } from "react"
import { getWeekDays } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Trash2, Snowflake, AlertCircle } from "lucide-react"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import TimetableSlotModal from "@/components/timetable-slot-modal"
import { cn } from "@/lib/utils"

interface AdminCalendarGridProps {
  professor: Professor
  timetableSlots: TimetableSlot[] // Current professor's slots
  allSlots?: TimetableSlot[] // Optional: All slots for conflict detection
  onAddSlot: (slot: Omit<TimetableSlot, "id">) => void
  onUpdateSlot?: (id: number, updates: Omit<TimetableSlot, "id">) => void
  onDeleteSlot: (id: number) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export default function AdminCalendarGrid({
  professor,
  timetableSlots,
  allSlots = [], // Default to empty array if not provided
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  currentDate,
  onDateChange,
}: AdminCalendarGridProps) {
  const weekDays = getWeekDays(currentDate)
  const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 7am to 9pm

  const formatHourLabel = (hour: number): string => {
    const isPM = hour >= 12
    const displayHour = hour % 12 || 12
    return `${displayHour}${isPM ? "pm" : "am"}`
  }

  const [modalOpen, setModalOpen] = useState<{ date: Date; hour: number; slotId?: number } | null>(null)
  const [previewSlot, setPreviewSlot] = useState<{ dayOfWeek: number; startHour: number; endHour: number } | null>(null)

  // Slots specifically for the selected professor (for rendering)
  const getSlotForTime = (dayOfWeek: number, hour: number) => {
    return timetableSlots.find((slot) => slot.dayOfWeek === dayOfWeek && slot.hour === hour)
  }

  const getSlotSpanningHour = (dayOfWeek: number, hour: number) => {
    return timetableSlots.find((slot) => slot.dayOfWeek === dayOfWeek && hour >= slot.hour && hour < slot.endHour)
  }

  // CONFLICT DETECTION LOGIC: 
  // Checks all slots in the system to see if a room is occupied by ANYONE at this time
  const getConflictsAtTime = (dayOfWeek: number, hour: number, room: string) => {
    const source = allSlots.length > 0 ? allSlots : timetableSlots;
    return source.filter(s => 
      s.dayOfWeek === dayOfWeek && 
      s.room === room && 
      hour >= s.hour && hour < s.endHour
    );
  }

  const isInPreviewSpan = (dayOfWeek: number, hour: number): boolean => {
    if (!previewSlot) return false
    return previewSlot.dayOfWeek === dayOfWeek && hour >= previewSlot.startHour && hour < previewSlot.endHour
  }

  const handleAddSlot = (date: Date, hour: number) => {
    setModalOpen({ date, hour })
  }

  const handleEditSlot = (slot: TimetableSlot) => {
    const currentWeekStart = new Date(currentDate)
    currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay())
    const slotDate = new Date(currentWeekStart)
    slotDate.setDate(currentWeekStart.getDate() + slot.dayOfWeek)

    setModalOpen({
      date: slotDate,
      hour: slot.hour,
      slotId: slot.id,
    })
  }

  const handleSaveSlot = (slot: Omit<TimetableSlot, "id">) => {
    onAddSlot(slot)
    setModalOpen(null)
    setPreviewSlot(null)
  }

  const handleUpdateSlot = (id: number, slot: Omit<TimetableSlot, "id">) => {
    onUpdateSlot?.(id, slot)
    setModalOpen(null)
    setPreviewSlot(null)
  }

  const handlePreviewUpdate = (dayOfWeek: number, startHour: number, endHour: number) => {
    setPreviewSlot({ dayOfWeek, startHour, endHour })
  }

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    onDateChange(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    onDateChange(newDate)
  }

  const today = new Date()

  return (
    <div className="flex flex-col h-full select-none">
      <div className="border-b border-border px-8 py-4 bg-background flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handlePrevWeek} variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold text-foreground min-w-40 text-center">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h3>
          <Button onClick={handleNextWeek} variant="ghost" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col h-full overflow-auto">
        {/* Header Days */}
        <div className="flex border-b border-border sticky top-0 bg-background z-20">
          <div className="w-20 flex-shrink-0 border-r border-border bg-background"></div>
          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date) => {
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

        {/* Body Grid */}
        <div className="flex flex-1 min-h-fit">
          <div className="w-20 flex-shrink-0 border-r border-border bg-muted/5">
            {hours.map((hour) => (
              <div key={hour} className="h-24 border-b border-border flex items-start justify-center pt-3">
                <span className="text-[10px] font-bold text-muted-foreground/60">{formatHourLabel(hour)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date, dayOfWeek) => (
              <div key={date.toISOString()} className="flex-1 divide-y divide-border/50 relative">
                {hours.map((hour) => {
                  const slot = getSlotForTime(dayOfWeek, hour)
                  const slotSpanning = getSlotSpanningHour(dayOfWeek, hour)
                  const isPreview = isInPreviewSpan(dayOfWeek, hour)
                  const isInSpan = slotSpanning && !slot

                  // CHECK FOR ROOM CONFLICTS
                  const activeRoom = slot?.room || slotSpanning?.room
                  const conflicts = activeRoom ? getConflictsAtTime(dayOfWeek, hour, activeRoom) : []
                  const hasConflict = conflicts.length > 1

                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={cn(
                        "h-24 transition-all relative group cursor-pointer flex items-center justify-center border-b border-border/30",
                        isPreview && "bg-primary/10 border-2 border-primary/40 z-10",
                        // Normal Coloring
                        (slot || isInSpan) && !hasConflict && (slotSpanning?.needsAC 
                          ? "bg-blue-50/80 border-l-4 border-blue-500 hover:bg-blue-100" 
                          : "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100"),
                        // Conflict Coloring
                        hasConflict && "bg-red-50 border-l-4 border-red-500 hover:bg-red-100 animate-in fade-in"
                      )}
                      onClick={() => {
                        if (slot) handleEditSlot(slot)
                        else if (slotSpanning) handleEditSlot(slotSpanning)
                        else if (!isInSpan) handleAddSlot(date, hour)
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
                                hasConflict ? "text-red-700" : "text-foreground"
                              )}>
                                {slot.subject}
                              </p>
                              {slot.needsAC && !hasConflict && (
                                <Snowflake className="w-3 h-3 text-blue-500 animate-pulse shrink-0" />
                              )}
                            </div>
                            <p className={cn(
                              "text-[10px] font-medium flex items-center gap-1",
                              hasConflict ? "text-red-600 font-bold" : "text-muted-foreground"
                            )}>
                              Room {slot.room} {hasConflict && " - DOUBLE BOOKED"}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if(confirm("Delete this slot?")) onDeleteSlot(slot.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                      {!slot && !isInSpan && (
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
            existingSlot={modalOpen.slotId ? timetableSlots.find((s) => s.id === modalOpen.slotId) : undefined}
            onSubmit={modalOpen.slotId ? (slot) => handleUpdateSlot(modalOpen.slotId!, slot) : handleSaveSlot}
            onClose={() => {
              setModalOpen(null)
              setPreviewSlot(null)
            }}
            onPreviewUpdate={handlePreviewUpdate}
          />
        )}
      </div>
    </div>
  )
}