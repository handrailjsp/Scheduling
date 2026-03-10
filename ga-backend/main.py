import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import supabase, get_db_data, save_generated_schedule, get_timetable_slots

app = FastAPI()

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "running", "engine": "Genetic Algorithm v1.0"}

@app.get("/api/timetable")
async def get_timetable():
    """Endpoint for the Professor Dashboard to see the final schedule."""
    data = get_timetable_slots()
    return data

@app.get("/api/schedules")
async def get_schedules():
    """Endpoint to get history of GA runs."""
    try:
        response = supabase.table("generated_schedules").select("*").order("created_at", desc=True).execute()
        # Return in the structure the frontend expects: { success: true, data: [...] }
        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "message": str(e), "data": []}

@app.post("/api/generate-schedule")
async def generate_schedule(runs: int = 1):
    """Trigger the GA optimization process."""
    try:
        # 1. Load data from DB
        db_context = get_db_data()
        
        # 2. Simulate GA Processing (where your logic will go)
        # For now, we simulate a successful run
        time.sleep(1) 

        # 3. Save the results
        schedule_id, error = save_generated_schedule(
            fitness_score=0.98,
            hard_violations=0,
            soft_score=94.5,
            gini_workload=0.12,
            notes=f"Admin triggered optimization: {runs} runs."
        )

        if error:
            return {"success": False, "message": error}

        return {
            "success": True,
            "schedule_id": schedule_id,
            "fitness_score": 0.98,
            "hard_violations": 0,
            "soft_score": 94.5,
            "auto_approved": True
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)