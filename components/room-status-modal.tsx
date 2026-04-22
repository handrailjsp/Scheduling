"use client"

import { useState, useEffect } from "react"
import { X, Snowflake, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface RoomBooking {
  professor_name: string
  subject: string
  day_of_week: number
  hour: number
  end_hour: number
}

interface RoomInfo {
  id: string
  is_ac: boolean
  room_type: string
  bookings: RoomBooking[]
}

interface RoomStatusModalProps {
  onClose: () => void
}

export default function RoomStatusModal({ onClose }: RoomStatusModalProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDay, setFilterDay] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const [roomsRes, slotsRes] = await Promise.all([
        supabase.from("rooms").select("*").eq("is_faculty", false),
        supabase.from("timetable_slots").select("*, professors(name)"),
      ])

      const roomData: RoomInfo[] = (roomsRes.data || []).map((r: any) => {
        const isLab = r.room_type === "Laboratory"
        const roomSlots = (slotsRes.data || [])
          .filter((s: any) => s.room === r.id)
          .map((s: any) => ({
            professor_name: s.professors?.name || "Unknown",
            subject:        s.subject || "TBA",
            day_of_week:    s.day_of_week,
            hour:           s.hour,
            end_hour:       s.end_hour,
          }))
          .sort((a: RoomBooking, b: RoomBooking) => a.day_of_week - b.day_of_week || a.hour - b.hour)

        return {
          id:        r.id,
          is_ac:     isLab ? false : Boolean(r.is_ac),
          room_type: r.room_type,
          bookings:  roomSlots,
        }
      }).sort((a: RoomInfo, b: RoomInfo) => a.id.localeCompare(b.id))

      setRooms(roomData)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterDay !== null
    ? rooms.map(r => ({ ...r, bookings: r.bookings.filter(b => b.day_of_week === filterDay) }))
    : rooms

  const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Room Availability</h2>
            <p className="text-xs text-muted-foreground">Weekly recurring schedule — all 8 rooms</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <button
                onClick={() => setFilterDay(null)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold transition",
                  filterDay === null ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                ALL
              </button>
              {DAY_NAMES.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setFilterDay(filterDay === i ? null : i)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold transition",
                    filterDay === i ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Loading rooms...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(room => {
                const isFree = room.bookings.length === 0
                return (
                  <div
                    key={room.id}
                    className={cn(
                      "border rounded-lg overflow-hidden",
                      isFree ? "border-green-200 bg-green-50/40" : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base">{room.id}</span>
                        <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                          {room.room_type}
                        </span>
                        {room.is_ac && (
                          <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isFree ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-[11px] font-bold text-green-600">Available</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-[11px] font-bold text-amber-600">
                              {room.bookings.length} slot{room.bookings.length !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-2 space-y-1.5 min-h-[60px]">
                      {room.bookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No bookings {filterDay !== null ? `on ${DAY_NAMES[filterDay]}` : "this week"}.</p>
                      ) : (
                        room.bookings.map((b, i) => (
                          <div key={i} className="flex items-start justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                            <div>
                              <span className="font-bold text-foreground">{b.professor_name}</span>
                              <span className="text-muted-foreground"> — {b.subject}</span>
                            </div>
                            <div className="text-right text-muted-foreground shrink-0 ml-2">
                              <span className="font-medium text-primary">{DAY_NAMES[b.day_of_week]}</span>
                              {" "}{fmtHour(b.hour)}–{fmtHour(b.end_hour)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Available — no bookings</span>
            <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-amber-500" /> Has bookings</span>
            <span className="flex items-center gap-1.5"><Snowflake className="w-3.5 h-3.5 text-blue-500" /> Air-conditioned</span>
            <span className="ml-auto">Rooms 322–328 have AC. Labs do not.</span>
          </div>
        </div>
      </div>
    </div>
  )
}