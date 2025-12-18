"use client"

import type React from "react"
import type { CalendarEvent } from "@/app/page"
import { useState } from "react"
import { X, Clock, AlertCircle, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminEventModalProps {
  event?: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void
  initialDate?: Date
}

const COLORS = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Gray", value: "bg-gray-500" },
  { name: "Orange", value: "bg-orange-500" },
]

export default function AdminEventModal({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate = new Date(),
}: AdminEventModalProps) {
  const [title, setTitle] = useState(event?.title || "")
  const [description, setDescription] = useState(event?.description || "")
  const [startTime, setStartTime] = useState(
    event?.startTime.toISOString().slice(0, 16) || initialDate.toISOString().slice(0, 16),
  )
  const [endTime, setEndTime] = useState(
    event?.endTime.toISOString().slice(0, 16) || new Date(initialDate.getTime() + 3600000).toISOString().slice(0, 16),
  )
  const [color, setColor] = useState(event?.color || "bg-blue-500")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const updatedEvent: CalendarEvent = {
      id: event?.id || `event-${Date.now()}`,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      color,
    }

    onSave(updatedEvent)
    handleClose()
  }

  const handleDelete = () => {
    if (event?.id) {
      onDelete(event.id)
      handleClose()
    }
  }

  const handleClose = () => {
    setTitle(event?.title || "")
    setDescription(event?.description || "")
    setStartTime(event?.startTime.toISOString().slice(0, 16) || initialDate.toISOString().slice(0, 16))
    setEndTime(
      event?.endTime.toISOString().slice(0, 16) || new Date(initialDate.getTime() + 3600000).toISOString().slice(0, 16),
    )
    setColor(event?.color || "bg-blue-500")
    setShowDeleteConfirm(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{event ? "Edit event" : "Create event"}</h2>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add title"
                  className="w-full text-xl font-semibold bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder-muted-foreground p-0"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-foreground placeholder-muted-foreground p-0 resize-none h-16"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <label className="text-sm font-medium text-muted-foreground">Start</label>
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* End Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <label className="text-sm font-medium text-muted-foreground">End</label>
                </div>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Color Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <label className="text-sm font-medium text-muted-foreground">Color</label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-10 h-10 rounded-full ${c.value} transition-all ${
                        color === c.value
                          ? "ring-2 ring-offset-2 ring-foreground scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Delete Confirmation Section */}
              {event && showDeleteConfirm && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Delete this event?</p>
                      <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleDelete} variant="destructive" className="flex-1 h-9">
                      Delete
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      className="flex-1 h-9"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer with Actions */}
          <div className="border-t border-border px-6 py-4 bg-card flex gap-2">
            {event && !showDeleteConfirm && (
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" onClick={handleClose} variant="outline" className="h-10 bg-transparent">
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSave}
              className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {event ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
