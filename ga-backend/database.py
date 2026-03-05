import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
# use service role key on server to bypass RLS
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set as environment variables. If running locally, set them in a .env file. If deploying, set them in your deployment environment.")

# Log which key is being used
if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    print("[INIT] Using SUPABASE_SERVICE_ROLE_KEY (RLS bypassed)")
elif os.getenv("SUPABASE_KEY"):
    print("[INIT] WARNING: Using SUPABASE_KEY (anon key - RLS ACTIVE). For server operations, set SUPABASE_SERVICE_ROLE_KEY to bypass RLS.")
else:
    print("[INIT] ERROR: Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_KEY is set!")

supabase: Client = create_client(supabase_url, supabase_key)


# Database helper functions
def get_all_professors():
    """Fetch all professors from database."""
    response = supabase.table("professors").select("*").execute()
    return response.data


def get_all_courses():
    """Fetch all courses from database. Returns empty list if table doesn't exist."""
    try:
        response = supabase.table("courses").select("*").execute()
        return response.data
    except Exception as e:
        # Table might not exist - return empty list
        return []


def get_all_rooms():
    """Fetch all rooms from database. Returns empty list if table doesn't exist."""
    try:
        response = supabase.table("rooms").select("*").execute()
        return response.data
    except Exception as e:
        # Table might not exist - return empty list
        return []


def get_all_sections():
    """Fetch all sections from database. Returns empty list if table doesn't exist."""
    try:
        response = supabase.table("sections").select("*").execute()
        return response.data
    except Exception as e:
        # Table might not exist - return empty list
        return []


def get_section_courses():
    """Fetch section-course assignments with professor info."""
    response = supabase.table("section_courses").select(
        "*, sections(*), courses(*), professors(*)"
    ).execute()
    return response.data


def get_professor_constraints(professor_id=None):
    """Fetch professor constraints (availability/preferences)."""
    query = supabase.table("professor_constraints").select("*")
    if professor_id:
        query = query.eq("professor_id", professor_id)
    response = query.execute()
    return response.data


def _serialize_value(val):
    """Convert datetime-like objects to iso strings for JSON transport."""
    import datetime
    if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
        return val.isoformat()
    return val


def save_generated_schedule(fitness_score, hard_violations, soft_score, gini_workload=0.0, gini_room_usage=0.0, gini_ac_access=0.0, notes=""):
    """Save a new generated schedule with Gini coefficients and return its ID."
    Values are serialized so that any datetime/time become ISO strings.
    Returns tuple (id, None) on success or (None, error_message) on failure.
    """
    payload = {
        "fitness_score": _serialize_value(fitness_score),
        "hard_constraint_violations": _serialize_value(hard_violations),
        "soft_constraint_score": _serialize_value(soft_score),
        "gini_workload": _serialize_value(gini_workload),
        "gini_room_usage": _serialize_value(gini_room_usage),
        "gini_ac_access": _serialize_value(gini_ac_access),
        "status": "pending",
        "notes": _serialize_value(notes)
    }
    print(f"[DEBUG] Attempting to insert schedule with payload keys: {list(payload.keys())}")
    # perform insert via REST API instead of supabase-py client which
    # sometimes raises JSONDecodeError even when the HTTP response is valid.
    import requests
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    rest_url = f"{supabase_url}/rest/v1/generated_schedules"
    try:
        resp = requests.post(rest_url, headers=headers, json=payload)
    except Exception as e:
        err_msg = f"HTTP request failed: {e}"
        print(f"ERROR: {err_msg}")
        return None, err_msg
    if resp.status_code >= 400:
        print(f"HTTP {resp.status_code} error inserting schedule: {resp.text}")
        return None, f"HTTP {resp.status_code}: {resp.text}"
    try:
        data = resp.json()
    except Exception as e:
        print(f"Failed to parse JSON response: {e} (raw={resp.text})")
        return None, f"JSON parse error: {e}"
    if not data or len(data) == 0:
        print(f"ERROR: REST insert returned empty list: {data}")
        return None, "Empty response from REST insert"
    schedule_id = data[0].get("id")
    print(f"[DEBUG] Successfully saved schedule (REST) with ID: {schedule_id}")
    return schedule_id, None


def save_schedule_slots(schedule_id, slots, courses=None):
    """
    Save all schedule slots for a generated schedule using batch insert.
    slots: list of dicts with keys: course_id, professor_id, room_id, day_of_week, start_hour, end_hour
    courses: optional list of course dicts - not used currently, kept for compatibility
    """
    # Pre-allocate list with exact size for efficiency
    # Only use columns that exist in the table
    slots_with_schedule_id = []
    for slot in slots:
        rec = {
            "schedule_id": _serialize_value(schedule_id),
            "section_id": _serialize_value(slot.get("section_id")),
            "course_id": _serialize_value(slot["course_id"]),
            "professor_id": _serialize_value(slot["professor_id"]),
            "room_id": _serialize_value(slot["room_id"]),
            "day_of_week": _serialize_value(slot["day_of_week"]),
            "start_hour": _serialize_value(slot["start_hour"]),
            "end_hour": _serialize_value(slot["end_hour"])
        }
        slots_with_schedule_id.append(rec)
    # Single batch insert - much faster than multiple inserts
    print(f"[DEBUG] Inserting {len(slots_with_schedule_id)} schedule slots (REST)...")
    # Use REST API to avoid supabase-py client decoding issues
    import requests
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    rest_url = f"{supabase_url}/rest/v1/generated_schedule_slots"
    try:
        resp = requests.post(rest_url, headers=headers, json=slots_with_schedule_id)
    except Exception as e:
        err_msg = f"HTTP request failed (slots): {e}"
        print(f"ERROR: {err_msg}")
        return None, err_msg
    if resp.status_code >= 400:
        print(f"HTTP {resp.status_code} error inserting slots: {resp.text}")
        return None, f"HTTP {resp.status_code}: {resp.text}"
    try:
        data = resp.json()
    except Exception as e:
        print(f"Failed to parse JSON slots response: {e} (raw={resp.text})")
        return None, f"JSON parse error: {e}"
    if not data or len(data) == 0:
        print(f"ERROR: REST slots insert returned empty list: {data}")
        return None, "Empty response from REST slots insert"
    print(f"[DEBUG] Successfully saved {len(data)} schedule slots via REST")
    return data, None


def get_generated_schedules():
    """Fetch all generated schedules."""
    response = supabase.table("generated_schedules").select("*").order("generation_date", desc=True).execute()
    return response.data


def get_schedule_details(schedule_id):
    """Fetch details of a specific generated schedule with all slots and course names."""
    schedule = supabase.table("generated_schedules").select("*").eq("id", schedule_id).execute().data[0]
    
    # Get slots with professor info
    slots = supabase.table("generated_schedule_slots").select(
        "*, professors(*)"
    ).eq("schedule_id", schedule_id).execute().data
    
    # Get course mapping from timetable_slots to add subject names
    timetable_slots = supabase.table("timetable_slots").select("subject, professor_id").execute().data
    
    # Create a mapping of course_id to subject name from existing data
    # We'll match by finding what subjects each professor teaches
    course_subjects = {}
    for slot in slots:
        course_id = slot["course_id"]
        if course_id not in course_subjects:
            # Find a subject from timetable_slots that this professor teaches
            prof_subjects = [ts["subject"] for ts in timetable_slots if ts.get("professor_id") == slot["professor_id"]]
            if prof_subjects:
                # Use the (course_id - 1) index to get consistent mapping
                course_subjects[course_id] = prof_subjects[min(course_id - 1, len(prof_subjects) - 1)]
    
    # Add subject names to slots
    for slot in slots:
        slot["subject"] = course_subjects.get(slot["course_id"], f"Course {slot['course_id']}")
    
    return {
        "schedule": schedule,
        "slots": slots
    }


def approve_schedule(schedule_id):
    """
    Approve a generated schedule and APPLY it to the live timetable.
    This REPLACES all existing timetable_slots with the new optimized schedule.
    """
    try:
        print(f"\n========================================")
        print(f"APPLYING SCHEDULE: ID={schedule_id}")
        print(f"========================================\n")
        
        # Get the generated schedule slots
        schedule_details = get_schedule_details(schedule_id)
        generated_slots = schedule_details["slots"]
        print(f"Generated schedule has {len(generated_slots)} slots")
        
        # STEP 1: Clear existing timetable_slots
        print("Clearing existing timetable slots...")
        existing = supabase.table("timetable_slots").select("id").execute().data
        print(f"  Found {len(existing)} existing slots")
        
        if existing:
            # Delete all existing slots
            supabase.table("timetable_slots").delete().neq("id", 0).execute()
            print(f"  ✓ Cleared {len(existing)} old slots")
        
        # STEP 2: Insert new schedule into timetable_slots
        print(f"\nInserting {len(generated_slots)} new slots...")
        
        new_timetable_slots = []
        for slot in generated_slots:
            new_slot = {
                "professor_id": slot["professor_id"],
                "day_of_week": slot["day_of_week"],
                "hour": slot["start_hour"],
                "end_hour": slot["end_hour"],
                "subject": slot.get("subject", f"Course {slot['course_id']}"),
                "room": str(slot["room_id"]),  # Convert room_id to string for room column
                "needs_ac": slot["room_id"] in [322, 323, 324]  # Mark AC rooms
            }
            new_timetable_slots.append(new_slot)
        
        # Batch insert all new slots
        result = supabase.table("timetable_slots").insert(new_timetable_slots).execute()
        print(f"  ✓ Inserted {len(result.data)} new slots")
        
        # STEP 3: Mark schedule as approved
        supabase.table("generated_schedules").update({"status": "approved"}).eq("id", schedule_id).execute()
        
        print(f"\n✅ SUCCESS: Schedule {schedule_id} is now LIVE!")
        print(f"========================================\n")
        
        return {
            "slots_updated": len(new_timetable_slots),
            "message": f"Schedule applied! {len(new_timetable_slots)} slots now live."
        }
        
    except Exception as e:
        print(f"\n❌ ERROR in approve_schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
