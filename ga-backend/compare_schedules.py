#!/usr/bin/env python3
"""
Compare GINI coefficients between different generated schedules.

This helps you see which GA-generated schedule is most fair.

Run: python3 compare_schedules.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_KEY in .env file")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def compare_generated_schedules():
    """Compare GINI metrics across all generated schedules"""
    print("=" * 80)
    print("SCHEDULE FAIRNESS COMPARISON")
    print("=" * 80)
    
    # Fetch all generated schedules ordered by date
    schedules = supabase.table("generated_schedules").select(
        "id, generation_date, fitness_score, hard_constraint_violations, "
        "gini_workload, gini_room_usage, gini_ac_access, status"
    ).order("generation_date", desc=True).execute().data
    
    if not schedules:
        print("\n❌ No generated schedules found!")
        print("   Run: POST /api/generate-schedule to create one\n")
        return
    
    print(f"\nFound {len(schedules)} generated schedule(s):\n")
    
    # Header
    print(f"{'ID':>4} {'Date':>12} {'Fitness':>8} {'Hard':>4} {'Workload':>9} "
          f"{'Rooms':>9} {'AC':>9} {'Avg':>9} {'Status':>10}")
    print("-" * 80)
    
    best_schedule = None
    best_avg_gini = float('inf')
    
    for sched in schedules:
        schedule_id = sched['id']
        date = sched['generation_date'][:10] if sched['generation_date'] else "N/A"
        fitness = sched.get('fitness_score', 0)
        hard = sched.get('hard_constraint_violations', 0)
        
        gini_w = sched.get('gini_workload', 0.0)
        gini_r = sched.get('gini_room_usage', 0.0)
        gini_a = sched.get('gini_ac_access', 0.0)
        avg_gini = (gini_w + gini_r + gini_a) / 3
        
        status = sched.get('status', 'pending')
        
        # Track best
        if avg_gini < best_avg_gini:
            best_avg_gini = avg_gini
            best_schedule = sched
        
        # Color coding for average gini
        if avg_gini < 0.2:
            rating = "✨"
        elif avg_gini < 0.3:
            rating = "✓"
        elif avg_gini < 0.4:
            rating = "⚠️"
        else:
            rating = "❌"
        
        print(f"{schedule_id:4d} {date:>12} {fitness:8.1f} {hard:4d} "
              f"{gini_w:9.4f} {gini_r:9.4f} {gini_a:9.4f} "
              f"{avg_gini:9.4f} {rating} {status:>9}")
    
    print("-" * 80)
    print("\nLegend: ✨=Excellent(<0.2) ✓=Good(<0.3) ⚠️=Moderate(<0.4) ❌=High(>0.4)")
    
    # Highlight best schedule
    if best_schedule:
        print(f"\n🏆 MOST FAIR SCHEDULE: ID {best_schedule['id']}")
        print(f"   Average GINI: {best_avg_gini:.4f}")
        print(f"   • Workload:   {best_schedule.get('gini_workload', 0):.4f}")
        print(f"   • Rooms:      {best_schedule.get('gini_room_usage', 0):.4f}")
        print(f"   • AC Access:  {best_schedule.get('gini_ac_access', 0):.4f}")
        print(f"   • Fitness:    {best_schedule.get('fitness_score', 0):.1f}")
        
        if best_schedule['status'] != 'approved':
            print(f"\n   💡 Consider approving this schedule (ID {best_schedule['id']})")
    
    print("\n" + "=" * 80 + "\n")


def view_schedule_details(schedule_id):
    """View detailed GINI breakdown for a specific schedule"""
    print(f"\n{'='*60}")
    print(f"DETAILED ANALYSIS - Schedule ID {schedule_id}")
    print(f"{'='*60}\n")
    
    # Get schedule metadata
    sched = supabase.table("generated_schedules").select("*").eq("id", schedule_id).execute().data
    if not sched:
        print(f"❌ Schedule {schedule_id} not found!")
        return
    
    sched = sched[0]
    
    print(f"Generated: {sched.get('generation_date', 'N/A')}")
    print(f"Fitness:   {sched.get('fitness_score', 0):.2f}")
    print(f"Status:    {sched.get('status', 'pending')}")
    
    print(f"\n📊 Fairness Metrics:")
    print(f"   Workload GINI:     {sched.get('gini_workload', 0):.4f}")
    print(f"   Room Usage GINI:   {sched.get('gini_room_usage', 0):.4f}")
    print(f"   AC Access GINI:    {sched.get('gini_ac_access', 0):.4f}")
    
    avg = (sched.get('gini_workload', 0) + sched.get('gini_room_usage', 0) + 
           sched.get('gini_ac_access', 0)) / 3
    print(f"   Average:           {avg:.4f}")
    
    # Interpretation
    print(f"\n📈 Interpretation:")
    if avg < 0.2:
        print("   ✅ EXCELLENT fairness - highly equitable schedule")
    elif avg < 0.3:
        print("   ✓ GOOD fairness - mostly balanced")
    elif avg < 0.4:
        print("   ⚠️  MODERATE fairness - some inequality present")
    else:
        print("   ❌ NEEDS IMPROVEMENT - significant inequality")
    
    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # View specific schedule
        try:
            schedule_id = int(sys.argv[1])
            view_schedule_details(schedule_id)
        except ValueError:
            print("Usage: python3 compare_schedules.py [schedule_id]")
    else:
        # Compare all schedules
        compare_generated_schedules()
