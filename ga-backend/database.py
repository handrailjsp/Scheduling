import os
import requests
import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Clean the URL to ensure no trailing slashes
raw_url = os.getenv("SUPABASE_URL", "")
supabase_url = raw_url.split('/rest/v1')[0].rstrip('/')
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

# Initialize client
supabase: Client = create_client(supabase_url, supabase_key)

def get_db_data():
    """Fetches existing professors and slots for the GA algorithm."""
    try:
        profs = supabase.table("professors").select("*").execute()
        slots = supabase.table("timetable_slots").select("*").execute()
        return {"professors": profs.data, "timetable_slots": slots.data}
    except Exception as e:
        print(f"Fetch Error: {e}")
        return {"professors": [], "timetable_slots": []}

def get_timetable_slots():
    """
    Fetches slots with professor details joined. 
    This is what populates the dashboard with actual names.
    """
    try:
        # Performs an inner join on the professors table
        response = supabase.table("timetable_slots").select("*, professors(*)").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching timetable slots: {e}")
        return []

def save_generated_schedule(fitness_score, hard_violations, soft_score, gini_workload=0.0, gini_room_usage=0.0, gini_ac_access=0.0, notes=""):
    """Saves metadata using a direct POST request to bypass JSON char 0 errors."""
    
    url = f"{supabase_url}/rest/v1/generated_schedules"
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    payload = {
        "fitness_score": float(fitness_score),
        "hard_constraint_violations": int(hard_violations),
        "soft_constraint_score": float(soft_score),
        "status": "pending",
        "notes": str(notes),
        "gini_workload": float(gini_workload),
        "gini_room_usage": float(gini_room_usage),
        "gini_ac_access": float(gini_ac_access)
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code not in [200, 201]:
            return None, f"HTTP {response.status_code}: {response.text}"
            
        data = response.json()
        return data[0].get("id"), None
    except Exception as e:
        return None, f"Connection Error: {str(e)}"