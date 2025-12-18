"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import type { Professor } from "@/app/admin/page"
import { cn } from "@/lib/utils"

interface ProfessorSidebarProps {
  professors: Professor[]
  selectedProfessor: Professor | null
  onSelectProfessor: (professor: Professor) => void
  onAddProfessor: () => void
  onDeleteProfessor: (id: number) => void
}

export default function ProfessorSidebar({
  professors,
  selectedProfessor,
  onSelectProfessor,
  onAddProfessor,
  onDeleteProfessor,
}: ProfessorSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Professors</h2>
        <Button onClick={onAddProfessor} size="sm" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Professor
        </Button>
      </div>

      {/* Professor List */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-1 p-4">
          {professors.map((professor) => (
            <div
              key={professor.id}
              className={cn(
                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition",
                selectedProfessor?.id === professor.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted",
              )}
              onClick={() => onSelectProfessor(professor)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{professor.name}</p>
                <p className="text-xs text-muted-foreground truncate">{professor.department}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteProfessor(professor.id)
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
