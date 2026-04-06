"use client"
import { useState } from "react"
import type React from "react"

import { Calendar, Clock, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DateTimePickerProps {
  date: Date
  startTime: string
  endTime: string
  onDateChange: (date: Date) => void
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  onPreviewUpdate?: (date: Date, startTime: string, endTime: string) => void
  minHour?: number
  maxHour?: number
}

export default function DateTimePicker({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onPreviewUpdate,
  minHour,
  maxHour,
}: DateTimePickerProps) {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  const validStartTime = typeof startTime === "string" && startTime.match(/^\d{2}:\d{2}$/) ? startTime : "09:00"
  const validEndTime = typeof endTime === "string" && endTime.match(/^\d{2}:\d{2}$/) ? endTime : "10:00"

  const [isExpanded, setIsExpanded] = useState(false)
  const [tempDate, setTempDate] = useState<Date>(validDate)
  const [tempStartTime, setTempStartTime] = useState<string>(validStartTime)
  const [tempEndTime, setTempEndTime] = useState<string>(validEndTime)

  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">(() => {
    const hour = Number.parseInt(validStartTime.split(":")[0])
    return hour >= 12 ? "PM" : "AM"
  })

  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">(() => {
    const hour = Number.parseInt(validEndTime.split(":")[0])
    return hour >= 12 ? "PM" : "AM"
  })

  const [timeError, setTimeError] = useState<"start" | "end" | "range" | null>(null)
  const [errorFieldsFlashing, setErrorFieldsFlashing] = useState<("start" | "end")[]>([])

  const [startHourInput, setStartHourInput] = useState<string>(() => {
    const hour = Number.parseInt(validStartTime.split(":")[0])
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return String(displayHour)
  })

  const [startMinutesInput, setStartMinutesInput] = useState<string>(validStartTime.split(":")[1] || "00")

  const [endHourInput, setEndHourInput] = useState<string>(() => {
    const hour = Number.parseInt(validEndTime.split(":")[0])
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return String(displayHour)
  })

  const [endMinutesInput, setEndMinutesInput] = useState<string>(validEndTime.split(":")[1] || "00")

  const formattedDate = tempDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  const getDisplayTime = (time24: string): string => {
    const [hours, minutes] = time24.split(":")
    const hour = Number.parseInt(hours)
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${String(displayHour).padStart(2, "0")}:${minutes}`
  }

  const to24Hour = (time12: string, period: "AM" | "PM"): string => {
    const parts = time12.split(":")
    if (parts.length !== 2) return "00:00"

    let hour = Number.parseInt(parts[0]) || 0
    const minutes = Number.parseInt(parts[1]) || 0

    if (hour < 1 || hour > 12) hour = 12
    
    if (period === "PM" && hour !== 12) {
      hour += 12
    } else if (period === "AM" && hour === 12) {
      hour = 0
    }

    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  const getFullTimestamp = (dateObj: Date, time24: string): number => {
    const parts = time24.split(":")
    const hours = Number.parseInt(parts[0]) || 0
    const minutes = Number.parseInt(parts[1]) || 0
    const date = new Date(dateObj)
    date.setHours(hours, minutes, 0, 0)
    return date.getTime()
  }

  const isValidTimeRange = (
    checkDate: Date,
    checkStartTime: string,
    checkEndTime: string,
    checkStartPeriod: "AM" | "PM",
    checkEndPeriod: "AM" | "PM",
  ): boolean => {
    const start24 = to24Hour(checkStartTime, checkStartPeriod)
    const end24 = to24Hour(checkEndTime, checkEndPeriod)

    const startHourNum = Number.parseInt(start24.split(":")[0])
    const endHourNum = Number.parseInt(end24.split(":")[0])

    if (minHour !== undefined && (startHourNum < minHour || endHourNum < minHour)) return false
    if (maxHour !== undefined && (startHourNum >= maxHour || endHourNum > maxHour)) return false

    const startTimestamp = getFullTimestamp(checkDate, start24)
    const endTimestamp = getFullTimestamp(checkDate, end24)

    return endTimestamp > startTimestamp
  }

  const updatePreview = (
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    newStartPeriod: "AM" | "PM",
    newEndPeriod: "AM" | "PM",
  ) => {
    const start24 = to24Hour(newStartTime, newStartPeriod)
    const end24 = to24Hour(newEndTime, newEndPeriod)

    if (isValidTimeRange(newDate, newStartTime, newEndTime, newStartPeriod, newEndPeriod)) {
      setTimeError(null)
      setErrorFieldsFlashing([])
      onPreviewUpdate?.(newDate, start24, end24)
    } else {
      setTimeError("range")
    }
  }

  const handleConfirm = () => {
    if (!isValidTimeRange(tempDate, tempStartTime, tempEndTime, startPeriod, endPeriod)) {
      setTimeError("range")
      setErrorFieldsFlashing(["start", "end"])
      setTimeout(() => setErrorFieldsFlashing([]), 600)
      return
    }

    const start24 = to24Hour(tempStartTime, startPeriod)
    const end24 = to24Hour(tempEndTime, endPeriod)

    onDateChange(tempDate)
    onStartTimeChange(start24)
    onEndTimeChange(end24)
    setIsExpanded(false)
    setTimeError(null)
  }

  const handleCancel = () => {
    setTempDate(validDate)
    const startParts = validStartTime.split(":")
    const endParts = validEndTime.split(":")
    
    const sH = Number.parseInt(startParts[0])
    setStartHourInput(String(sH === 0 ? 12 : sH > 12 ? sH - 12 : sH))
    setStartMinutesInput(startParts[1])
    setStartPeriod(sH >= 12 ? "PM" : "AM")

    const eH = Number.parseInt(endParts[0])
    setEndHourInput(String(eH === 0 ? 12 : eH > 12 ? eH - 12 : eH))
    setEndMinutesInput(endParts[1])
    setEndPeriod(eH >= 12 ? "PM" : "AM")

    setIsExpanded(false)
    setTimeError(null)
  }

  const dateInputValue = (() => {
    const year = tempDate.getFullYear()
    const month = String(tempDate.getMonth() + 1).padStart(2, "0")
    const day = String(tempDate.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()

  const handleStartHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    setStartHourInput(value)
    if (value === "") return
    const num = Number.parseInt(value)
    if (num >= 1 && num <= 12) {
      const newTime = `${String(num).padStart(2, "0")}:${startMinutesInput}`
      setTempStartTime(newTime)
      updatePreview(tempDate, newTime, tempEndTime, startPeriod, endPeriod)
    }
  }

  const handleStartMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    setStartMinutesInput(value)
    const num = value === "" ? 0 : Number.parseInt(value)
    if (num <= 59) {
      const newTime = `${startHourInput.padStart(2, "0")}:${String(num).padStart(2, "0")}`
      setTempStartTime(newTime)
      updatePreview(tempDate, newTime, tempEndTime, startPeriod, endPeriod)
    }
  }

  const handleEndHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    setEndHourInput(value)
    if (value === "") return
    const num = Number.parseInt(value)
    if (num >= 1 && num <= 12) {
      const newTime = `${String(num).padStart(2, "0")}:${endMinutesInput}`
      setTempEndTime(newTime)
      updatePreview(tempDate, tempStartTime, newTime, startPeriod, endPeriod)
    }
  }

  const handleEndMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    setEndMinutesInput(value)
    const num = value === "" ? 0 : Number.parseInt(value)
    if (num <= 59) {
      const newTime = `${endHourInput.padStart(2, "0")}:${String(num).padStart(2, "0")}`
      setTempEndTime(newTime)
      updatePreview(tempDate, tempStartTime, newTime, startPeriod, endPeriod)
    }
  }

  if (isExpanded) {
    return (
      <div className="space-y-4 p-4 bg-background border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Edit Date & Time</h3>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Date
              </label>
              <input
                type="date"
                value={dateInputValue}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + "T00:00:00")
                  if (!isNaN(newDate.getTime())) {
                    setTempDate(newDate)
                    updatePreview(newDate, tempStartTime, tempEndTime, startPeriod, endPeriod)
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-8" />
            <div className="flex-1 space-y-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">Time</label>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Start Time</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startHourInput}
                    onChange={handleStartHourChange}
                    onFocus={(e) => e.target.select()}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <span className="text-muted-foreground">:</span>
                  <input
                    type="text"
                    value={startMinutesInput}
                    onChange={handleStartMinutesChange}
                    onFocus={(e) => e.target.select()}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <select
                    value={startPeriod}
                    onChange={(e) => {
                        const p = e.target.value as "AM" | "PM"
                        setStartPeriod(p)
                        updatePreview(tempDate, tempStartTime, tempEndTime, p, endPeriod)
                    }}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">End Time</p>
                <div className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${errorFieldsFlashing.includes("end") ? "bg-red-100 border border-red-400" : ""}`}>
                  <input
                    type="text"
                    value={endHourInput}
                    onChange={handleEndHourChange}
                    onFocus={(e) => e.target.select()}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <span className="text-muted-foreground">:</span>
                  <input
                    type="text"
                    value={endMinutesInput}
                    onChange={handleEndMinutesChange}
                    onFocus={(e) => e.target.select()}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <select
                    value={endPeriod}
                    onChange={(e) => {
                        const p = e.target.value as "AM" | "PM"
                        setEndPeriod(p)
                        updatePreview(tempDate, tempStartTime, tempEndTime, startPeriod, p)
                    }}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                {timeError === "range" && (
                  <p className="text-xs text-red-600 font-medium">Invalid time range or bounds</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <Button onClick={handleCancel} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1" disabled={timeError !== null}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsExpanded(true)}
      className="w-full text-left px-4 py-3 bg-muted/40 hover:bg-muted/60 border border-border rounded-lg transition-colors duration-200 group"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date & Time</p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-foreground font-medium">{formattedDate}</p>
            <span className="text-sm text-muted-foreground">
              {getDisplayTime(validStartTime)} – {getDisplayTime(validEndTime)}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition transform group-hover:translate-y-0.5" />
      </div>
    </button>
  )
}