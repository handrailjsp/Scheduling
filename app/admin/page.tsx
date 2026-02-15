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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // Fetch professors on mount
  useEffect(() => {
    fetchProfessors()
  }, [])

  // Fetch timetable slots when professor changes
  useEffect(() => {
    if (selectedProfessor) {
      fetchTimetableSlots(selectedProfessor.id)
    }
  }, [selectedProfessor])

  const fetchProfessors = async () => {
    try {
      const { data, error } = await supabase
        .from('professors')
        .select('*')
        .order('name')

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      const formattedProfessors = data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        department: p.department,
      })) || []

      setProfessors(formattedProfessors)
      if (formattedProfessors.length > 0 && !selectedProfessor) {
        setSelectedProfessor(formattedProfessors[0])
      }
    } catch (error: any) {
      console.error('Error fetching professors:', error)
      alert(`Database Error: ${error?.message || 'Failed to fetch professors. Check console for details.'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimetableSlots = async (professorId: number) => {
    try {
      const { data, error } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('professor_id', professorId)

      if (error) throw error

      const formattedSlots = data?.map((slot: any) => ({
        id: slot.id,
        professorId: slot.professor_id,
        dayOfWeek: slot.day_of_week,
        hour: slot.hour,
        endHour: slot.end_hour,
        subject: slot.subject,
        room: slot.room,
        needsAC: slot.needs_ac,
      })) || []

      setTimetableSlots(formattedSlots)
    } catch (error) {
      console.error('Error fetching timetable slots:', error)
    }
  }

  const handleAddProfessor = async (professorData: Omit<Professor, "id">) => {
    try {
      const { data, error } = await supabase
        .from('professors')
        .insert([professorData])
        .select()
        .single()

      if (error) throw error

      const newProfessor: Professor = {
        id: data.id,
        name: data.name,
        title: data.title,
        department: data.department,
      }

      setProfessors([...professors, newProfessor])
      setSelectedProfessor(newProfessor)
      setShowModal(false)
    } catch (error) {
      console.error('Error adding professor:', error)
    }
  }

  const handleDeleteProfessor = async (id: number) => {
    try {
      // First, delete all timetable slots for this professor
      const { error: slotsError } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('professor_id', id)

      if (slotsError) {
        console.error('Error deleting professor slots:', slotsError)
        alert(`Failed to delete professor's schedule: ${slotsError.message}`)
        return
      }

      // Then delete the professor
      const { error } = await supabase
        .from('professors')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting professor:', error)
        alert(`Failed to delete professor: ${error.message}`)
        return
      }

      const updatedProfessors = professors.filter((p: Professor) => p.id !== id)
      setProfessors(updatedProfessors)
      setTimetableSlots([])
      setSelectedProfessor(updatedProfessors[0] || null)
    } catch (error) {
      console.error('Error deleting professor:', error)
      alert('An unexpected error occurred while deleting the professor')
    }
  }

  const handleAddTimetableSlot = async (slot: Omit<TimetableSlot, "id">) => {
    try {
      const { data, error } = await supabase
        .from('timetable_slots')
        .insert([{
          professor_id: slot.professorId,
          day_of_week: slot.dayOfWeek,
          hour: slot.hour,
          end_hour: slot.endHour,
          subject: slot.subject,
          room: slot.room,
          needs_ac: slot.needsAC,
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding timetable slot:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Failed to add timetable slot: ${error.message}`)
        return
      }

      const newSlot: TimetableSlot = {
        id: data.id,
        professorId: data.professor_id,
        dayOfWeek: data.day_of_week,
        hour: data.hour,
        endHour: data.end_hour,
        subject: data.subject,
        room: data.room,
        needsAC: data.needs_ac,
      }

      setTimetableSlots([...timetableSlots, newSlot])
    } catch (error) {
      console.error('Error adding timetable slot:', error)
      alert('An unexpected error occurred while adding the timetable slot')
    }
  }

  const handleUpdateTimetableSlot = async (id: number, updates: Omit<TimetableSlot, "id">) => {
    try {
      const { error } = await supabase
        .from('timetable_slots')
        .update({
          professor_id: updates.professorId,
          day_of_week: updates.dayOfWeek,
          hour: updates.hour,
          end_hour: updates.endHour,
          subject: updates.subject,
          room: updates.room,
          needs_ac: updates.needsAC,
        })
        .eq('id', id)

      if (error) {
        console.error('Supabase error updating timetable slot:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Failed to update timetable slot: ${error.message}`)
        return
      }

      setTimetableSlots(timetableSlots.map((slot: TimetableSlot) => (slot.id === id ? { id, ...updates } : slot)))
    } catch (error) {
      console.error('Error updating timetable slot:', error)
      alert('An unexpected error occurred while updating the timetable slot')
    }
  }

  const handleDeleteTimetableSlot = async (id: number) => {
    try {
      const { error } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase error deleting timetable slot:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Failed to delete timetable slot: ${error.message}`)
        return
      }

      setTimetableSlots(timetableSlots.filter((slot: TimetableSlot) => slot.id !== id))
    } catch (error) {
      console.error('Error deleting timetable slot:', error)
      alert('An unexpected error occurred while deleting the timetable slot')
    }
  }

  const handleLogout = () => {
    router.push("/")
  }

// ...existing code...
  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log(`🚀 AUTO-OPTIMIZE: Generating multiple schedules and picking best...`);
      
      // Auto-optimize: runs=3 means it generates 3 schedules and picks the best
      const response = await fetch(`${apiUrl}/api/generate-schedule?runs=3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
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
          notes: data.message || "Generated successfully"
        });
        
        // If auto-approved, refresh the timetable to show new schedule
        if (data.auto_approved && selectedProfessor) {
          console.log("✅ Schedule auto-approved! Refreshing timetable...");
          // Small delay to ensure DB is updated
          setTimeout(() => {
            fetchTimetableSlots(selectedProfessor.id);
          }, 1000);
        }
      } else {
        setScheduleError(data.message || "Failed to generate schedule");
      }
    } catch (err) {
      console.error("Error connecting to backend:", err);
      setScheduleError("Failed to connect to the scheduling service. Make sure the backend is running.");
    } finally {
      setGeneratingSchedule(false);
    }
  }
// ...existing code...
  const handleApproveSchedule = async () => {
    if (!scheduleResult) return;
    setGeneratingSchedule(true);
    setScheduleError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/schedules/${scheduleResult.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        alert("Schedule approved and applied to timetable!");
        setScheduleResult({ ...scheduleResult, status: "approved" });
        // Refresh timetable slots
        if (selectedProfessor) {
          fetchTimetableSlots(selectedProfessor.id);
        }
      } else {
        setScheduleError(data.message || "Failed to approve schedule");
      }
    } catch (err) {
      setScheduleError("Failed to approve schedule");
    } finally {
      setGeneratingSchedule(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <ProfessorSidebar
        professors={professors}
        selectedProfessor={selectedProfessor}
        onSelectProfessor={setSelectedProfessor}
        onAddProfessor={() => setShowModal(true)}
        onDeleteProfessor={handleDeleteProfessor}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Admin Header */}
        <div className="border-b border-border px-8 py-6 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
              {selectedProfessor && <p className="text-sm text-muted-foreground mt-1">{selectedProfessor.name}</p>}
            </div>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No professors available. Add a professor to get started.</p>
          </div>
        )}

        {/* Generate Schedule Section - Bottom Right */}
        <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Schedule Generator</h3>
          </div>

          <Button
            onClick={handleGenerateSchedule}
            disabled={generatingSchedule}
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generatingSchedule ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Schedule
              </>
            )}
          </Button>

          {scheduleError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 dark:text-red-300">{scheduleError}</p>
              </div>
            </div>
          )}

          {scheduleResult && (
            <div className={`${
              scheduleResult.status === "approved" 
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            } border rounded p-3 space-y-2 text-xs`}>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  {scheduleResult.status === "approved" ? (
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      ✅ Schedule Auto-Applied! (Best of 3 runs)
                    </p>
                  ) : (
                    <p className="font-semibold text-green-700 dark:text-green-300">
                      Schedule Generated!
                    </p>
                  )}
                  
                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Schedule ID</p>
                      <p className="font-semibold text-gray-900 dark:text-white">#{scheduleResult.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Conflicts</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {scheduleResult.hard_constraint_violations}
                      </p>
                    </div>
                  </div>

                  {/* Gini Coefficients */}
                  {(scheduleResult.gini_workload !== undefined || 
                    scheduleResult.gini_room_usage !== undefined || 
                    scheduleResult.gini_ac_access !== undefined) && (
                    <div className="border-t border-green-200 dark:border-green-700 pt-2 mt-2">
                      <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                        📊 Fairness Metrics (Gini)
                      </p>
                      <div className="space-y-1">
                        {scheduleResult.gini_workload !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Workload</span>
                            <span className={`font-mono font-semibold ${
                              scheduleResult.gini_workload < 0.2 ? 'text-green-600' :
                              scheduleResult.gini_workload < 0.3 ? 'text-blue-600' :
                              scheduleResult.gini_workload < 0.4 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {scheduleResult.gini_workload.toFixed(3)}
                              {scheduleResult.gini_workload < 0.2 ? ' ✨' : 
                               scheduleResult.gini_workload < 0.3 ? ' ✓' : ''}
                            </span>
                          </div>
                        )}
                        {scheduleResult.gini_room_usage !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Room Use</span>
                            <span className={`font-mono font-semibold ${
                              scheduleResult.gini_room_usage < 0.2 ? 'text-green-600' :
                              scheduleResult.gini_room_usage < 0.3 ? 'text-blue-600' :
                              scheduleResult.gini_room_usage < 0.4 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {scheduleResult.gini_room_usage.toFixed(3)}
                              {scheduleResult.gini_room_usage < 0.2 ? ' ✨' : 
                               scheduleResult.gini_room_usage < 0.3 ? ' ✓' : ''}
                            </span>
                          </div>
                        )}
                        {scheduleResult.gini_ac_access !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">AC Access</span>
                            <span className={`font-mono font-semibold ${
                              scheduleResult.gini_ac_access < 0.2 ? 'text-green-600' :
                              scheduleResult.gini_ac_access < 0.3 ? 'text-blue-600' :
                              scheduleResult.gini_ac_access < 0.4 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {scheduleResult.gini_ac_access.toFixed(3)}
                              {scheduleResult.gini_ac_access < 0.2 ? ' ✨' : 
                               scheduleResult.gini_ac_access < 0.3 ? ' ✓' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        ✨ &lt;0.2 Excellent • ✓ 0.2-0.3 Good • ⚠️ 0.3-0.4 Moderate
                      </p>
                    </div>
                  )}
                  
                  {scheduleResult.status === "approved" && (
                    <div className="bg-blue-100 dark:bg-blue-800/30 rounded p-2 mt-2">
                      <p className="text-blue-700 dark:text-blue-300 text-[11px]">
                        🎯 This schedule is now LIVE on your timetable!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {scheduleResult.status === "pending" && (
                <Button
                  onClick={handleApproveSchedule}
                  disabled={generatingSchedule}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                 {generatingSchedule ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Approve & Apply
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ProfessorFormModal 
          onSubmit={handleAddProfessor} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  )
}

// test 1