"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Snowflake } from "lucide-react"
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
  minHour: number
  maxHour: number
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
  minHour,
  maxHour,
}: TimetableSlotModalProps) {
  const [formData, setFormData] = useState({
    subject: existingSlot?.subject || "",
    needsAC: existingSlot?.needsAC || false,
  })

  const [slotDate, setSlotDate] = useState(() => {
    const d = selectedDate instanceof Date ? new Date(selectedDate) : new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [startTime, setStartTime] = useState(() =>
    existingSlot
      ? `${String(existingSlot.hour).padStart(2, "0")}:00`
      : `${String(hour).padStart(2, "0")}:00`,
  )

  const [endTime, setEndTime] = useState(() =>
    existingSlot
      ? `${String(existingSlot.endHour).padStart(2, "0")}:00`
      : `${String(hour + 1).padStart(2, "0")}:00`,
  )

  const handlePreviewUpdate = (
    date: Date,
    newStartTime: string,
    newEndTime: string,
  ) => {
    const startHour = parseInt(newStartTime.split(":")[0])
    const endHour   = parseInt(newEndTime.split(":")[0])
    onPreviewUpdate?.(date.getDay(), startHour, endHour)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject) {
      return
    }

    const startH = parseInt(startTime.split(":")[0])
    const endH   = parseInt(endTime.split(":")[0])

    if (endH <= startH) {
      return
    }

    onSubmit({
      professorId: professor.id,
      dayOfWeek:   slotDate.getDay(),
      hour:        startH,
      endHour:     endH,
      subject:     formData.subject,
      room:        existingSlot?.room || "TBD",
      needsAC:     formData.needsAC,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {slotId ? "Update Schedule" : "Add New Class"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition"
          >
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
            minHour={minHour}
            maxHour={maxHour}
          />

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Subject Name
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Computer Graphics"
            />
          </div>

          <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition">
            <input
              type="checkbox"
              checked={formData.needsAC}
              onChange={e => setFormData({ ...formData, needsAC: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex items-center gap-2">
              <Snowflake
                className={`w-4 h-4 ${formData.needsAC ? "text-blue-500" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-semibold">Requires Air Conditioning</span>
            </div>
          </label>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              type="button"
              variant="ghost"
              className="flex-1"
            >
              Discard
            </Button>
            <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">
              {slotId ? "Apply Changes" : "Confirm Slot"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}