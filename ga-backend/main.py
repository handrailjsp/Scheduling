"""
main.py  —  EQ-Schedule FastAPI server
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import database
from ga_engine import run_genetic_algorithm

app = FastAPI(title="EQ-Schedule API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://scheduling-s69x.vercel.app", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "running"}


@app.get("/api/health")
async def health():
    """
    Open http://localhost:8000/api/health in your browser to
    confirm the backend can read your database correctly.
    """
    professors = database.get_all_professors()
    rooms      = database.get_all_rooms()
    slots      = database.get_all_timetable_slots()

    issues = []
    if not professors:
        issues.append("No professors found")
    if not rooms:
        issues.append("No rooms found")
    if not slots:
        issues.append("No timetable slots — add subjects via Admin first")

    return {
        "status":           "ready" if not issues else "not_ready",
        "issues":           issues,
        "professors_count": len(professors),
        "rooms_count":      len(rooms),
        "slots_count":      len(slots),
        "professors":       [{"id": str(p["id"]), "name": p["name"]} for p in professors],
        "rooms":            [{"id": r["id"], "is_ac": r.get("is_ac")} for r in rooms],
    }


@app.get("/api/timetable")
async def get_timetable():
    return database.get_timetable_slots()


@app.get("/api/schedules")
async def get_schedules():
    try:
        res = (
            database.supabase
            .table("generated_schedules")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return {"success": True, "data": res.data}
    except Exception as e:
        return {"success": False, "message": str(e), "data": []}


@app.post("/api/generate-schedule")
async def generate_schedule(runs: int = 1):
    """
    Triggers the GA. It reads your existing timetable_slots
    and autonomously assigns day, hour, and room to each one.
    """
    slots = database.get_all_timetable_slots()
    if not slots:
        raise HTTPException(
            status_code=400,
            detail="No timetable slots found. Add subjects via Admin panel first."
        )

    best_result = None
    for run_num in range(max(1, runs)):
        print(f"\n>>> GA Run {run_num + 1} / {runs}")
        result = run_genetic_algorithm()
        if "error" in result:
            print(f"    Run failed: {result['error']}")
            continue
        if best_result is None or result["fitness_score"] > best_result["fitness_score"]:
            best_result = result

    if best_result is None:
        raise HTTPException(status_code=500, detail="GA failed — check terminal logs.")

    return {
        "success":         True,
        "schedule_id":     best_result["schedule_id"],
        "fitness_score":   best_result["fitness_score"],
        "hard_violations": best_result["hard_violations"],
        "soft_score":      best_result["soft_score"],
        "gini_workload":   best_result["gini_workload"],
        "gini_room_usage": best_result["gini_room_usage"],
        "gini_ac_access":  best_result["gini_ac_access"],
        "auto_approved":   best_result["hard_violations"] == 0,
        "runs_completed":  runs,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)