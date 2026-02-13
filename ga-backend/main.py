from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import database
from ga_engine import run_genetic_algorithm

app = FastAPI(title="Timetable GA API", version="1.0.0")

# CORS middleware to allow Next.js to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://scheduling-z619.onrender.com",  # Backend itself (if needed)
        "https://scheduling-s69x.vercel.app"  # Deployed frontend URL (no trailing slash)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response Models
class ScheduleResponse(BaseModel):
    id: int
    fitness_score: float
    hard_constraint_violations: int
    soft_constraint_score: float
    status: str
    generation_date: str


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "GA Timetable API is running"}


@app.get("/api/data/professors")
def get_professors():
    """Get all professors from database."""
    try:
        professors = database.get_all_professors()
        return {"success": True, "data": professors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/courses")
def get_courses():
    """Get all courses from database."""
    try:
        courses = database.get_all_courses()
        return {"success": True, "data": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/rooms")
def get_rooms():
    """Get all rooms from database."""
    try:
        rooms = database.get_all_rooms()
        return {"success": True, "data": rooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/sections")
def get_sections():
    """Get all sections from database."""
    try:
        sections = database.get_all_sections()
        return {"success": True, "data": sections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-schedule")
def generate_schedule():
    """
    Trigger the genetic algorithm to generate a new schedule.
    This will read data from the database, run the GA, and save results.
    """
    try:
        # Run the genetic algorithm
        result = run_genetic_algorithm()
        
        return {
            "success": True,
            "message": "Schedule generation completed",
            "schedule_id": result["schedule_id"],
            "fitness_score": result["fitness_score"],
            "hard_violations": result["hard_violations"],
            "soft_score": result["soft_score"],
            "gini_workload": result.get("gini_workload", 0.0),
            "gini_room_usage": result.get("gini_room_usage", 0.0),
            "gini_ac_access": result.get("gini_ac_access", 0.0)
        }
    except Exception as e:
        import traceback
        error_detail = f"GA execution failed: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/timetable")
def get_timetable():
    """Get all live timetable slots (the actual active schedule)."""
    try:
        slots = database.supabase.table("timetable_slots").select(
            "*, professors(id, name, title, department)"
        ).execute().data
        return {"success": True, "data": slots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules")
def get_schedules():
    """Get all generated schedules."""
    try:
        schedules = database.get_generated_schedules()
        return {"success": True, "data": schedules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/{schedule_id}")
def get_schedule_details(schedule_id: int):
    """Get detailed view of a specific generated schedule with all slots."""
    try:
        details = database.get_schedule_details(schedule_id)
        return {"success": True, "data": details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/schedules/{schedule_id}/approve")
def approve_schedule(schedule_id: int):
    """
    Approve a generated schedule and REPLACE the live timetable with it.
    WARNING: This will clear all existing timetable_slots and replace with the new schedule.
    """
    try:
        result = database.approve_schedule(schedule_id)
        return {
            "success": True,
            "message": f"Schedule {schedule_id} approved and timetable updated",
            "slots_cleared": result.get("slots_cleared", 0),
            "slots_added": result.get("slots_added", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/schedules/{schedule_id}/reject")
def reject_schedule(schedule_id: int):
    """Reject a generated schedule."""
    try:
        database.supabase.table("generated_schedules").update(
            {"status": "rejected"}
        ).eq("id", schedule_id).execute()
        return {"success": True, "message": f"Schedule {schedule_id} rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/timetable/clear")
def clear_timetable():
    """
    Clear ALL timetable slots. 
    WARNING: This will delete the entire schedule!
    """
    try:
        result = database.supabase.table("timetable_slots").delete().neq("id", 0).execute()
        return {
            "success": True,
            "message": "Timetable cleared",
            "deleted_count": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/timetable/seed")
def seed_timetable_with_courses():
    """
    Seed the timetable with sample course data so the GA can extract proper subject names.
    Includes both AC and non-AC rooms.
    """
    try:
        # Sample courses
        subjects = [
            "Data Structures", "Linear Algebra", "Ethics", "Purposive Communication",
            "Calculus", "Physics", "Chemistry", "Programming", "Statistics", "Philosophy"
        ]
        
        # Rooms - mix of AC and non-AC
        rooms = ["322", "323", "324", "101", "141", "212", "305"]
        
        # Create a few sample slots with real subject names for each professor
        professors = database.get_all_professors()
        sample_slots = []
        
        for i, prof in enumerate(professors[:7]):  # First 7 professors
            for j in range(3):  # 3 courses each
                room = rooms[(i * 3 + j) % len(rooms)]
                sample_slots.append({
                    "professor_id": prof["id"],
                    "day_of_week": (j % 5) + 1,
                    "hour": 8 + j,
                    "end_hour": 9 + j,
                    "subject": subjects[(i * 3 + j) % len(subjects)],
                    "room": room,
                    "needs_ac": room in ["322", "323", "324"]
                })
        
        database.supabase.table("timetable_slots").insert(sample_slots).execute()
        
        return {
            "success": True,
            "message": f"Seeded {len(sample_slots)} sample slots with course names (AC and non-AC rooms)",
            "slots_added": len(sample_slots)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
