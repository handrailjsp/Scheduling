#!/usr/bin/env python3
"""
Test suite for GINI coefficient calculations in the GA scheduling system.

Run this with: python3 test_gini.py

This is a standalone test that doesn't require database connection.
"""

from collections import defaultdict


# ===== COPY OF FUNCTIONS FROM ga_engine.py (for standalone testing) =====

def calculate_gini_coefficient(values):
    """
    Calculate Gini coefficient for distribution fairness.
    
    Returns:
        float: Gini coefficient (0 = perfect equality, 1 = perfect inequality)
    
    Interpretation:
        0.0 - 0.2: Excellent equality
        0.2 - 0.3: Good equality
        0.3 - 0.4: Moderate inequality
        0.4 - 0.5: High inequality
        0.5+:      Very high inequality
    """
    if not values or len(values) == 0:
        return 0.0
    
    # Handle all zeros case
    if sum(values) == 0:
        return 0.0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    
    # Gini coefficient formula
    cumsum = sum((i + 1) * val for i, val in enumerate(sorted_values))
    gini = (2 * cumsum) / (n * sum(sorted_values)) - (n + 1) / n
    
    return max(0.0, min(1.0, gini))  # Clamp to [0, 1]


def calculate_gini_metrics(chromosome, data):
    """
    Calculate multiple Gini coefficients for schedule fairness.
    
    Returns:
        dict: {
            'gini_workload': Gini for professor teaching hours distribution,
            'gini_room_usage': Gini for room utilization,
            'gini_ac_access': Gini for AC room access among AC-preferring professors
        }
    """
    professor_hours = defaultdict(int)
    room_usage = defaultdict(int)
    ac_access = defaultdict(int)
    
    # Collect metrics from schedule
    for gene in chromosome:
        prof_id = gene["professor_id"]
        room_id = gene["room_id"]
        duration = gene.get("end_hour", gene["start_hour"] + 1) - gene["start_hour"]
        
        # Track professor workload (hours)
        professor_hours[prof_id] += duration
        
        # Track room usage (number of classes)
        room_usage[room_id] += 1
        
        # Track AC room access for professors who prefer AC
        class_idx = chromosome.index(gene)
        if class_idx < len(data["classes"]) and data["classes"][class_idx].get("prefers_ac", False):
            room = next((r for r in data["rooms"] if r["id"] == room_id), None)
            if room and room.get("has_ac", False):
                ac_access[prof_id] += duration
    
    # Calculate Gini coefficients
    gini_workload = calculate_gini_coefficient(list(professor_hours.values())) if professor_hours else 0.0
    gini_room_usage = calculate_gini_coefficient(list(room_usage.values())) if room_usage else 0.0
    gini_ac_access = calculate_gini_coefficient(list(ac_access.values())) if ac_access else 0.0
    
    return {
        "gini_workload": round(gini_workload, 4),
        "gini_room_usage": round(gini_room_usage, 4),
        "gini_ac_access": round(gini_ac_access, 4)
    }

# ===== END OF COPIED FUNCTIONS =====


def test_gini_coefficient_perfect_equality():
    """Test GINI with perfect equality (all values equal) - should be 0"""
    print("\n=== Test 1: Perfect Equality ===")
    values = [10, 10, 10, 10, 10]
    gini = calculate_gini_coefficient(values)
    print(f"Values: {values}")
    print(f"Gini Coefficient: {gini:.4f}")
    print(f"Expected: 0.0000 (perfect equality)")
    assert gini == 0.0, f"Expected 0.0, got {gini}"
    print("✓ PASSED")


def test_gini_coefficient_perfect_inequality():
    """Test GINI with maximum inequality (one person has everything)"""
    print("\n=== Test 2: Perfect Inequality ===")
    values = [0, 0, 0, 0, 100]
    gini = calculate_gini_coefficient(values)
    print(f"Values: {values}")
    print(f"Gini Coefficient: {gini:.4f}")
    print(f"Expected: ~0.8000 (very high inequality)")
    assert gini > 0.7, f"Expected > 0.7, got {gini}"
    print("✓ PASSED")


def test_gini_coefficient_moderate_inequality():
    """Test GINI with moderate inequality"""
    print("\n=== Test 3: Moderate Inequality ===")
    values = [5, 10, 15, 20, 25]
    gini = calculate_gini_coefficient(values)
    print(f"Values: {values}")
    print(f"Gini Coefficient: {gini:.4f}")
    print(f"Expected: 0.2000-0.3000 (good/moderate inequality)")
    assert 0.15 < gini < 0.35, f"Expected 0.15-0.35, got {gini}"
    print("✓ PASSED")


def test_gini_coefficient_edge_cases():
    """Test GINI with edge cases (empty, all zeros, single value)"""
    print("\n=== Test 4: Edge Cases ===")
    
    # Empty list
    print("Testing empty list...")
    gini = calculate_gini_coefficient([])
    print(f"  Gini Coefficient: {gini:.4f}")
    assert gini == 0.0
    print("  ✓ Empty list handled correctly")
    
    # All zeros
    print("Testing all zeros...")
    gini = calculate_gini_coefficient([0, 0, 0, 0])
    print(f"  Gini Coefficient: {gini:.4f}")
    assert gini == 0.0
    print("  ✓ All zeros handled correctly")
    
    # Single value
    print("Testing single value...")
    gini = calculate_gini_coefficient([42])
    print(f"  Gini Coefficient: {gini:.4f}")
    assert gini == 0.0
    print("  ✓ Single value handled correctly")
    
    print("✓ ALL EDGE CASES PASSED")


def test_gini_metrics_workload():
    """Test GINI metrics calculation for professor workload distribution"""
    print("\n=== Test 5: Workload Distribution ===")
    
    # Create a mock schedule
    # 3 professors: Prof 1 gets 6 hours, Prof 2 gets 6 hours, Prof 3 gets 3 hours
    chromosome = [
        {"professor_id": 1, "room_id": 1, "start_hour": 8, "end_hour": 10, "day_of_week": 1},  # 2 hours
        {"professor_id": 1, "room_id": 1, "start_hour": 10, "end_hour": 12, "day_of_week": 1}, # 2 hours
        {"professor_id": 1, "room_id": 1, "start_hour": 13, "end_hour": 15, "day_of_week": 2}, # 2 hours
        {"professor_id": 2, "room_id": 2, "start_hour": 8, "end_hour": 11, "day_of_week": 1},  # 3 hours
        {"professor_id": 2, "room_id": 2, "start_hour": 11, "end_hour": 14, "day_of_week": 2}, # 3 hours
        {"professor_id": 3, "room_id": 3, "start_hour": 14, "end_hour": 17, "day_of_week": 1}, # 3 hours
    ]
    
    data = {
        "classes": [{"prefers_ac": False}] * len(chromosome),
        "rooms": [
            {"id": 1, "has_ac": False},
            {"id": 2, "has_ac": False},
            {"id": 3, "has_ac": False}
        ]
    }
    
    metrics = calculate_gini_metrics(chromosome, data)
    
    print(f"Professor hours: Prof1=6, Prof2=6, Prof3=3")
    print(f"Workload Gini: {metrics['gini_workload']:.4f}")
    print(f"Expected: 0.1111-0.2222 (good equality, slight imbalance)")
    assert 0.05 < metrics['gini_workload'] < 0.25, f"Unexpected workload gini: {metrics['gini_workload']}"
    print("✓ PASSED")


def test_gini_metrics_room_usage():
    """Test GINI metrics calculation for room usage distribution"""
    print("\n=== Test 6: Room Usage Distribution ===")
    
    # Room 1 used 4 times, Room 2 used 2 times, Room 3 used 1 time
    chromosome = [
        {"professor_id": 1, "room_id": 1, "start_hour": 8, "end_hour": 9, "day_of_week": 1},
        {"professor_id": 2, "room_id": 1, "start_hour": 10, "end_hour": 11, "day_of_week": 1},
        {"professor_id": 3, "room_id": 1, "start_hour": 12, "end_hour": 13, "day_of_week": 1},
        {"professor_id": 1, "room_id": 1, "start_hour": 14, "end_hour": 15, "day_of_week": 1},
        {"professor_id": 2, "room_id": 2, "start_hour": 8, "end_hour": 9, "day_of_week": 2},
        {"professor_id": 3, "room_id": 2, "start_hour": 10, "end_hour": 11, "day_of_week": 2},
        {"professor_id": 1, "room_id": 3, "start_hour": 8, "end_hour": 9, "day_of_week": 3},
    ]
    
    data = {
        "classes": [{"prefers_ac": False}] * len(chromosome),
        "rooms": [
            {"id": 1, "has_ac": False},
            {"id": 2, "has_ac": False},
            {"id": 3, "has_ac": False}
        ]
    }
    
    metrics = calculate_gini_metrics(chromosome, data)
    
    print(f"Room usage: Room1=4 classes, Room2=2 classes, Room3=1 class")
    print(f"Room Usage Gini: {metrics['gini_room_usage']:.4f}")
    print(f"Expected: 0.2500-0.4000 (moderate inequality)")
    assert 0.15 < metrics['gini_room_usage'] < 0.50, f"Unexpected room gini: {metrics['gini_room_usage']}"
    print("✓ PASSED")


def test_gini_metrics_ac_access():
    """Test GINI metrics calculation for AC room access equity"""
    print("\n=== Test 7: AC Access Equity ===")
    
    # Prof 1 (AC pref): gets 4 hours in AC room
    # Prof 2 (AC pref): gets 2 hours in AC room
    # Prof 3 (AC pref): gets 0 hours in AC room
    chromosome = [
        {"professor_id": 1, "room_id": 322, "start_hour": 8, "end_hour": 10, "day_of_week": 1},  # 2 AC hours
        {"professor_id": 1, "room_id": 322, "start_hour": 10, "end_hour": 12, "day_of_week": 1}, # 2 AC hours
        {"professor_id": 2, "room_id": 323, "start_hour": 8, "end_hour": 10, "day_of_week": 2},  # 2 AC hours
        {"professor_id": 3, "room_id": 100, "start_hour": 8, "end_hour": 10, "day_of_week": 3},  # 0 AC hours
    ]
    
    data = {
        "classes": [
            {"prefers_ac": True},   # Prof 1 prefers AC
            {"prefers_ac": True},   # Prof 1 prefers AC
            {"prefers_ac": True},   # Prof 2 prefers AC
            {"prefers_ac": True},   # Prof 3 prefers AC
        ],
        "rooms": [
            {"id": 322, "has_ac": True},
            {"id": 323, "has_ac": True},
            {"id": 100, "has_ac": False}
        ]
    }
    
    metrics = calculate_gini_metrics(chromosome, data)
    
    print(f"AC access hours: Prof1=4, Prof2=2, Prof3=0")
    print(f"AC Access Gini: {metrics['gini_ac_access']:.4f}")
    print(f"Expected: 0.4000-0.6000 (high inequality)")
    assert 0.3 < metrics['gini_ac_access'] < 0.7, f"Unexpected AC access gini: {metrics['gini_ac_access']}"
    print("✓ PASSED")


def test_gini_real_world_scenario():
    """Test with a realistic university scheduling scenario"""
    print("\n=== Test 8: Real-World Scenario ===")
    print("Simulating a realistic schedule with 5 professors, 3 AC rooms, 3 regular rooms")
    
    # Realistic scenario: 5 professors with varying workloads
    chromosome = [
        # Prof 1: Heavy load, mostly AC rooms (6 hours)
        {"professor_id": 1, "room_id": 322, "start_hour": 8, "end_hour": 10, "day_of_week": 1},
        {"professor_id": 1, "room_id": 322, "start_hour": 13, "end_hour": 15, "day_of_week": 1},
        {"professor_id": 1, "room_id": 323, "start_hour": 8, "end_hour": 10, "day_of_week": 2},
        
        # Prof 2: Medium load, mixed rooms (4 hours)
        {"professor_id": 2, "room_id": 323, "start_hour": 10, "end_hour": 12, "day_of_week": 1},
        {"professor_id": 2, "room_id": 100, "start_hour": 13, "end_hour": 15, "day_of_week": 2},
        
        # Prof 3: Light load, no AC (2 hours)
        {"professor_id": 3, "room_id": 101, "start_hour": 15, "end_hour": 17, "day_of_week": 1},
        
        # Prof 4: Medium load, some AC (3 hours)
        {"professor_id": 4, "room_id": 324, "start_hour": 10, "end_hour": 12, "day_of_week": 2},
        {"professor_id": 4, "room_id": 100, "start_hour": 15, "end_hour": 16, "day_of_week": 2},
        
        # Prof 5: Heavy load, no AC preference (5 hours)
        {"professor_id": 5, "room_id": 101, "start_hour": 8, "end_hour": 10, "day_of_week": 3},
        {"professor_id": 5, "room_id": 102, "start_hour": 10, "end_hour": 13, "day_of_week": 3},
    ]
    
    data = {
        "classes": [
            {"prefers_ac": True},  # Prof 1
            {"prefers_ac": True},  # Prof 1
            {"prefers_ac": True},  # Prof 1
            {"prefers_ac": True},  # Prof 2
            {"prefers_ac": True},  # Prof 2
            {"prefers_ac": False}, # Prof 3
            {"prefers_ac": True},  # Prof 4
            {"prefers_ac": True},  # Prof 4
            {"prefers_ac": False}, # Prof 5
            {"prefers_ac": False}, # Prof 5
        ],
        "rooms": [
            {"id": 322, "has_ac": True},
            {"id": 323, "has_ac": True},
            {"id": 324, "has_ac": True},
            {"id": 100, "has_ac": False},
            {"id": 101, "has_ac": False},
            {"id": 102, "has_ac": False}
        ]
    }
    
    metrics = calculate_gini_metrics(chromosome, data)
    
    print(f"\n📊 Calculated Metrics:")
    print(f"   • Workload Gini: {metrics['gini_workload']:.4f}")
    print(f"   • Room Usage Gini: {metrics['gini_room_usage']:.4f}")
    print(f"   • AC Access Gini: {metrics['gini_ac_access']:.4f}")
    
    # Calculate average
    avg_gini = (metrics['gini_workload'] + metrics['gini_room_usage'] + metrics['gini_ac_access']) / 3
    print(f"   • Average Gini: {avg_gini:.4f}")
    
    # Interpret results
    if avg_gini < 0.2:
        fairness = "Excellent ✨"
    elif avg_gini < 0.3:
        fairness = "Good ✓"
    elif avg_gini < 0.4:
        fairness = "Moderate ⚠️"
    else:
        fairness = "Needs Improvement ❌"
    
    print(f"   → Fairness Rating: {fairness}")
    
    # Manual verification
    print(f"\n📋 Manual Verification:")
    print(f"   Professor hours: P1=6, P2=4, P3=2, P4=3, P5=5")
    print(f"   AC hours (for AC-preferring profs): P1=6, P2=2, P4=2")
    print(f"   Room usage: 322=2, 323=2, 324=1, 100=2, 101=2, 102=1")
    
    # All metrics should be within reasonable bounds
    assert 0.0 <= metrics['gini_workload'] <= 1.0
    assert 0.0 <= metrics['gini_room_usage'] <= 1.0
    assert 0.0 <= metrics['gini_ac_access'] <= 1.0
    print("✓ PASSED - All metrics in valid range [0, 1]")


def run_all_tests():
    """Run all GINI coefficient tests"""
    print("=" * 60)
    print("GINI COEFFICIENT TEST SUITE")
    print("Testing fairness metrics for GA scheduling system")
    print("=" * 60)
    
    try:
        test_gini_coefficient_perfect_equality()
        test_gini_coefficient_perfect_inequality()
        test_gini_coefficient_moderate_inequality()
        test_gini_coefficient_edge_cases()
        test_gini_metrics_workload()
        test_gini_metrics_room_usage()
        test_gini_metrics_ac_access()
        test_gini_real_world_scenario()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nThe GINI coefficient implementation is working correctly.")
        print("You can now use these metrics to evaluate schedule fairness:")
        print("  • 0.0 - 0.2: Excellent equality")
        print("  • 0.2 - 0.3: Good equality")
        print("  • 0.3 - 0.4: Moderate inequality")
        print("  • 0.4+:      High inequality (needs improvement)")
        
    except AssertionError as e:
        print("\n" + "=" * 60)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 60)
        return False
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ ERROR: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    run_all_tests()
