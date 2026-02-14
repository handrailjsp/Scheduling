#!/usr/bin/env python3
"""
Analyze GINI coefficients for your CURRENT timetable_slots data.

This script calculates fairness metrics for your existing schedule
WITHOUT running the GA - just pure analysis.

Run: python3 analyze_current_schedule.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from collections import defaultdict

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_KEY in .env file")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def calculate_gini_coefficient(values):
    """Calculate Gini coefficient (0=equal, 1=unequal)"""
    if not values or len(values) == 0:
        return 0.0
    if sum(values) == 0:
        return 0.0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    cumsum = sum((i + 1) * val for i, val in enumerate(sorted_values))
    gini = (2 * cumsum) / (n * sum(sorted_values)) - (n + 1) / n
    return max(0.0, min(1.0, gini))


def analyze_current_schedule():
    """Analyze the fairness of your current timetable_slots"""
    print("=" * 70)
    print("FAIRNESS ANALYSIS - Current Timetable")
    print("=" * 70)
    
    # Fetch current timetable
    slots = supabase.table("timetable_slots").select("*").execute().data
    professors = supabase.table("professors").select("*").execute().data
    
    if not slots:
        print("❌ No timetable slots found in database!")
        return
    
    print(f"\n📊 Analyzing {len(slots)} classes across {len(professors)} professors\n")
    
    # === 1. WORKLOAD DISTRIBUTION ===
    prof_hours = defaultdict(int)
    prof_classes = defaultdict(int)
    
    for slot in slots:
        prof_id = slot['professor_id']
        duration = slot.get('end_hour', slot['hour'] + 1) - slot['hour']
        prof_hours[prof_id] += duration
        prof_classes[prof_id] += 1
    
    # Map professor IDs to names
    prof_map = {p['id']: p['name'] for p in professors}
    
    print("1️⃣  WORKLOAD DISTRIBUTION")
    print("-" * 70)
    workload_list = []
    for prof_id in sorted(prof_hours.keys()):
        hours = prof_hours[prof_id]
        classes = prof_classes[prof_id]
        name = prof_map.get(prof_id, f"Prof {prof_id}")
        print(f"   {name:30s} → {hours:2d} hours/week ({classes} classes)")
        workload_list.append(hours)
    
    gini_workload = calculate_gini_coefficient(workload_list)
    print(f"\n   📈 Workload GINI: {gini_workload:.4f}", end=" ")
    
    if gini_workload < 0.2:
        print("✅ (Excellent equality)")
    elif gini_workload < 0.3:
        print("✓ (Good equality)")
    elif gini_workload < 0.4:
        print("⚠️  (Moderate inequality)")
    else:
        print("❌ (High inequality - needs balancing)")
    
    # === 2. ROOM USAGE ===
    room_usage = defaultdict(int)
    for slot in slots:
        if slot['room']:
            room_usage[slot['room']] += 1
    
    print(f"\n\n2️⃣  ROOM UTILIZATION")
    print("-" * 70)
    for room in sorted(room_usage.keys()):
        count = room_usage[room]
        bar = "█" * min(count, 50)
        print(f"   Room {room:10s} → {count:2d} classes  {bar}")
    
    gini_rooms = calculate_gini_coefficient(list(room_usage.values()))
    print(f"\n   📈 Room Usage GINI: {gini_rooms:.4f}", end=" ")
    
    if gini_rooms < 0.2:
        print("✅ (Excellent - balanced usage)")
    elif gini_rooms < 0.3:
        print("✓ (Good - mostly balanced)")
    elif gini_rooms < 0.4:
        print("⚠️  (Moderate - some rooms overused)")
    else:
        print("❌ (High - rooms very unbalanced)")
    
    # === 3. AC ACCESS EQUITY ===
    ac_rooms = ['322', '323', '324']
    prof_ac_hours = defaultdict(int)
    prof_needs_ac = defaultdict(bool)
    
    for slot in slots:
        prof_id = slot['professor_id']
        needs_ac = slot.get('needs_ac', False)
        room = slot.get('room', '')
        duration = slot.get('end_hour', slot['hour'] + 1) - slot['hour']
        
        if needs_ac:
            prof_needs_ac[prof_id] = True
        
        # Count AC hours for professors who want AC
        if needs_ac or room in ac_rooms:
            prof_needs_ac[prof_id] = True
            if room in ac_rooms:
                prof_ac_hours[prof_id] += duration
    
    print(f"\n\n3️⃣  AC ROOM ACCESS (professors who prefer AC)")
    print("-" * 70)
    
    ac_hours_list = []
    for prof_id in sorted(prof_needs_ac.keys()):
        if prof_needs_ac[prof_id]:
            ac_hours = prof_ac_hours[prof_id]
            total_hours = prof_hours[prof_id]
            percentage = (ac_hours / total_hours * 100) if total_hours > 0 else 0
            name = prof_map.get(prof_id, f"Prof {prof_id}")
            print(f"   {name:30s} → {ac_hours:2d}/{total_hours:2d} hours ({percentage:.0f}% in AC)")
            ac_hours_list.append(ac_hours)
    
    if ac_hours_list:
        gini_ac = calculate_gini_coefficient(ac_hours_list)
        print(f"\n   📈 AC Access GINI: {gini_ac:.4f}", end=" ")
        
        if gini_ac < 0.2:
            print("✅ (Excellent - fair AC distribution)")
        elif gini_ac < 0.3:
            print("✓ (Good - mostly fair)")
        elif gini_ac < 0.4:
            print("⚠️  (Moderate - some imbalance)")
        else:
            print("❌ (High - AC access very unequal)")
    else:
        print("\n   ℹ️  No professors with AC preferences detected")
        gini_ac = 0.0
    
    # === OVERALL SUMMARY ===
    avg_gini = (gini_workload + gini_rooms + gini_ac) / 3
    
    print("\n\n" + "=" * 70)
    print("📊 OVERALL FAIRNESS SCORE")
    print("=" * 70)
    print(f"   Workload:     {gini_workload:.4f}")
    print(f"   Room Usage:   {gini_rooms:.4f}")
    print(f"   AC Access:    {gini_ac:.4f}")
    print(f"   " + "-" * 40)
    print(f"   Average:      {avg_gini:.4f}", end="  ")
    
    if avg_gini < 0.2:
        rating = "EXCELLENT ✨"
    elif avg_gini < 0.3:
        rating = "GOOD ✓"
    elif avg_gini < 0.4:
        rating = "MODERATE ⚠️"
    else:
        rating = "NEEDS IMPROVEMENT ❌"
    
    print(f"({rating})")
    print("=" * 70)
    
    # RECOMMENDATIONS
    print("\n💡 RECOMMENDATIONS:")
    if gini_workload > 0.3:
        print("   • Rebalance professor workloads - some have too many/few hours")
    if gini_rooms > 0.3:
        print("   • Spread classes more evenly across rooms")
    if gini_ac > 0.3:
        print("   • Give more AC room access to professors who need it")
    if avg_gini < 0.3:
        print("   ✅ Schedule is already fair! GINI metrics look good.")
    
    print("\n🔧 Next Steps:")
    print("   1. Run GA to optimize: POST /api/generate-schedule")
    print("   2. Compare GINI before/after optimization")
    print("   3. Use lower GINI = better fairness\n")


if __name__ == "__main__":
    try:
        analyze_current_schedule()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
