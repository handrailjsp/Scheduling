"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LogOut, Sparkles, Loader2, CheckCircle,
  AlertCircle, DoorOpen, ChevronDown, ChevronUp, X, TriangleAlert, Trash2
} from "lucide-react"
import ProfessorSidebar from "@/components/professor-sidebar"
import AdminCalendarGrid from "@/components/admin-calendar-grid"
import ProfessorFormModal from "@/components/professor-form-modal"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export interface Professor {
  id: string
  name: string
  title: string
  department: string
}

export interface TimetableSlot {
  id: string
  professorId: string
  dayOfWeek: number
  hour: number | null
  endHour: number | null
  subject: string
  room: string
  section?: string
  needsAC?: boolean
  aiAssignTime?: boolean
}

export interface ScheduleResult {
  id: number
  fitness_score: number
  hard_constraint_violations: number
  soft_constraint_score: number
  gini_workload?: number
  gini_room_usage?: number
  gini_ac_access?: number
  status: string
  notes: string
  capacity_warnings?: string[]
}

interface RoomStatus {
  id: string
  is_ac: boolean
  room_type: string
  total_hours_booked: number
}

interface ToastState {
  message: string
  type: "success" | "error" | "info"
}

interface ConfirmState {
  message: string
  onConfirm: () => void
}

const ROOM_LIST: RoomStatus[] = [
  { id: "322",   is_ac: true,  room_type: "Lecture",    total_hours_booked: 0 },
  { id: "324",   is_ac: true,  room_type: "Lecture",    total_hours_booked: 0 },
  { id: "326",   is_ac: true,  room_type: "Lecture",    total_hours_booked: 0 },
  { id: "328",   is_ac: true,  room_type: "Lecture",    total_hours_booked: 0 },
  { id: "LAB A", is_ac: false, room_type: "Laboratory", total_hours_booked: 0 },
  { id: "LAB B", is_ac: false, room_type: "Laboratory", total_hours_booked: 0 },
  { id: "LAB C", is_ac: false, room_type: "Laboratory", total_hours_booked: 0 },
  { id: "LAB D", is_ac: false, room_type: "Laboratory", total_hours_booked: 0 },
]

export default function AdminPage() {
  const router = useRouter()
  const [professors, setProfessors]               = useState<Professor[]>([])
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null)
  const [timetableSlots, setTimetableSlots]       = useState<TimetableSlot[]>([])
  const [showModal, setShowModal]                 = useState(false)
  const [currentDate, setCurrentDate]             = useState<Date>(new Date())
  const [loading, setLoading]                     = useState(true)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [scheduleResult, setScheduleResult]       = useState<ScheduleResult | null>(null)
  const [scheduleError, setScheduleError]         = useState<string | null>(null)
  const [toast, setToast]                         = useState<ToastState | null>(null)
  const [confirmDialog, setConfirmDialog]         = useState<ConfirmState | null>(null)
  const [roomsData, setRoomsData]                 = useState<RoomStatus[]>([])
  const [showRooms, setShowRooms]                 = useState(false)
  const [showAIPanel, setShowAIPanel]             = useState(false)
  const [loadingRooms, setLoadingRooms]           = useState(false)
  const maxHoursInWeek = 40

  useEffect(() => {
    const init = async () => {
      await fetchProfessors()
      await fetchAllTimetableSlots()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast   = (message: string, type: ToastState["type"]) => setToast({ message, type })
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ message, onConfirm })

  const fetchRooms = async () => {
    setLoadingRooms(true)
    try {
      const { data, error } = await supabase.from("timetable_slots").select("room, hour, end_hour")
      if (error) throw error

      const roomHours: Record<string, number> = {}
      for (const slot of data ?? []) {
        const room = slot.room
        if (!room || room === "PENDING" || room === "AUTO" || room === "TBD") continue
        const h = slot.hour ?? 0
        const e = slot.end_hour ?? h + 1
        roomHours[room] = (roomHours[room] ?? 0) + (e - h)
      }

      setRoomsData(ROOM_LIST.map(r => ({ ...r, total_hours_booked: roomHours[r.id] ?? 0 })))
    } catch {
      showToast("Could not load room data", "error")
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleToggleRooms = () => {
    if (!showRooms) fetchRooms()
    setShowRooms(prev => !prev)
  }

  const fetchProfessors = async () => {
    try {
      const { data, error } = await supabase.from("professors").select("*").order("name")
      if (error) throw error
      const formatted: Professor[] = (data ?? []).map((p: any) => ({
        id: String(p.id), name: p.name, title: p.title, department: p.department,
      }))
      setProfessors(formatted)
      if (formatted.length > 0 && !selectedProfessor) setSelectedProfessor(formatted[0])
    } catch (err: any) {
      showToast("Failed to load professors: " + err.message, "error")
    }
  }

  const handleAddProfessor = async (prof: Omit<Professor, "id">) => {
    const { error } = await supabase.from("professors").insert([prof])
    if (error) { showToast(error.message, "error") }
    else { await fetchProfessors(); setShowModal(false); showToast("Professor added successfully", "success") }
  }

  const handleDeleteProfessor = async (id: string) => {
    showConfirm("Delete this professor and all their slots?", async () => {
      setLoading(true)
      try {
        await supabase.from("timetable_slots").delete().eq("professor_id", id)
        await supabase.from("professors").delete().eq("id", id)
        if (selectedProfessor?.id === id) setSelectedProfessor(null)
        await fetchProfessors()
        await fetchAllTimetableSlots()
        showToast("Professor deleted", "success")
      } catch (err: any) {
        showToast(err.message, "error")
      } finally {
        setLoading(false)
      }
    })
  }

  const fetchAllTimetableSlots = async () => {
    try {
      const { data, error } = await supabase.from("timetable_slots").select("*")
      if (error) throw error
      const formatted: TimetableSlot[] = (data ?? []).map((slot: any) => ({
        id:          String(slot.id),
        professorId: String(slot.professor_id),
        dayOfWeek:   slot.day_of_week,
        hour:        slot.hour,
        endHour:     slot.end_hour,
        subject:     slot.subject,
        room:        slot.room,
        section:     slot.section,
        needsAC:     slot.needs_ac,
        aiAssignTime: slot.ai_assign_time,
      }))
      setTimetableSlots(formatted)
    } catch (err: any) {
      showToast("Failed to load slots: " + err.message, "error")
    }
  }

  const handleClearAllSchedules = () => {
    showConfirm(
      "This will permanently delete ALL timetable slots for ALL professors. This cannot be undone. Continue?",
      async () => {
        setLoading(true)
        try {
          const d = new Date(currentDate)
          d.setDate(d.getDate() - d.getDay())
          const weekStart = d.toISOString().slice(0, 10)
          
          // Delete slots for this week
          const { error } = await supabase
            .from("timetable_slots")
            .delete()
            .eq("week_start", weekStart)
          if (error) throw error

          // Also delete legacy slots with no week_start (created before week scoping)
          const { error: legacyError } = await supabase
            .from("timetable_slots")
            .delete()
            .is("week_start", null)
          if (legacyError) throw legacyError
          await fetchAllTimetableSlots()
          setScheduleResult(null)
          showToast("All schedules cleared", "success")
        } catch (err: any) {
          showToast("Failed to clear schedules: " + err.message, "error")
        } finally {
          setLoading(false)
        }
      }
    )
  }

  const pendingCount = timetableSlots.filter(
    s => s.room === "PENDING" || s.room === "AUTO" || s.room === "TBD" || !s.room,
  ).length

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true)
    setScheduleError(null)
    setScheduleResult(null)

    try {
      const apiUrl   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/api/generate-schedule?runs=1`, { method: "POST" })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `API Error: ${response.status}`)
      }
      const data = await response.json()
      if (data.success) {
        setScheduleResult({
          id:                         data.schedule_id,
          fitness_score:              data.fitness_score,
          hard_constraint_violations: data.hard_violations,
          soft_constraint_score:      data.soft_score,
          gini_workload:              data.gini_workload,
          gini_room_usage:            data.gini_room_usage,
          gini_ac_access:             data.gini_ac_access,
          status:                     data.auto_approved ? "approved" : "pending",
          notes:                      data.message || "Optimized",
          capacity_warnings:          data.capacity_warnings || [],
        })
        await fetchAllTimetableSlots()
        if (showRooms) await fetchRooms()
        showToast("Schedule generated successfully", "success")
      } else {
        setScheduleError(data.detail || data.message || "Unknown error")
      }
    } catch (err: any) {
      setScheduleError(err.message)
    } finally {
      setGeneratingSchedule(false)
    }
  }

  const handleAddTimetableSlot = async (slot: Omit<TimetableSlot, "id">) => {
    const { error } = await supabase.from("timetable_slots").insert([{
      professor_id:   slot.professorId,
      day_of_week:    slot.dayOfWeek,
      hour:           slot.hour ?? null,
      end_hour:       slot.endHour ?? null,
      subject:        slot.subject,
      room:           slot.aiAssignTime ? "AUTO" : "PENDING",
      section:        slot.section ?? "",
      needs_ac:       slot.needsAC,
      ai_assign_time: slot.aiAssignTime ?? true,
    }])
    if (error) { showToast(error.message, "error") }
    else { await fetchAllTimetableSlots() }
  }

  const handleUpdateTimetableSlot = async (id: string, updates: Omit<TimetableSlot, "id">) => {
    const { error } = await supabase.from("timetable_slots").update({
      professor_id:   updates.professorId,
      day_of_week:    updates.dayOfWeek,
      hour:           updates.hour ?? null,
      end_hour:       updates.endHour ?? null,
      subject:        updates.subject,
      section:        updates.section ?? "",
      needs_ac:       updates.needsAC,
      ai_assign_time: updates.aiAssignTime ?? true,
    }).eq("id", id)
    if (error) { showToast(error.message, "error") }
    else { await fetchAllTimetableSlots() }
  }

  const handleDeleteTimetableSlot = async (id: string) => {
    showConfirm("Delete this slot?", async () => {
      await supabase.from("timetable_slots").delete().eq("id", id)
      await fetchAllTimetableSlots()
      showToast("Slot deleted", "success")
    })
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-lg shadow-xl text-white text-sm font-medium flex items-center gap-3 min-w-72 animate-in fade-in slide-in-from-top-2",
          toast.type === "success" && "bg-green-600",
          toast.type === "error"   && "bg-red-600",
          toast.type === "info"    && "bg-blue-600",
        )}>
          {toast.type === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.type === "error"   && <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.type === "info"    && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-sm font-medium text-foreground mb-5">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      <ProfessorSidebar
        professors={professors}
        selectedProfessor={selectedProfessor}
        onSelectProfessor={setSelectedProfessor}
        onAddProfessor={() => setShowModal(true)}
        onDeleteProfessor={handleDeleteProfessor}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            {selectedProfessor && <p className="text-sm text-muted-foreground">{selectedProfessor.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                <TriangleAlert className="w-3.5 h-3.5" />
                {pendingCount} slot{pendingCount > 1 ? "s" : ""} pending — run Generate Schedule
              </div>
            )}
            <Button
              onClick={handleClearAllSchedules}
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-semibold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Schedules
            </Button>
            <Button onClick={() => router.push("/")} variant="ghost" size="icon">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedProfessor ? (
            <AdminCalendarGrid
              professor={selectedProfessor}
              timetableSlots={timetableSlots.filter(s => s.professorId === selectedProfessor.id)}
              allSlots={timetableSlots}
              onAddSlot={handleAddTimetableSlot}
              onUpdateSlot={handleUpdateTimetableSlot}
              onDeleteSlot={handleDeleteTimetableSlot}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a professor to manage schedule
            </div>
          )}
        </div>
      </div>

      {/* Collapsible bottom-right panels */}
      <div className="fixed bottom-6 right-6 w-96 z-50 flex flex-col gap-3">

        {/* Room Availability */}
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={handleToggleRooms}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">Room Availability</span>
            </div>
            {showRooms ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showRooms && (
            <div className="px-5 pb-4 border-t border-border">
              {loadingRooms ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
              ) : (
                <div className="space-y-2 pt-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground mb-2">
                    <span>Room</span><span>Hours Booked</span>
                  </div>
                  {roomsData.map(room => {
                    const pct    = Math.min((room.total_hours_booked / maxHoursInWeek) * 100, 100)
                    const isFree = room.total_hours_booked === 0
                    return (
                      <div key={room.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", isFree ? "bg-green-500" : "bg-orange-500")} />
                            <span className="text-xs font-semibold">{room.id}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">
                              {room.room_type}{room.is_ac && " · AC"}
                            </span>
                          </div>
                          <span className={cn("text-[10px] font-bold", isFree ? "text-green-600" : "text-orange-600")}>
                            {room.total_hours_booked}h
                          </span>
                        </div>
                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isFree ? "bg-green-400" : pct > 60 ? "bg-red-500" : "bg-orange-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={fetchRooms} className="text-[10px] text-primary hover:underline pt-1 block">Refresh</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Timetable Engine */}
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={() => setShowAIPanel(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="font-semibold text-sm">AI Timetable Engine</span>
              {scheduleResult && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  scheduleResult.hard_constraint_violations === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                )}>
                  {scheduleResult.hard_constraint_violations === 0 ? "Optimal" : `${scheduleResult.hard_constraint_violations} conflicts`}
                </span>
              )}
            </div>
            {showAIPanel ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showAIPanel && (
            <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
              <Button
                onClick={handleGenerateSchedule}
                disabled={generatingSchedule}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
              >
                {generatingSchedule ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generatingSchedule ? "Optimizing..." : "Generate Schedule"}
              </Button>

              {scheduleError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><p>{scheduleError}</p>
                </div>
              )}

              {scheduleResult && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg text-xs space-y-3">
                  <div className="flex justify-between font-bold text-purple-700">
                    <span>GA OPTIMIZATION RESULT</span>
                    <span>#{scheduleResult.id}</span>
                  </div>

                  {scheduleResult.capacity_warnings && scheduleResult.capacity_warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 space-y-1">
                      <p className="font-bold text-amber-700 flex items-center gap-1">
                        <TriangleAlert className="w-3 h-3" />Capacity Warnings
                      </p>
                      {scheduleResult.capacity_warnings.map((w, i) => <p key={i} className="text-amber-600 text-[10px]">{w}</p>)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background p-2 rounded border border-border">
                      <p className="text-muted-foreground text-[10px]">Conflicts</p>
                      <p className={cn("font-bold text-lg", scheduleResult.hard_constraint_violations > 0 ? "text-red-500" : "text-green-500")}>
                        {scheduleResult.hard_constraint_violations}
                      </p>
                    </div>
                    <div className="bg-background p-2 rounded border border-border">
                      <p className="text-muted-foreground text-[10px]">Gini AC Fairness</p>
                      <p className="font-bold text-lg">{scheduleResult.gini_ac_access?.toFixed(3) ?? "0.000"}</p>
                    </div>
                    <div className="bg-background p-2 rounded border border-border">
                      <p className="text-muted-foreground text-[10px]">Workload Gini</p>
                      <p className="font-bold text-sm">{scheduleResult.gini_workload?.toFixed(3) ?? "0.000"}</p>
                    </div>
                    <div className="bg-background p-2 rounded border border-border">
                      <p className="text-muted-foreground text-[10px]">Room Gini</p>
                      <p className="font-bold text-sm">{scheduleResult.gini_room_usage?.toFixed(3) ?? "0.000"}</p>
                    </div>
                  </div>

                  {scheduleResult.status === "approved" && (
                    <div className="flex items-center gap-2 text-green-600 font-bold pt-2 border-t border-green-500/20">
                      <CheckCircle className="h-4 w-4" />Optimal Schedule Found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && <ProfessorFormModal onSubmit={handleAddProfessor} onClose={() => setShowModal(false)} />}
    </div>
  )
}