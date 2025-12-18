"use client"

import { useState } from "react"
import { getWeekDays } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import TimetableSlotModal from "@/components/timetable-slot-modal"
import { cn } from "@/lib/utils"

interface AdminCalendarGridProps {
  professor: Professor
  timetableSlots: TimetableSlot[]
  onAddSlot: (slot: Omit<TimetableSlot, "id">) => void
  onUpdateSlot?: (id: number, updates: Omit<TimetableSlot, "id">) => void
  onDeleteSlot: (id: number) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export default function AdminCalendarGrid({
  professor,
  timetableSlots,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  currentDate,
  onDateChange,
}: AdminCalendarGridProps) {
  const weekDays = getWeekDays(currentDate)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const [modalOpen, setModalOpen] = useState<{ date: Date; hour: number; slotId?: string } | null>(null)
  const [previewSlot, setPreviewSlot] = useState<{ dayOfWeek: number; startHour: number; endHour: number } | null>(null)

  const getSlotForTime = (dayOfWeek: number, hour: number) => {
    return timetableSlots.find((slot) => slot.dayOfWeek === dayOfWeek && slot.hour === hour)
  }

  const getSlotSpanningHour = (dayOfWeek: number, hour: number) => {
    return timetableSlots.find((slot) => slot.dayOfWeek === dayOfWeek && hour >= slot.hour && hour < slot.endHour)
  }

  const isInPreviewSpan = (dayOfWeek: number, hour: number): boolean => {
    if (!previewSlot) return false
    return previewSlot.dayOfWeek === dayOfWeek && hour >= previewSlot.startHour && hour < previewSlot.endHour
  }

  const handleAddSlot = (date: Date, hour: number) => {
    setModalOpen({ date, hour })
  }

  const handleEditSlot = (slot: TimetableSlot) => {
    setModalOpen({
      date: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + slot.dayOfWeek)),
      hour: slot.hour,
      slotId: slot.id,
    })
  }

  const handleSaveSlot = (slot: Omit<TimetableSlot, "id">) => {
    console.log("[v0] Saving slot:", slot)
    onAddSlot(slot)
    setModalOpen(null)
    setPreviewSlot(null)
  }

  const handleUpdateSlot = (id: string, slot: Omit<TimetableSlot, "id">) => {
    console.log("[v0] Updating slot:", id, slot)
    onUpdateSlot?.(id, slot)
    setModalOpen(null)
    setPreviewSlot(null)
  }

  const handlePreviewUpdate = (dayOfWeek: number, startHour: number, endHour: number) => {
    console.log("[v0] Preview slot set to - DayOfWeek:", dayOfWeek, "Hours:", startHour, "-", endHour)
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
    <div className="flex flex-col h-full">
      {/* Week Navigation */}
      <div className="border-b border-border px-8 py-4 bg-background flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handlePrevWeek} variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-medium text-muted-foreground min-w-40">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h3>
          <Button onClick={handleNextWeek} variant="ghost" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col h-full overflow-auto">
        {/* Week Header */}
        <div className="flex border-b border-border sticky top-0 bg-background z-10">
          <div className="w-20 flex-shrink-0 border-r border-border bg-background"></div>
          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date) => {
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()

              return (
                <div key={date.toISOString()} className="flex-1 text-center py-4">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={cn("text-lg font-light mt-1", isToday ? "text-primary" : "text-foreground")}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hours and Slots Grid */}
        <div className="flex flex-1">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r border-border bg-muted/10">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b border-border flex items-start justify-center pt-2">
                <span className="text-xs text-muted-foreground font-light">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Slot grid */}
          <div className="flex flex-1 divide-x divide-border">
            {weekDays.map((date, dayOfWeek) => (
              <div key={date.toISOString()} className="flex-1 divide-y divide-border/50">
                {hours.map((hour) => {
                  const slot = getSlotForTime(dayOfWeek, hour)
                  const slotSpanning = getSlotSpanningHour(dayOfWeek, hour)
                  const isPreview = isInPreviewSpan(dayOfWeek, hour)
                  const isInSpan = slotSpanning && !slot

                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={cn(
                        "h-20 bg-card hover:bg-muted/5 transition relative group cursor-pointer flex items-center justify-center",
                        isPreview && "bg-primary/20 border-2 border-primary/50",
                        (slot || isInSpan) && "bg-green-300 border-l-4 border-green-600",
                      )}
                      onClick={() => {
                        if (slot) {
                          handleEditSlot(slot)
                        } else if (!isInSpan) {
                          handleAddSlot(date, hour)
                        }
                      }}
                    >
                      {slot ? (
                        <div className="w-full h-full p-2 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-foreground truncate">{slot.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{slot.room}</p>
                            {slot.needsAC && <p className="text-xs text-primary">AC Required</p>}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteSlot(slot.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition mt-1"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
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
