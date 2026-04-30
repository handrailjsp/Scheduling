"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Snowflake, Sparkles } from "lucide-react"
import DateTimePicker from "./date-time-picker"
import { cn } from "@/lib/utils"
import type { Professor, TimetableSlot } from "@/app/admin/page"

// Ensure you run 'npx shadcn-ui@latest add switch label'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
  const [subject, setSubject] = useState(existingSlot?.subject || "")
  const [needsAC, setNeedsAC] = useState(existingSlot?.needsAC || false)
  const [autoAssign, setAutoAssign] = useState(false)
  const [error, setError] = useState("")

  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date(selectedDate)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [startTime, setStartTime] = useState(() =>
    existingSlot 
      ? `${String(existingSlot.hour).padStart(2, "0")}:00` 
      : `${String(hour).padStart(2, "0")}:00`
  )

  const [endTime, setEndTime] = useState(() =>
    existingSlot 
      ? `${String(existingSlot.endHour).padStart(2, "0")}:00` 
      : `${String(Math.min(hour + 1, maxHour)).padStart(2, "0")}:00`
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!subject.trim()) {
      setError("Subject name is required.")
      return
    }

    const startH = parseInt(startTime.split(":")[0])
    const endH = parseInt(endTime.split(":")[0])

    if (!autoAssign && endH <= startH) {
      setError("End time must be after start time.")
      return
    }

    onSubmit({
      professorId: professor.id,
      dayOfWeek: slotDate.getDay(),
      hour: autoAssign ? null : startH,
      endHour: autoAssign ? null : endH,
      subject: subject.trim(),
      room: autoAssign ? "AUTO" : (existingSlot?.room || "PENDING"),
      needsAC,
      aiAssignTime: autoAssign,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-card border border-border rounded-xl w-[420px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b bg-muted/10">
          <div>
            <h2 className="text-xl font-bold">
              {slotId ? "Update Schedule" : "Add New Class"}
            </h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase">
              Prof. {professor.name}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* AI AUTO-ASSIGN TOGGLE */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <Label className="font-bold text-sm">AI Auto-Assign</Label>
                <p className="text-[10px] text-muted-foreground">GA handles the optimal time/room</p>
              </div>
            </div>
            <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
          </div>

          {!autoAssign && (
            <DateTimePicker
              date={slotDate}
              startTime={startTime}
              endTime={endTime}
              onDateChange={setSlotDate}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onPreviewUpdate={(d, s, e) => onPreviewUpdate?.(d.getDay(), parseInt(s), parseInt(e))}
              minHour={minHour}
              maxHour={maxHour}
            />
          )}

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Subject Name</Label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="e.g. Thesis 1"
            />
          </div>

          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition",
            needsAC ? "bg-blue-50/50 border-blue-200" : "hover:bg-muted/30 border-border"
          )}>
            <input
              type="checkbox"
              className="hidden"
              checked={needsAC}
              onChange={e => setNeedsAC(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <Snowflake className={cn("w-4 h-4", needsAC ? "text-blue-500" : "text-muted-foreground")} />
              <span className="text-sm font-bold">Requires Air Conditioning</span>
            </div>
          </label>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} type="button" variant="ghost" className="flex-1">
              Discard
            </Button>
            <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}