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
}

export default function DateTimePicker({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onPreviewUpdate,
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

  const [timeError, setTimeError] = useState<"start" | "end" | null>(null)
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

    // Validate inputs
    if (hour < 1 || hour > 12) hour = 12
    if (minutes < 0 || minutes > 59) return "00:00"

    // Convert 12-hour to 24-hour format
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

    // Create a new date to avoid mutation
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
    // Validate time format first
    if (!checkStartTime.match(/^\d{2}:\d{2}$/) || !checkEndTime.match(/^\d{2}:\d{2}$/)) {
      return false
    }

    const start24 = to24Hour(checkStartTime, checkStartPeriod)
    const end24 = to24Hour(checkEndTime, checkEndPeriod)

    // Validate conversion results
    if (!start24.match(/^\d{2}:\d{2}$/) || !end24.match(/^\d{2}:\d{2}$/)) {
      return false
    }

    const startTimestamp = getFullTimestamp(checkDate, start24)
    const endTimestamp = getFullTimestamp(checkDate, end24)

    // End time must be strictly after start time
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

    // Only update preview if times are valid
    if (isValidTimeRange(newDate, newStartTime, newEndTime, newStartPeriod, newEndPeriod)) {
      setTimeError(null)
      setErrorFieldsFlashing([])
      onPreviewUpdate?.(newDate, start24, end24)
    } else {
      // Mark end time as error since it's invalid relative to start
      setTimeError("end")
      setErrorFieldsFlashing(["start", "end"])
      setTimeout(() => setErrorFieldsFlashing([]), 600)
    }
  }

  const handleConfirm = () => {
    if (!isValidTimeRange(tempDate, tempStartTime, tempEndTime, startPeriod, endPeriod)) {
      setTimeError("end")
      setErrorFieldsFlashing(["start", "end"])
      setTimeout(() => setErrorFieldsFlashing([]), 600)
      return
    }

    const start24 = to24Hour(tempStartTime, startPeriod)
    const end24 = to24Hour(tempEndTime, endPeriod)

    console.log(
      "[v0] Confirming times - Input: Start",
      tempStartTime,
      startPeriod,
      "-> Output:",
      start24,
      "| End",
      tempEndTime,
      endPeriod,
      "->",
      end24,
    )

    // Persist changes to parent state
    onDateChange(tempDate)
    onStartTimeChange(start24)
    onEndTimeChange(end24)
    setIsExpanded(false)
    setTimeError(null)
    setErrorFieldsFlashing([])
  }

  const handleCancel = () => {
    setTempDate(validDate)
    setTempStartTime(validStartTime)
    setTempEndTime(validEndTime)

    const startHour = Number.parseInt(validStartTime.split(":")[0])
    const startDisplayHour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour
    setStartHourInput(String(startDisplayHour))
    setStartMinutesInput(validStartTime.split(":")[1] || "00")

    const endHour = Number.parseInt(validEndTime.split(":")[0])
    const endDisplayHour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour
    setEndHourInput(String(endDisplayHour))
    setEndMinutesInput(validEndTime.split(":")[1] || "00")

    setStartPeriod(Number.parseInt(validStartTime.split(":")[0]) >= 12 ? "PM" : "AM")
    setEndPeriod(Number.parseInt(validEndTime.split(":")[0]) >= 12 ? "PM" : "AM")
    setIsExpanded(false)
    setTimeError(null)
    setErrorFieldsFlashing([])
  }

  const dateInputValue = (() => {
    const year = tempDate.getFullYear()
    const month = String(tempDate.getMonth() + 1).padStart(2, "0")
    const day = String(tempDate.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()

  const handleTimeInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const handleStartHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)

    setStartHourInput(value)

    if (value === "") return

    const numValue = Number.parseInt(value)

    if (numValue >= 1 && numValue <= 12) {
      const paddedValue = String(numValue).padStart(2, "0")
      const newTime = `${paddedValue}:${startMinutesInput.padStart(2, "0")}`
      setTempStartTime(newTime)
      updatePreview(tempDate, newTime, tempEndTime, startPeriod, endPeriod)
    }
  }

  const handleStartMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)

    setStartMinutesInput(value)

    if (value === "") {
      setStartMinutesInput("00")
      const newTime = `${startHourInput.padStart(2, "0")}:00`
      setTempStartTime(newTime)
      updatePreview(tempDate, newTime, tempEndTime, startPeriod, endPeriod)
      return
    }

    const numValue = Number.parseInt(value)
    if (numValue <= 59) {
      const paddedValue = String(numValue).padStart(2, "0")
      const newTime = `${startHourInput.padStart(2, "0")}:${paddedValue}`
      setTempStartTime(newTime)
      updatePreview(tempDate, newTime, tempEndTime, startPeriod, endPeriod)
    }
  }

  const handleEndHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)

    setEndHourInput(value)

    if (value === "") return

    const numValue = Number.parseInt(value)

    if (numValue >= 1 && numValue <= 12) {
      const paddedValue = String(numValue).padStart(2, "0")
      const newTime = `${paddedValue}:${endMinutesInput.padStart(2, "0")}`
      setTempEndTime(newTime)
      updatePreview(tempDate, tempStartTime, newTime, startPeriod, endPeriod)
    }
  }

  const handleEndMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)

    setEndMinutesInput(value)

    if (value === "") {
      setEndMinutesInput("00")
      const newTime = `${endHourInput.padStart(2, "0")}:00`
      setTempEndTime(newTime)
      updatePreview(tempDate, tempStartTime, newTime, startPeriod, endPeriod)
      return
    }

    const numValue = Number.parseInt(value)
    if (numValue <= 59) {
      const paddedValue = String(numValue).padStart(2, "0")
      const newTime = `${endHourInput.padStart(2, "0")}:${paddedValue}`
      setTempEndTime(newTime)
      updatePreview(tempDate, tempStartTime, newTime, startPeriod, endPeriod)
    }
  }

  const handleStartPeriodChange = (newPeriod: "AM" | "PM") => {
    setStartPeriod(newPeriod)
    updatePreview(tempDate, tempStartTime, tempEndTime, newPeriod, endPeriod)
  }

  const handleEndPeriodChange = (newPeriod: "AM" | "PM") => {
    setEndPeriod(newPeriod)
    updatePreview(tempDate, tempStartTime, tempEndTime, startPeriod, newPeriod)
  }

  const handleDateChange = (newDate: Date) => {
    setTempDate(newDate)
    updatePreview(newDate, tempStartTime, tempEndTime, startPeriod, endPeriod)
  }

  if (isExpanded) {
    return (
      <div className="space-y-4 p-4 bg-background border border-border rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Edit Date & Time</h3>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date Section */}
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
                    handleDateChange(newDate)
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Time Section */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-8" />
            <div className="flex-1 space-y-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">Time</label>

              {/* Start Time */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Start Time</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="HH"
                    value={startHourInput}
                    onChange={handleStartHourChange}
                    onFocus={handleTimeInputFocus}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <span className="text-muted-foreground">:</span>
                  <input
                    type="text"
                    placeholder="MM"
                    value={startMinutesInput}
                    onChange={handleStartMinutesChange}
                    onFocus={handleTimeInputFocus}
                    maxLength={2}
                    className="w-16 px-2 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-base"
                  />
                  <select
                    value={startPeriod}
                    onChange={(e) => handleStartPeriodChange(e.target.value as "AM" | "PM")}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* End Time - with red flash on validation error */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">End Time</p>
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                    errorFieldsFlashing.includes("end") ? "bg-red-100 border border-red-400" : ""
                  }`}
                >
                  <input
                    type="text"
                    placeholder="HH"
                    value={endHourInput}
                    onChange={handleEndHourChange}
                    onFocus={handleTimeInputFocus}
                    maxLength={2}
                    className={`w-16 px-2 py-2 border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 font-mono text-base transition-colors ${
                      errorFieldsFlashing.includes("end")
                        ? "border-red-400 focus:ring-red-300"
                        : "border-border focus:ring-primary/30"
                    }`}
                  />
                  <span className="text-muted-foreground">:</span>
                  <input
                    type="text"
                    placeholder="MM"
                    value={endMinutesInput}
                    onChange={handleEndMinutesChange}
                    onFocus={handleTimeInputFocus}
                    maxLength={2}
                    className={`w-16 px-2 py-2 border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 font-mono text-base transition-colors ${
                      errorFieldsFlashing.includes("end")
                        ? "border-red-400 focus:ring-red-300"
                        : "border-border focus:ring-primary/30"
                    }`}
                  />
                  <select
                    value={endPeriod}
                    onChange={(e) => handleEndPeriodChange(e.target.value as "AM" | "PM")}
                    className={`px-3 py-2 border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 cursor-pointer transition-colors ${
                      errorFieldsFlashing.includes("end")
                        ? "border-red-400 focus:ring-red-300"
                        : "border-border focus:ring-primary/30"
                    }`}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                {timeError === "end" && (
                  <p className="text-xs text-red-600 font-medium">End time must be after start time</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
