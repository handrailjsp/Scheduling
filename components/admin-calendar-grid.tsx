"use client"

import { useState, useMemo } from "react"
import { getWeekDays } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Trash2, Snowflake, Clock, Plus } from "lucide-react"
import type { Professor, TimetableSlot } from "@/app/admin/page"
import TimetableSlotModal from "@/components/timetable-slot-modal"
import { cn } from "@/lib/utils"

export const SCHEDULE_START_HOUR = 8
export const SCHEDULE_END_HOUR   = 19
const HOUR_HEIGHT = 96
const SLOT_WIDTH  = 140
const SLOT_GAP    = 4

const AC_ROOMS = ["322", "324", "326", "328"]

export function clampStartHour(start: number, duration = 1): number {
  return Math.max(SCHEDULE_START_HOUR, Math.min(start, SCHEDULE_END_HOUR - duration))
}
function isPending(room: string | undefined): boolean {
  return !room || room === "PENDING" || room === "TBD" || room === "" || room === "AUTO"
}
function isACRoom(room: string | undefined): boolean {
  return !!room && AC_ROOMS.includes(room.trim())
}

/**
 * Lane assignment:
 * - Timed slots get lanes among themselves (collision-based)
 * - Pending slots (hour=null) always go to lanes AFTER all timed lanes
 *   so they are never hidden behind a timed slot
 */
function assignLanes(slots: TimetableSlot[]): { laneMap: Map<string, number>; totalLanes: number } {
  const timed   = slots.filter(s => s.hour !== null && s.endHour !== null)
  const pending = slots.filter(s => s.hour === null || s.endHour === null)

  const sorted = [...timed].sort((a, b) => {
    const aStart = a.hour ?? 0, bStart = b.hour ?? 0
    if (aStart !== bStart) return aStart - bStart
    return ((b.endHour ?? 0) - bStart) - ((a.endHour ?? 0) - aStart)
  })

  const laneMap      = new Map<string, number>()
  const laneEndTimes: number[] = []

  sorted.forEach(slot => {
    const start = slot.hour ?? 0
    const end   = slot.endHour ?? start + 1
    let lane    = -1
    for (let i = 0; i < laneEndTimes.length; i++) {
      if (start >= laneEndTimes[i]) { lane = i; laneEndTimes[i] = end; break }
    }
    if (lane === -1) { lane = laneEndTimes.length; laneEndTimes.push(end) }
    laneMap.set(slot.id, lane)
  })

  // Pending slots go AFTER all timed lanes — never hidden
  const timedLaneCount = laneEndTimes.length
  pending.forEach((slot, i) => laneMap.set(slot.id, timedLaneCount + i))

  const totalLanes = timedLaneCount + pending.length
  return { laneMap, totalLanes }
}

interface AdminCalendarGridProps {
  professor: Professor
  timetableSlots: TimetableSlot[]
  allSlots?: TimetableSlot[]
  onAddSlot: (slot: Omit<TimetableSlot, "id">) => void
  onUpdateSlot?: (id: string, updates: Omit<TimetableSlot, "id">) => void
  onDeleteSlot: (id: string) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export default function AdminCalendarGrid({
  professor, timetableSlots, allSlots = [],
  onAddSlot, onUpdateSlot, onDeleteSlot,
  currentDate, onDateChange,
}: AdminCalendarGridProps) {
  const weekDays = getWeekDays(currentDate)
  const hours    = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR }, (_, i) => i + SCHEDULE_START_HOUR)
  const fmt      = (h: number) => `${h % 12 || 12}${h >= 12 ? "pm" : "am"}`

  const [modalOpen, setModalOpen]     = useState<{ date: Date; hour: number; slotId?: string } | null>(null)
  const [previewSlot, setPreviewSlot] = useState<{ dayOfWeek: number; startHour: number; endHour: number } | null>(null)

  /**
   * Per-day layout data — single source of truth for both header and body widths.
   * Multi-lane days get a fixed pixel width so columns don't overlap.
   * Single-lane days get flex-1 so they fill the remaining page width equally.
   */
  const dayData = useMemo(() => {
    return weekDays.map((_, dayOfWeek) => {
      const daySlots  = timetableSlots.filter(s => s.dayOfWeek === dayOfWeek)
      const { laneMap, totalLanes } = assignLanes(daySlots)
      const timedSlots   = daySlots.filter(s => s.hour !== null && s.endHour !== null)
      const pendingSlots = daySlots.filter(s => s.hour === null || s.endHour === null)
      const isMultiLane  = totalLanes > 1
      const fixedPx      = isMultiLane ? Math.max(160, totalLanes * (SLOT_WIDTH + SLOT_GAP) + 16) : null
      return { laneMap, totalLanes, timedSlots, pendingSlots, isMultiLane, fixedPx }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableSlots, weekDays.map(d => d.toDateString()).join(",")])

  function enforceBounds(slot: Omit<TimetableSlot, "id">): Omit<TimetableSlot, "id"> {
    if (slot.hour === null || slot.endHour === null) return slot
    const dur   = slot.endHour - slot.hour
    const start = clampStartHour(slot.hour, dur)
    return { ...slot, hour: start, endHour: Math.min(start + dur, SCHEDULE_END_HOUR) }
  }

  const openAdd  = (date: Date, hr: number) => setModalOpen({ date, hour: clampStartHour(hr) })
  const openEdit = (slot: TimetableSlot) => {
    const ws = new Date(currentDate)
    ws.setDate(currentDate.getDate() - currentDate.getDay())
    const d = new Date(ws)
    d.setDate(ws.getDate() + slot.dayOfWeek)
    setModalOpen({ date: d, hour: slot.hour ?? SCHEDULE_START_HOUR, slotId: slot.id })
  }

  const handleSave   = (slot: Omit<TimetableSlot, "id">) => { onAddSlot(enforceBounds(slot)); setModalOpen(null); setPreviewSlot(null) }
  const handleUpdate = (id: string, slot: Omit<TimetableSlot, "id">) => { onUpdateSlot?.(id, enforceBounds(slot)); setModalOpen(null); setPreviewSlot(null) }
  const handlePreview = (day: number, start: number, end: number) => {
    const dur = end - start; const s = clampStartHour(start, dur)
    setPreviewSlot({ dayOfWeek: day, startHour: s, endHour: Math.min(s + dur, SCHEDULE_END_HOUR) })
  }

  const today    = new Date()
  const gridH    = hours.length * HOUR_HEIGHT
  const timeColW = 80

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); onDateChange(d) }} variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold min-w-44 text-center">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h3>
          <Button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); onDateChange(d) }} variant="ghost" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Non-AC</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />AC Room</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Pending</div>
        </div>
      </div>

      {/* Scrollable area — header + body scroll together */}
      <div className="flex-1 overflow-auto w-full">
        {/*
          Use a table-like approach: one row of fixed+flex cells for the header,
          one row for the body. Both share the same cell widths via dayData.
          The outer div is always at least 100% wide so single-lane cols fill the page.
        */}
        <div className="flex flex-col min-h-full" style={{ minWidth: "100%" }}>

          {/* ── Sticky header ── */}
          <div className="flex sticky top-0 z-20 bg-background border-b border-border w-full">
            {/* Time gutter spacer */}
            <div style={{ width: timeColW, flexShrink: 0 }} className="border-r border-border" />
            {/* Day headers */}
            {weekDays.map((date, i) => {
              const { isMultiLane, fixedPx } = dayData[i]
              const isToday = date.toDateString() === today.toDateString()
              return (
                <div
                  key={date.toISOString()}
                  className="text-center py-4 border-r border-border last:border-0"
                  style={
                    isMultiLane
                      ? { width: fixedPx!, flexShrink: 0 }
                      : { flex: 1, minWidth: 120 }
                  }
                >
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={cn("text-xl font-bold mt-1", isToday ? "text-primary" : "text-foreground")}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Grid body ── */}
          <div className="flex w-full flex-1">
            {/* Time gutter */}
            <div style={{ width: timeColW, flexShrink: 0 }} className="border-r border-border bg-muted/5 sticky left-0 z-10">
              {hours.map(hr => (
                <div key={hr} style={{ height: HOUR_HEIGHT }} className="border-b border-border flex items-start justify-center pt-3">
                  <span className="text-[10px] font-bold text-muted-foreground/60">{fmt(hr)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((date, dayOfWeek) => {
              const { laneMap, timedSlots, pendingSlots, isMultiLane, fixedPx } = dayData[dayOfWeek]

              return (
                <div
                  key={date.toISOString()}
                  className="relative border-r border-border last:border-0"
                  style={{
                    height: gridH,
                    ...(isMultiLane ? { width: fixedPx!, flexShrink: 0 } : { flex: 1, minWidth: 120 }),
                  }}
                >
                  {/* Clickable hour rows — full column width, behind cards */}
                  {hours.map(hr => {
                    const top       = (hr - SCHEDULE_START_HOUR) * HOUR_HEIGHT
                    const inPreview = previewSlot?.dayOfWeek === dayOfWeek && hr >= previewSlot.startHour && hr < previewSlot.endHour
                    return (
                      <div
                        key={hr}
                        style={{ position: "absolute", top, left: 0, right: 0, height: HOUR_HEIGHT, zIndex: 0 }}
                        className={cn(
                          "border-b border-border/50 cursor-pointer group flex items-center justify-center transition-colors",
                          inPreview ? "bg-primary/10" : "hover:bg-muted/30",
                        )}
                        onClick={() => openAdd(date, hr)}
                      >
                        <Plus className="w-4 h-4 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    )
                  })}

                  {/* Pending slots — always AFTER timed lanes, stacked at top of their lane */}
                  {pendingSlots.map(slot => {
                    const laneIdx = laneMap.get(slot.id) ?? 0
                    const left    = isMultiLane ? laneIdx * (SLOT_WIDTH + SLOT_GAP) + 4 : 4
                    const width   = isMultiLane ? SLOT_WIDTH : "calc(100% - 8px)"
                    return (
                      <div
                        key={slot.id}
                        className="absolute rounded-lg border-l-4 border-amber-400 bg-amber-50/95 shadow-sm cursor-pointer group overflow-hidden"
                        style={{ top: 4, left, width, minHeight: 64, zIndex: 20 }}
                        onClick={e => { e.stopPropagation(); openEdit(slot) }}
                      >
                        <div className="p-2 flex flex-col gap-0.5">
                          <p className="text-[11px] font-bold truncate text-foreground">{slot.subject}</p>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-3 h-3 shrink-0" />
                            <p className="text-[10px] font-semibold">Pending — run Generate Schedule</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); onDeleteSlot(slot.id) }} className="opacity-0 group-hover:opacity-100 self-end mt-1 p-1 hover:bg-destructive/10 rounded transition">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Timed slots — positioned by hour */}
                  {timedSlots.map(slot => {
                    const start    = slot.hour!
                    const end      = slot.endHour!
                    const top      = (start - SCHEDULE_START_HOUR) * HOUR_HEIGHT + 4
                    const height   = Math.max((end - start) * HOUR_HEIGHT - 8, 40)
                    const laneIdx  = laneMap.get(slot.id) ?? 0
                    const left     = isMultiLane ? laneIdx * (SLOT_WIDTH + SLOT_GAP) + 4 : 4
                    const width    = isMultiLane ? SLOT_WIDTH : "calc(100% - 8px)"
                    const pending  = isPending(slot.room)
                    const roomIsAC = isACRoom(slot.room)
                    // Only warn about overlap if slot is still pending (not yet GA-resolved)
                    const hasOverlap = pending && timedSlots.some(
                      o => o.id !== slot.id && o.hour !== null && o.endHour !== null && o.hour < end && o.endHour > start
                    )

                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "absolute rounded-lg shadow-sm cursor-pointer group overflow-hidden border-l-4 transition-all hover:shadow-md hover:z-30",
                          pending  ? "bg-amber-50/95 border-amber-400"
                          : roomIsAC ? "bg-blue-50/95 border-blue-500"
                                     : "bg-emerald-50/95 border-emerald-500",
                        )}
                        style={{ top, height, left, width, zIndex: 10 }}
                        onClick={e => { e.stopPropagation(); openEdit(slot) }}
                      >
                        <div className="p-2 h-full flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-bold leading-none truncate text-foreground">{slot.subject}</p>
                              {roomIsAC && !pending && <Snowflake className="w-3 h-3 text-blue-500 animate-pulse shrink-0" />}
                            </div>
                            {pending ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <Clock className="w-3 h-3 shrink-0" />
                                <p className="text-[10px] font-semibold">Pending — run Generate Schedule</p>
                              </div>
                            ) : (
                              <p className="text-[10px] font-medium text-muted-foreground">Room {slot.room}</p>
                            )}
                            {hasOverlap && (
                              <p className="text-[9px] text-amber-600 font-bold mt-0.5">Overlap — AI will resolve</p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <button onClick={e => { e.stopPropagation(); onDeleteSlot(slot.id) }} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded">
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modalOpen && (
        <TimetableSlotModal
          professor={professor}
          selectedDate={modalOpen.date}
          hour={modalOpen.hour}
          slotId={modalOpen.slotId}
          existingSlot={modalOpen.slotId ? timetableSlots.find(s => s.id === modalOpen.slotId) : undefined}
          onSubmit={modalOpen.slotId ? slot => handleUpdate(modalOpen.slotId!, slot) : handleSave}
          onClose={() => { setModalOpen(null); setPreviewSlot(null) }}
          onPreviewUpdate={handlePreview}
          minHour={SCHEDULE_START_HOUR}
          maxHour={SCHEDULE_END_HOUR}
        />
      )}
    </div>
  )
}