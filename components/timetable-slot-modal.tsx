"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import DateTimePicker from "./date-time-picker"
import type { Professor, TimetableSlot } from "@/app/admin/page"

interface TimetableSlotModalProps {
  professor: Professor
  selectedDate: Date
  hour: number
  slotId?: string
  existingSlot?: TimetableSlot
  onSubmit: (data: Omit<TimetableSlot, "id">) => void
  onClose: () => void
  onPreviewUpdate?: (dayOfWeek: number, startHour: number, endHour: number) => void
}

export default function TimetableSlotModal({
  professor,
  selectedDate,
  hour,
  slotId,
  existingSlot,
  onSubmit,
  onClose,
  onPreviewUpdate,
}: TimetableSlotModalProps) {
  const [formData, setFormData] = useState({
    subject: existingSlot?.subject || "",
    room: existingSlot?.room || "",
    needsAC: existingSlot?.needsAC || false,
  })

  const [slotDate, setSlotDate] = useState(() => {
    if (existingSlot) {
      const date = new Date(selectedDate)
      date.setHours(0, 0, 0, 0)
      return date
    }
    const date = new Date(selectedDate)
    date.setHours(0, 0, 0, 0)
    return date
  })

  const [startTime, setStartTime] = useState(() => {
    if (existingSlot) {
      return `${String(existingSlot.hour).padStart(2, "0")}:00`
    }
    return `${String(hour).padStart(2, "0")}:00`
  })

  const [endTime, setEndTime] = useState(() => {
    if (existingSlot) {
      return `${String(existingSlot.endHour).padStart(2, "0")}:00`
    }
    return `${String(hour + 1).padStart(2, "0")}:00`
  })

  const formattedDate = slotDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  const handlePreviewUpdate = (date: Date, newStartTime: string, newEndTime: string) => {
    const startHour = Number.parseInt(newStartTime.split(":")[0])
    const endHour = Number.parseInt(newEndTime.split(":")[0])

    const calculatedDayOfWeek = date.getDay()

    console.log(
      "[v0] Preview update - Selected date:",
      date.toLocaleDateString(),
      "DayOfWeek from getDay():",
      calculatedDayOfWeek,
      "Start hour:",
      startHour,
      "End hour:",
      endHour,
    )
    onPreviewUpdate?.(calculatedDayOfWeek, startHour, endHour)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.subject && formData.room) {
      const selectedDayOfWeek = slotDate.getDay()

      const startHour = Number.parseInt(startTime.split(":")[0])
      const endHour = Number.parseInt(endTime.split(":")[0])

      // Validate time constraints
      if (endHour <= startHour) {
        alert("End time must be after start time")
        console.error("[v0] Validation failed - End hour must be after start hour", {
          startHour,
          endHour,
          startTime,
          endTime,
        })
        return
      }

      console.log(`[v0] Form submission - ${slotId ? "Updating" : "Creating"} slot with validated data`, {
        professorId: professor.id,
        dayOfWeek: selectedDayOfWeek,
        hour: startHour,
        endHour: endHour,
        subject: formData.subject,
        room: formData.room,
        needsAC: formData.needsAC,
        date: slotDate.toLocaleDateString(),
        timeRange: `${startTime} - ${endTime}`,
      })

      onSubmit({
        professorId: professor.id,
        dayOfWeek: selectedDayOfWeek,
        hour: startHour,
        endHour: endHour,
        subject: formData.subject,
        room: formData.room,
        needsAC: formData.needsAC,
      })

      setFormData({ subject: "", room: "", needsAC: false })
      onClose()
    } else {
      alert("Subject and Room are required")
      console.warn("[v0] Form validation failed - Subject and Room are required")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-96 shadow-xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{slotId ? "Edit Class" : "Add Class"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <DateTimePicker
            date={slotDate}
            startTime={startTime}
            endTime={endTime}
            onDateChange={setSlotDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onPreviewUpdate={handlePreviewUpdate}
          />

          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
              placeholder="e.g., Data Structures"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Room</label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
              placeholder="e.g., 101"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.needsAC}
              onChange={(e) => setFormData({ ...formData, needsAC: e.target.checked })}
              className="w-4 h-4 rounded border border-border bg-background cursor-pointer accent-primary"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition font-medium">
              Requires Air Conditioning
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
