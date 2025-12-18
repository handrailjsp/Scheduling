import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("SUPABASE_URL and SUPABASE_KEY must be set as environment variables. If running locally, set them in a .env file. If deploying, set them in your deployment environment.")

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


def save_generated_schedule(fitness_score, hard_violations, soft_score, notes=""):
    """Save a new generated schedule and return its ID."""
    response = supabase.table("generated_schedules").insert({
        "fitness_score": fitness_score,
        "hard_constraint_violations": hard_violations,
        "soft_constraint_score": soft_score,
        "status": "pending",
        "notes": notes
    }).execute()
    return response.data[0]["id"]


def save_schedule_slots(schedule_id, slots, courses=None):
    """
    Save all schedule slots for a generated schedule using batch insert.
    slots: list of dicts with keys: course_id, professor_id, room_id, day_of_week, start_hour, end_hour
    courses: optional list of course dicts - not used currently, kept for compatibility
    """
    # Pre-allocate list with exact size for efficiency
    # Only use columns that exist in the table
    slots_with_schedule_id = [{
        "schedule_id": schedule_id,
        "section_id": slot.get("section_id"),
        "course_id": slot["course_id"],
        "professor_id": slot["professor_id"],
        "room_id": slot["room_id"],
        "day_of_week": slot["day_of_week"],
        "start_hour": slot["start_hour"],
        "end_hour": slot["end_hour"]
    } for slot in slots]
    
    # Single batch insert - much faster than multiple inserts
    response = supabase.table("generated_schedule_slots").insert(slots_with_schedule_id).execute()
    return response.data


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
    Approve a generated schedule (READ ONLY - does not modify timetable_slots).
    The generated schedule is for viewing only.
    """
    try:
        print(f"\n========================================")
        print(f"APPROVE SCHEDULE CALLED: ID={schedule_id}")
        print(f"========================================\n")
        
        # Get the generated schedule slots
        schedule_details = get_schedule_details(schedule_id)
        generated_slots = schedule_details["slots"]
        print(f"Generated schedule has {len(generated_slots)} slots")
        
        print(f"⚠️  NOTE: Timetable slots are NOT modified. Generated schedule is for viewing only.")
        
        # Mark schedule as approved
        supabase.table("generated_schedules").update({"status": "approved"}).eq("id", schedule_id).execute()
        
        print(f"✓ Schedule {schedule_id} marked as approved (view-only)")
        
        return {
            "slots_updated": 0,
            "message": "Schedule approved for viewing. Timetable slots unchanged."
        }
        
    except Exception as e:
        print(f"\n❌ ERROR in approve_schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
