"use client"
import { cn } from "@/lib/utils"

interface ViewSelectorProps {
  view: "month" | "week" | "day"
  setView: (view: "month" | "week" | "day") => void
}

export default function ViewSelector({ view, setView }: ViewSelectorProps) {
  const views = ["month", "week", "day"] as const

  return (
    <div className="flex gap-1">
      {views.map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={cn(
            "px-3 py-1.5 rounded text-xs font-medium transition capitalize",
            view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
