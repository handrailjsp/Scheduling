"use client"

import { useState } from "react"
import { Plus, Trash2, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Professor } from "@/app/admin/page"
import { cn } from "@/lib/utils"

interface ProfessorSidebarProps {
  professors: Professor[]
  selectedProfessor: Professor | null
  onSelectProfessor: (professor: Professor) => void
  onAddProfessor: () => void
  onDeleteProfessor: (id: string) => void
}

export default function ProfessorSidebar({
  professors,
  selectedProfessor,
  onSelectProfessor,
  onAddProfessor,
  onDeleteProfessor,
}: ProfessorSidebarProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
        >
          <User className="w-4 h-4" />
          Professors
          {expanded ? (
            <ChevronUp className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto" />
          )}
        </button>
        <Button
          onClick={onAddProfessor}
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto py-2">
          {professors.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              No professors yet. Add one to get started.
            </p>
          ) : (
            professors.map(prof => (
              <div
                key={prof.id}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50",
                  selectedProfessor?.id === prof.id && "bg-primary/10 border-r-2 border-primary",
                )}
                onClick={() => onSelectProfessor(prof)}
              >
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    selectedProfessor?.id === prof.id
                      ? "text-primary"
                      : "text-foreground",
                  )}>
                    {prof.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {prof.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {prof.department}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onDeleteProfessor(prof.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded shrink-0 ml-2"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}