import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

raw_url      = os.getenv("SUPABASE_URL", "")
supabase_url = raw_url.split("/rest/v1")[0].rstrip("/")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")

supabase: Client = create_client(supabase_url, supabase_key)

"""
SQL MIGRATION — run once in Supabase SQL editor before using AI-assign slots.

ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS valid_time_range;

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS ai_assign_time BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE timetable_slots ADD CONSTRAINT valid_time_range
  CHECK (
    (ai_assign_time = true)
    OR
    (ai_assign_time = false AND end_hour > hour AND hour >= 0 AND end_hour <= 23)
  );

CREATE INDEX IF NOT EXISTS idx_timetable_slots_ai_assign ON timetable_slots(ai_assign_time);

FRONTEND NOTE (paste into timetable-slot-modal.tsx handleSubmit when aiAssignTime is true):
  Submit the slot with these placeholder values so the row passes the DB constraint.
  The GA will overwrite them with real values on the next generate-schedule run.

  onSubmit({
    professorId : professor.id,
    dayOfWeek   : 1,
    hour        : 8,
    endHour     : 9,
    subject     : formData.subject,
    room        : "",
    needsAC     : formData.needsAC,
    aiAssignTime: true,
  })

FRONTEND NOTE (admin-calendar-grid.tsx):
  Filter out AI-pending slots from the visible grid so they do not appear
  as erroneous blocks before the GA assigns them:

  const visibleSlots = timetableSlots.filter(
    (s) => !s.aiAssignTime && s.hour >= SCHEDULE_START_HOUR && s.endHour > s.hour
  )

  Show them in a separate sidebar list labelled "Pending AI Assignment" instead.

FRONTEND NOTE (room label in admin-calendar-grid.tsx slot cell):
  Replace any "TBD" string with an empty string check:

  const roomLabel =
    activeRoom && activeRoom.trim() !== ""
      ? "Room " + activeRoom
      : "Pending AI assignment"

FRONTEND NOTE (conflict panel in admin-calendar-grid.tsx):
  Double-booked slots should be highlighted red but still saved.
  The computeAllConflicts function already handles this — make sure
  allSlots includes every professor's slots (not just the current professor's)
  so cross-professor room conflicts are visible.
"""


def get_all_professors() -> list:
    try:
        return supabase.table("professors").select("*").execute().data or []
    except Exception as e:
        print(f"[DB] get_all_professors: {e}")
        return []


def get_all_rooms() -> list:
    try:
        rows = supabase.table("rooms").select("*").execute().data or []
        for r in rows:
            if r.get("room_type") == "Laboratory":
                r["is_ac"] = False
        return rows
    except Exception as e:
        print(f"[DB] get_all_rooms: {e}")
        return []


def get_all_timetable_slots() -> list:
    try:
        return supabase.table("timetable_slots").select("*").execute().data or []
    except Exception as e:
        print(f"[DB] get_all_timetable_slots: {e}")
        return []


def get_timetable_slots() -> list:
    try:
        return (
            supabase.table("timetable_slots")
            .select("*, professors(id, name, title, department)")
            .execute().data or []
        )
    except Exception as e:
        print(f"[DB] get_timetable_slots: {e}")
        return []


def get_db_data() -> dict:
    return {
        "professors":      get_all_professors(),
        "timetable_slots": get_all_timetable_slots(),
    }


def save_generated_schedule(
    fitness_score:   float,
    hard_violations: int,
    soft_score:      float,
    gini_workload:   float = 0.0,
    gini_room_usage: float = 0.0,
    gini_ac_access:  float = 0.0,
    notes:           str   = "",
) -> tuple:
    url     = f"{supabase_url}/rest/v1/generated_schedules"
    headers = {
        "apikey":        supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }
    payload = {
        "fitness_score":              float(fitness_score),
        "hard_constraint_violations": int(hard_violations),
        "soft_constraint_score":      float(soft_score),
        "status":                     "pending",
        "notes":                      str(notes),
        "gini_workload":              float(gini_workload),
        "gini_room_usage":            float(gini_room_usage),
        "gini_ac_access":             float(gini_ac_access),
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=15)
        if res.status_code not in (200, 201):
            return None, f"HTTP {res.status_code}: {res.text}"
        return int(res.json()[0]["id"]), None
    except Exception as e:
        return None, f"Connection error: {e}"


def save_schedule_slots(schedule_id: int, chromosome: list) -> tuple:
    if not chromosome:
        return None, "chromosome is empty"

    errors  = []
    updated = 0

    for gene in chromosome:
        slot_id = gene.get("slot_id")
        if not slot_id:
            continue
        try:
            # Always write back what the GA resolved
            update_data = {
                "room":        str(gene["room_id"]),
                "hour":        gene["start_hour"],
                "end_hour":    gene["end_hour"],
                "day_of_week": gene["day_of_week"],
            }

            supabase.table("timetable_slots").update(update_data).eq("id", slot_id).execute()
            updated += 1
        except Exception as e:
            errors.append(f"slot {slot_id}: {e}")

    print(f"[DB] Updated {updated}/{len(chromosome)} slots")

    if errors:
        return None, " | ".join(errors)
    return True, None