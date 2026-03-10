"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Snowflake, MapPin } from "lucide-react"
import DateTimePicker from "./date-time-picker"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import { supabase } from "@/lib/supabase"

interface RoomData {
  id: string
  is_ac: boolean
}

interface TimetableSlotModalProps {
  professor: Professor
  selectedDate: Date
  hour: number
  slotId?: number
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

  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  useEffect(() => {
    async function fetchRooms() {
      setIsLoadingRooms(true)
      const { data, error } = await supabase
        .from("rooms")
        .select("id, is_ac")
        .eq("is_faculty", false)
        .order("id", { ascending: true })

      if (!error && data) {
        setAvailableRooms(data)
      }
      setIsLoadingRooms(false)
    }
    fetchRooms()
  }, [])

  // Safely initialize local date state
  const [slotDate, setSlotDate] = useState(() => {
    const d = selectedDate instanceof Date ? new Date(selectedDate) : new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [startTime, setStartTime] = useState(() => {
    return existingSlot 
      ? `${String(existingSlot.hour).padStart(2, "0")}:00` 
      : `${String(hour).padStart(2, "0")}:00`
  })

  const [endTime, setEndTime] = useState(() => {
    return existingSlot 
      ? `${String(existingSlot.endHour).padStart(2, "0")}:00` 
      : `${String(hour + 1).padStart(2, "0")}:00`
  })

  const handlePreviewUpdate = (date: Date, newStartTime: string, newEndTime: string) => {
    const startHour = Number.parseInt(newStartTime.split(":")[0])
    const endHour = Number.parseInt(newEndTime.split(":")[0])
    const calculatedDayOfWeek = date.getDay()
    onPreviewUpdate?.(calculatedDayOfWeek, startHour, endHour)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.subject && formData.room) {
      const selectedDayOfWeek = slotDate.getDay()
      const startH = Number.parseInt(startTime.split(":")[0])
      const endH = Number.parseInt(endTime.split(":")[0])

      if (endH <= startH) {
        alert("End time must be after start time")
        return
      }

      onSubmit({
        professorId: professor.id,
        dayOfWeek: selectedDayOfWeek,
        hour: startH,
        endHour: endH,
        subject: formData.subject,
        room: formData.room,
        needsAC: formData.needsAC,
      })
      onClose()
    } else {
      alert("Subject and Room are required")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {slotId ? "Update Schedule" : "Add New Class"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 transition">
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

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject Name</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Computer Graphics"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
            <div className="relative">
              <select
                required
                value={formData.room}
                disabled={isLoadingRooms}
                onChange={(e) => {
                  const rId = e.target.value
                  const room = availableRooms.find((r) => r.id === rId)
                  setFormData({ ...formData, room: rId, needsAC: room?.is_ac ? true : formData.needsAC })
                }}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm appearance-none cursor-pointer"
              >
                <option value="">{isLoadingRooms ? "Loading Rooms..." : "Choose Room"}</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>Room {r.id} {r.is_ac ? "(AC ❄️)" : ""}</option>
                ))}
              </select>
              <MapPin className="absolute right-4 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition">
            <input
              type="checkbox"
              checked={formData.needsAC}
              onChange={(e) => setFormData({ ...formData, needsAC: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex items-center gap-2">
              <Snowflake className={`w-4 h-4 ${formData.needsAC ? "text-blue-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-semibold">Requires Air Conditioning</span>
            </div>
          </label>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} type="button" variant="ghost" className="flex-1">Discard</Button>
            <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">
              {slotId ? "Apply Changes" : "Confirm Slot"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}