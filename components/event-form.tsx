"use client"

import type React from "react"

import type { CalendarEvent } from "@/app/page"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const COLORS = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Pink", value: "bg-pink-500" },
]

interface EventFormProps {
  onSubmit: (event: Omit<CalendarEvent, "id">) => void
  onCancel: () => void
  initialDate: Date
}

export default function EventForm({ onSubmit, onCancel, initialDate }: EventFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState(initialDate.toISOString().slice(0, 16))
  const [endTime, setEndTime] = useState(new Date(initialDate.getTime() + 3600000).toISOString().slice(0, 16))
  const [color, setColor] = useState("bg-blue-500")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      color,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Event Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter event title"
          className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details (optional)"
          className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Start</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">End</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Color</label>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full ${c.value} transition ${
                color === c.value ? "ring-2 ring-offset-2 ring-foreground" : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
          Create
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-border hover:bg-muted bg-transparent"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
