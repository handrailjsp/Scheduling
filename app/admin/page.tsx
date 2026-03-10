"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import ProfessorSidebar from "@/components/professor-sidebar"
import AdminCalendarGrid from "@/components/admin-calendar-grid"
import ProfessorFormModal from "@/components/professor-form-modal"
import { supabase } from "@/lib/supabase"

export interface Professor {
  id: number
  name: string
  title: string
  department: string
}

export interface TimetableSlot {
  id: number
  professorId: number
  dayOfWeek: number
  hour: number
  endHour: number
  subject: string
  room: string
  needsAC?: boolean
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
}

export default function AdminPage() {
  const router = useRouter()
  const [professors, setProfessors] = useState<Professor[]>([])
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null)
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([])
  const [showModal, setShowModal] = useState(false)
  
  // FIX: Ensure this is always current date
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const [loading, setLoading] = useState(true)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfessors()
    fetchAllTimetableSlots()
  }, [])

  const fetchProfessors = async () => {
    try {
      const { data, error } = await supabase.from('professors').select('*').order('name')
      if (error) throw error
      const formatted = data?.map((p: any) => ({
        id: p.id, name: p.name, title: p.title, department: p.department,
      })) || []
      setProfessors(formatted)
      if (formatted.length > 0 && !selectedProfessor) setSelectedProfessor(formatted[0])
    } catch (err) { console.error('Fetch Profs Error:', err) }
    finally { setLoading(false) }
  }

  const fetchAllTimetableSlots = async () => {
    try {
      const { data, error } = await supabase.from('timetable_slots').select('*')
      if (error) throw error
      const formatted = data?.map((slot: any) => ({
        id: slot.id,
        professorId: slot.professor_id,
        dayOfWeek: slot.day_of_week,
        hour: slot.hour,
        endHour: slot.end_hour,
        subject: slot.subject,
        room: slot.room,
        needsAC: slot.needs_ac,
      })) || []
      setTimetableSlots(formatted)
    } catch (err) { console.error('Fetch Slots Error:', err) }
  }

  const syncTimetable = async () => {
    try {
      const { error: deleteError } = await supabase.from('timetable_slots').delete().neq('id', -1);
      if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
      await new Promise(resolve => setTimeout(resolve, 400));

      if (timetableSlots.length > 0) {
        const payload = timetableSlots.map((s) => ({
          professor_id: s.professorId,
          day_of_week: s.dayOfWeek,
          hour: s.hour,
          end_hour: s.endHour,
          subject: s.subject,
          room: s.room,
          needs_ac: s.needsAC,
        }));
        const { error: insertErr } = await supabase.from('timetable_slots').insert(payload);
        if (insertErr) throw new Error(`Sync failed: ${insertErr.message}`);
      }
    } catch (e: any) { throw e; }
  };

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      await syncTimetable();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/generate-schedule?runs=3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        setScheduleResult({
          id: data.schedule_id,
          fitness_score: data.fitness_score,
          hard_constraint_violations: data.hard_violations,
          soft_constraint_score: data.soft_score,
          gini_workload: data.gini_workload,
          gini_room_usage: data.gini_room_usage,
          gini_ac_access: data.gini_ac_access,
          status: data.auto_approved ? "approved" : "pending",
          notes: data.message || "Optimized"
        });
        if (data.auto_approved) await fetchAllTimetableSlots();
      } else {
        setScheduleError(data.message);
      }
    } catch (err: any) {
      setScheduleError(err.message);
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleAddProfessor = async (prof: Omit<Professor, "id">) => {
    const { error } = await supabase.from('professors').insert([prof]);
    if (error) alert(error.message);
    else fetchProfessors();
    setShowModal(false);
  };

  const handleAddTimetableSlot = async (slot: Omit<TimetableSlot, "id">) => {
    const { error } = await supabase.from('timetable_slots').insert([{
      professor_id: slot.professorId, day_of_week: slot.dayOfWeek,
      hour: slot.hour, end_hour: slot.endHour,
      subject: slot.subject, room: slot.room, needs_ac: slot.needsAC,
    }]);
    if (error) alert(error.message);
    else await fetchAllTimetableSlots();
  };

  const handleUpdateTimetableSlot = async (id: number, updates: Omit<TimetableSlot, "id">) => {
    const { error } = await supabase.from('timetable_slots').update({
      professor_id: updates.professorId, day_of_week: updates.dayOfWeek,
      hour: updates.hour, end_hour: updates.endHour,
      subject: updates.subject, room: updates.room, needs_ac: updates.needsAC,
    }).eq('id', id);
    if (error) alert(error.message);
    else await fetchAllTimetableSlots();
  };

  const handleDeleteTimetableSlot = async (id: number) => {
    await supabase.from('timetable_slots').delete().eq('id', id);
    await fetchAllTimetableSlots();
  };

  const handleDeleteProfessor = async (id: number) => {
    if (!confirm("Delete professor and all their slots?")) return;
    await supabase.from('timetable_slots').delete().eq('professor_id', id);
    await supabase.from('professors').delete().eq('id', id);
    fetchProfessors();
    fetchAllTimetableSlots();
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex h-screen bg-background text-foreground">
      <ProfessorSidebar
        professors={professors}
        selectedProfessor={selectedProfessor}
        onSelectProfessor={setSelectedProfessor}
        onAddProfessor={() => setShowModal(true)}
        onDeleteProfessor={handleDeleteProfessor}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            {selectedProfessor && <p className="text-sm text-muted-foreground">{selectedProfessor.name}</p>}
          </div>
          <Button onClick={() => router.push("/")} variant="ghost" size="icon"><LogOut className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-auto">
          {selectedProfessor ? (
            <AdminCalendarGrid
              professor={selectedProfessor}
              timetableSlots={timetableSlots.filter((slot) => slot.professorId === selectedProfessor.id)}
              onAddSlot={handleAddTimetableSlot}
              onUpdateSlot={handleUpdateTimetableSlot}
              onDeleteSlot={handleDeleteTimetableSlot}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          ) : (
            <div className="h-full flex items-center justify-center">Select a professor to manage schedule</div>
          )}
        </div>
        
        {/* AI Action Panel */}
        <div className="fixed bottom-6 right-6 w-96 bg-card border border-border p-5 rounded-xl shadow-2xl z-50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">AI Timetable Engine</h3>
          </div>
          <Button 
            onClick={handleGenerateSchedule} 
            disabled={generatingSchedule}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white mb-4"
          >
            {generatingSchedule ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generatingSchedule ? "Optimizing..." : "Generate Schedule"}
          </Button>

          {scheduleError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{scheduleError}</p>
            </div>
          )}

          {scheduleResult && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span>GA RESULT</span>
                <span>#{scheduleResult.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Conflicts</p>
                  <p className="font-bold">{scheduleResult.hard_constraint_violations}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quality</p>
                  <p className="font-bold">{scheduleResult.soft_constraint_score}%</p>
                </div>
              </div>
              {scheduleResult.status === "approved" && (
                <div className="flex items-center gap-2 text-green-600 font-semibold pt-2 border-t border-green-500/20">
                  <CheckCircle className="h-4 w-4" /> Schedule Live
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