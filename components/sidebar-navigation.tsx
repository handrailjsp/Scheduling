"use client"

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarNavigationProps {
  currentDate: Date
  onSelectDate: (date: Date) => void
  view: "month" | "week" | "day"
  onViewChange: (view: "month" | "week" | "day") => void
}

export default function SidebarNavigation({ currentDate, onSelectDate, view, onViewChange }: SidebarNavigationProps) {
  const [displayMonth, setDisplayMonth] = React.useState(new Date(currentDate))

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))
  }

  const days = []
  const daysInMonth = getDaysInMonth(displayMonth)
  const firstDay = getFirstDayOfMonth(displayMonth)

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const isToday = (day: number | null) => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      displayMonth.getMonth() === today.getMonth() &&
      displayMonth.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="w-72 border-r border-border bg-muted/20 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="space-y-2">
          <Button
            onClick={() => onViewChange("week")}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm font-medium transition-colors",
              view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Week
          </Button>
          <Button
            onClick={() => onViewChange("month")}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm font-medium transition-colors",
              view === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Month
          </Button>
          <Button
            onClick={() => onViewChange("day")}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm font-medium transition-colors",
              view === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Day
          </Button>
        </div>
      </div>

      <div className="p-6 border-b border-border flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              {displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <div className="flex gap-1">
              <Button
                onClick={handlePrevMonth}
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-border text-muted-foreground"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                onClick={handleNextMonth}
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-border text-muted-foreground"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => {
                  if (day) {
                    onSelectDate(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day))
                  }
                }}
                className={cn(
                  "text-xs p-1 text-center rounded transition-colors",
                  !day && "opacity-0 pointer-events-none",
                  day && isToday(day) && "bg-primary text-primary-foreground font-semibold",
                  day && !isToday(day) && "text-foreground hover:bg-border",
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
