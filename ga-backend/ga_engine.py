import os, random, time
from collections import defaultdict
from dotenv import load_dotenv
import database

load_dotenv()
random.seed(time.time())

POPULATION_SIZE    = int(os.getenv("POPULATION_SIZE",   50))
MAX_GENERATIONS    = int(os.getenv("MAX_GENERATIONS",  200))
CROSSOVER_PROB     = float(os.getenv("CROSSOVER_PROB", 0.80))
MUTATION_RATE_INIT = float(os.getenv("MUTATION_RATE",  0.15))
ELITISM_COUNT      = max(1, int(POPULATION_SIZE * 0.10))
TOURNAMENT_SIZE    = 5

W_HARD   = 1_000_000
W_GINI_W =       500
W_GINI_R =       300
W_GINI_A =       400
W_AC_BON =       100


def gini(values: list) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    if mean == 0:
        return 0.0
    total = sum(abs(values[i] - values[j]) for i in range(n) for j in range(n))
    return total / (2.0 * n * n * mean)


def load_data() -> dict:
    professors = database.get_all_professors()
    rooms_raw  = database.get_all_rooms()
    slots      = database.get_all_timetable_slots()

    if not professors:
        raise RuntimeError("No professors in DB.")
    if not rooms_raw:
        raise RuntimeError("No rooms in DB.")
    if not slots:
        raise RuntimeError("No timetable slots found. Add subjects via Admin panel first.")

    rooms = []
    for r in rooms_raw:
        is_lab = str(r.get("room_type", "")).lower() == "laboratory"
        rooms.append({
            "id":         str(r["id"]),
            "is_ac":      False if is_lab else bool(r.get("is_ac", False)),
            "is_faculty": bool(r.get("is_faculty", False)),
        })

    schedulable = [r for r in rooms if not r["is_faculty"]]
    ac_rooms    = [r for r in schedulable if r["is_ac"]]

    if not schedulable:
        raise RuntimeError("No schedulable rooms found.")

    classes = []
    for s in slots:
        raw_end = s.get("end_hour") or (int(s["hour"]) + 1)
        classes.append({
            "slot_id":      str(s["id"]),
            "professor_id": str(s["professor_id"]),
            "subject":      s.get("subject", "TBA"),
            "needs_ac":     bool(s.get("needs_ac", False)),
            "day_of_week":  int(s["day_of_week"]),
            "start_hour":   int(s["hour"]),
            "end_hour":     int(raw_end),
        })

    return {
        "rooms":      schedulable,
        "ac_rooms":   ac_rooms,
        "classes":    classes,
        "professors": professors,
    }


def random_gene(cls: dict, data: dict) -> dict:
    pool = data["ac_rooms"] if cls["needs_ac"] and data["ac_rooms"] else data["rooms"]
    room = random.choice(pool)
    return {
        "slot_id":      cls["slot_id"],
        "professor_id": cls["professor_id"],
        "needs_ac":     cls["needs_ac"],
        "day_of_week":  cls["day_of_week"],
        "start_hour":   cls["start_hour"],
        "end_hour":     cls["end_hour"],
        "room_id":      room["id"],
    }


def init_population(data: dict) -> list:
    return [
        [random_gene(c, data) for c in data["classes"]]
        for _ in range(POPULATION_SIZE)
    ]


def hard_violations(chrom: list) -> int:
    v, ps, rs = 0, set(), set()
    for g in chrom:
        for h in range(g["start_hour"], g["end_hour"]):
            pk = (g["day_of_week"], h, g["professor_id"])
            rk = (g["day_of_week"], h, g["room_id"])
            if pk in ps:
                v += 1
            else:
                ps.add(pk)
            if rk in rs:
                v += 1
            else:
                rs.add(rk)
    return v


def gini_workload(chrom: list, professors: list) -> float:
    hrs = defaultdict(float)
    for g in chrom:
        hrs[g["professor_id"]] += g["end_hour"] - g["start_hour"]
    for p in professors:
        hrs.setdefault(str(p["id"]), 0.0)
    return gini(list(hrs.values()))


def gini_room_usage(chrom: list, rooms: list) -> float:
    hrs = defaultdict(float)
    for g in chrom:
        hrs[g["room_id"]] += g["end_hour"] - g["start_hour"]
    for r in rooms:
        hrs.setdefault(str(r["id"]), 0.0)
    return gini(list(hrs.values()))


def gini_ac_access(chrom: list, room_lookup: dict) -> float:
    profs_needing_ac = {g["professor_id"] for g in chrom if g["needs_ac"]}
    if not profs_needing_ac:
        return 0.0
    ac_hrs = {pid: 0.0 for pid in profs_needing_ac}
    for g in chrom:
        pid = g["professor_id"]
        if pid in profs_needing_ac and room_lookup.get(g["room_id"], {}).get("is_ac"):
            ac_hrs[pid] += g["end_hour"] - g["start_hour"]
    return gini(list(ac_hrs.values()))


def fitness(chrom: list, data: dict) -> tuple:
    rl  = {r["id"]: r for r in data["rooms"]}
    hv  = hard_violations(chrom)
    gw  = gini_workload(chrom, data["professors"])
    gr  = gini_room_usage(chrom, data["rooms"])
    ga  = gini_ac_access(chrom, rl)
    bon = sum(1 for g in chrom if g["needs_ac"] and rl.get(g["room_id"], {}).get("is_ac"))
    score = -W_HARD * hv - W_GINI_W * gw - W_GINI_R * gr - W_GINI_A * ga + W_AC_BON * bon
    return score, hv, gw, gr, ga


def tournament(pop: list, fits: list) -> list:
    sample = random.sample(list(zip(pop, fits)), min(TOURNAMENT_SIZE, len(pop)))
    return max(sample, key=lambda x: x[1])[0]


def crossover(p1: list, p2: list) -> tuple:
    c1, c2 = [], []
    for g1, g2 in zip(p1, p2):
        if random.random() < 0.5:
            c1.append(g1.copy())
            c2.append(g2.copy())
        else:
            c1.append(g2.copy())
            c2.append(g1.copy())
    return c1, c2


def mutate(chrom: list, rate: float, data: dict) -> list:
    result = []
    for gene in chrom:
        g = gene.copy()
        if random.random() < rate:
            pool = data["ac_rooms"] if g["needs_ac"] and data["ac_rooms"] else data["rooms"]
            g["room_id"] = random.choice(pool)["id"]
        result.append(g)
    return result


def run_genetic_algorithm() -> dict:
    data = load_data()
    pop  = init_population(data)

    best_chrom = None
    best_fit   = -float("inf")
    best_hv    = 0
    best_gw = best_gr = best_ga = 0.0
    rate       = MUTATION_RATE_INIT
    no_improve = 0

    for gen in range(MAX_GENERATIONS):
        evals = [fitness(c, data) for c in pop]
        fits  = [e[0] for e in evals]
        bi    = fits.index(max(fits))

        if fits[bi] > best_fit:
            best_fit   = fits[bi]
            best_chrom = pop[bi]
            _, best_hv, best_gw, best_gr, best_ga = evals[bi]
            no_improve = 0
        else:
            no_improve += 1

        if no_improve >= 20:
            rate = min(rate * 1.3, 0.50)
            no_improve = 0

        if gen % 20 == 0 or gen == MAX_GENERATIONS - 1:
            print(
                f"Gen {gen:03d} | Fit {best_fit:>13.0f} | "
                f"Violations {best_hv} | "
                f"Gini W:{best_gw:.3f} R:{best_gr:.3f} AC:{best_ga:.3f} | "
                f"rate={rate:.3f}"
            )

        elite_idx = sorted(range(len(pop)), key=lambda i: fits[i], reverse=True)
        new_pop   = [pop[i] for i in elite_idx[:ELITISM_COUNT]]

        while len(new_pop) < POPULATION_SIZE:
            p1, p2 = tournament(pop, fits), tournament(pop, fits)
            if random.random() < CROSSOVER_PROB:
                c1, c2 = crossover(p1, p2)
            else:
                c1 = [g.copy() for g in p1]
                c2 = [g.copy() for g in p2]
            new_pop.append(mutate(c1, rate, data))
            if len(new_pop) < POPULATION_SIZE:
                new_pop.append(mutate(c2, rate, data))

        pop = new_pop

    soft_score = -(best_gw + best_gr + best_ga)

    sched_id, err = database.save_generated_schedule(
        fitness_score   = float(best_fit),
        hard_violations = int(best_hv),
        soft_score      = float(soft_score),
        gini_workload   = float(best_gw),
        gini_room_usage = float(best_gr),
        gini_ac_access  = float(best_ga),
        notes           = f"GA pop={POPULATION_SIZE} gen={MAX_GENERATIONS} slots={len(data['classes'])} violations={best_hv}",
    )

    if err:
        print(f"save_generated_schedule failed: {err}")
        return {"error": err}

    _, slot_err = database.save_schedule_slots(sched_id, best_chrom)
    if slot_err:
        print(f"save_schedule_slots errors: {slot_err}")

    return {
        "schedule_id":     sched_id,
        "fitness_score":   best_fit,
        "hard_violations": best_hv,
        "soft_score":      soft_score,
        "gini_workload":   best_gw,
        "gini_room_usage": best_gr,
        "gini_ac_access":  best_ga,
    }