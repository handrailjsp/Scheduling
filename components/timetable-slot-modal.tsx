"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Snowflake, Sparkles } from "lucide-react"
import DateTimePicker from "./date-time-picker"
import { cn } from "@/lib/utils"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ─── SECTIONS LIST ────────────────────────────────────────────────────────────
// REPLACE or ADD entries here when the full section list is provided by the department.
// Format: "COURSE YEAR-SECTION" e.g. "BSCS 1A"
const SECTIONS: string[] = [
  "BSCS 1A", "BSCS 1B", "BSCS 2A",
  "BSIT 1A", "BSIT 1B", "BSIT 2A",
  "BSIS 1A", "BSIS 1B", "BSIS 2A",
  // ADD MORE SECTIONS HERE
]

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

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
  professor, selectedDate, hour, slotId, existingSlot,
  onSubmit, onClose, onPreviewUpdate, minHour, maxHour,
}: TimetableSlotModalProps) {
  const wasAutoAssign = existingSlot ? existingSlot.hour === null : false

  const [subject, setSubject]       = useState(existingSlot?.subject ?? "")
  const [section, setSection]       = useState(existingSlot?.section ?? "")
  const [needsAC, setNeedsAC]       = useState(existingSlot?.needsAC ?? false)
  const [autoAssign, setAutoAssign] = useState(wasAutoAssign)
  const [error, setError]           = useState("")

  const [aaDayOfWeek, setAaDayOfWeek] = useState<number>(() =>
    existingSlot ? existingSlot.dayOfWeek : selectedDate.getDay()
  )
  const [aaDuration, setAaDuration] = useState<number>(() => {
    if (existingSlot && existingSlot.hour === null && existingSlot.endHour !== null)
      return Math.max(1, existingSlot.endHour)
    return 1
  })

  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date(selectedDate); d.setHours(0, 0, 0, 0); return d
  })
  const [startTime, setStartTime] = useState(() =>
    existingSlot && existingSlot.hour !== null
      ? `${String(existingSlot.hour).padStart(2, "0")}:00`
      : `${String(hour).padStart(2, "0")}:00`
  )
  const [endTime, setEndTime] = useState(() =>
    existingSlot && existingSlot.endHour !== null && existingSlot.hour !== null
      ? `${String(existingSlot.endHour).padStart(2, "0")}:00`
      : `${String(Math.min(hour + 1, maxHour)).padStart(2, "0")}:00`
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!subject.trim()) { setError("Subject name is required."); return }

    if (autoAssign) {
      onSubmit({
        professorId:  professor.id,
        dayOfWeek:    aaDayOfWeek,
        hour:         null,
        endHour:      aaDuration,
        subject:      subject.trim(),
        section:      section.trim(),
        room:         "AUTO",
        needsAC,
        aiAssignTime: true,
      })
    } else {
      const startH = parseInt(startTime.split(":")[0])
      const endH   = parseInt(endTime.split(":")[0])
      if (endH <= startH) { setError("End time must be after start time."); return }
      onSubmit({
        professorId:  professor.id,
        dayOfWeek:    slotDate.getDay(),
        hour:         startH,
        endHour:      endH,
        subject:      subject.trim(),
        section:      section.trim(),
        room:         "PENDING",
        needsAC,
        aiAssignTime: true,
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-card border border-border rounded-xl w-[460px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b bg-muted/10">
          <div>
            <h2 className="text-xl font-bold">{slotId ? "Update Schedule" : "Add New Class"}</h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase">Prof. {professor.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
            Set the preferred day and time. If there are conflicts, the AI will automatically resolve them when you click{" "}
            <span className="font-bold text-foreground">Generate Schedule</span> — duration is always preserved.
          </div>

          {/* AI Auto-Assign toggle */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <Label className="font-bold text-sm">AI Auto-Assign Time</Label>
                <p className="text-[10px] text-muted-foreground">GA picks the optimal time slot</p>
              </div>
            </div>
            <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
          </div>

          {autoAssign ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Day of Week</Label>
                <select
                  value={aaDayOfWeek}
                  onChange={e => setAaDayOfWeek(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Duration (hours)</Label>
                <select
                  value={aaDuration}
                  onChange={e => setAaDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {[1,2,3,4,5,6].map(h => (
                    <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground ml-1">GA will find a conflict-free slot on the chosen day.</p>
              </div>
            </div>
          ) : (
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

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Subject Name</Label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="e.g. Thesis 1, Programming 2"
            />
          </div>

          {/* Section dropdown */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Section</Label>
            <select
              value={section}
              onChange={e => setSection(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">— No section assigned —</option>
              {/* ── REPLACE / ADD SECTIONS HERE when full list is provided ── */}
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* AC toggle */}
          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition",
            needsAC ? "bg-blue-50/50 border-blue-200" : "hover:bg-muted/30 border-border",
          )}>
            <input type="checkbox" className="hidden" checked={needsAC} onChange={e => setNeedsAC(e.target.checked)} />
            <div className="flex items-center gap-2">
              <Snowflake className={cn("w-4 h-4", needsAC ? "text-blue-500" : "text-muted-foreground")} />
              <span className="text-sm font-bold">Requires Air Conditioning</span>
            </div>
          </label>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} type="button" variant="ghost" className="flex-1">Discard</Button>
            <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">Confirm</Button>
          </div>
        </form>
      </div>
    </div>
  )
}