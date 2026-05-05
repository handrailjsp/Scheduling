"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  hex: string
}

interface AdminEventModalProps {
  event?: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => void
  onDelete: (eventId: string) => void
  initialDate?: Date
}

export default function AdminEventModal({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate = new Date(),
}: AdminEventModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [prefersAC, setPrefersAC] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setStartTime(event.startTime.toISOString().slice(0, 16))
      setEndTime(event.endTime.toISOString().slice(0, 16))
      setPrefersAC(event.description.includes("AC"))
    } else {
      setTitle("")
      setDescription("")
      setStartTime(initialDate.toISOString().slice(0, 16))
      setEndTime(new Date(initialDate.getTime() + 3600000).toISOString().slice(0, 16))
      setPrefersAC(false)
    }
  }, [event, isOpen, initialDate])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      id: event?.id || `event-${Date.now()}`,
      title,
      description: prefersAC ? `${description} (Requires AC)` : description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      color: prefersAC ? "bg-blue-600" : "bg-green-600",
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{event ? "Edit Class" : "Add New Class"}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex-1 px-6 py-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Subject Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Computer Graphics"
                className="w-full p-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 text-sm rounded-md border border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" /> End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 text-sm rounded-md border border-border bg-background"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border border-border rounded-md bg-muted/20">
              <input
                type="checkbox"
                id="ac-check"
                checked={prefersAC}
                onChange={(e) => setPrefersAC(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="ac-check" className="text-sm font-medium leading-none flex items-center gap-2">
               Requires Air Conditioning
              </label>
            </div>

            {event && showDeleteConfirm && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-medium flex-1">Confirm deletion?</span>
                <Button size="sm" variant="destructive" onClick={() => onDelete(event.id)}>Delete</Button>
              </div>
            )}
          </form>

          <div className="border-t border-border px-6 py-4 flex justify-end gap-3 bg-card">
            <Button variant="ghost" onClick={onClose}>Discard</Button>
            <Button onClick={handleSave} className="bg-[#0070f3] hover:bg-[#0060d3] text-white px-8">
              Confirm Slot
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}