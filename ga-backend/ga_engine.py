import os, random, time
from collections import defaultdict
from dotenv import load_dotenv
import database

load_dotenv()
random.seed(time.time())

POPULATION_SIZE    = int(os.getenv("POPULATION_SIZE",    80))
MAX_GENERATIONS    = int(os.getenv("MAX_GENERATIONS",   400))
CROSSOVER_PROB     = float(os.getenv("CROSSOVER_PROB",  0.80))
MUTATION_RATE_INIT = float(os.getenv("MUTATION_RATE",   0.15))
ELITISM_COUNT      = max(1, int(POPULATION_SIZE * 0.10))
TOURNAMENT_SIZE    = 5

W_HARD   = 5_000_000   # must-fix: professor teaches in 2 rooms at once is physically impossible
W_GINI_W =       400
W_GINI_R =     1_200   # push equal room usage
W_GINI_A =       600   # push AC fairness
W_AC_BON =       200

SCHEDULE_START = 8
SCHEDULE_END   = 19

AC_ROOM_IDS  = {"322", "324", "326", "328"}
LAB_ROOM_IDS = {"LAB A", "LAB B", "LAB C", "LAB D"}
AC_ROOM_BIAS = 0.65


def gini(values: list) -> float:
    n = len(values)
    if n < 2: return 0.0
    mean = sum(values) / n
    if mean == 0: return 0.0
    total = sum(abs(values[i] - values[j]) for i in range(n) for j in range(n))
    return total / (2.0 * n * n * mean)


def load_data(week_start: str = None) -> dict:
    professors = database.get_all_professors()
    rooms_raw  = database.get_all_rooms()
    slots      = database.get_all_timetable_slots(week_start=week_start)

    if not professors: raise RuntimeError("No professors in DB.")
    if not rooms_raw:  raise RuntimeError("No rooms in DB.")
    if not slots:      raise RuntimeError("No timetable slots found.")

    rooms = []
    for r in rooms_raw:
        rid = str(r["id"])
        rooms.append({"id": rid, "is_ac": (rid in AC_ROOM_IDS), "is_faculty": bool(r.get("is_faculty", False))})

    schedulable  = [r for r in rooms if not r["is_faculty"]]
    ac_rooms     = [r for r in schedulable if r["is_ac"]]

    if not schedulable: raise RuntimeError("No schedulable rooms found.")

    classes = []
    for s in slots:
        raw_hour = s.get("hour")
        raw_end  = s.get("end_hour")
        hour     = int(raw_hour) if raw_hour is not None else None
        end      = int(raw_end)  if raw_end  is not None else None

        # When hour=null, end_hour stores the DURATION (set by modal)
        if hour is None and end is not None:
            duration = max(1, end)
        elif hour is not None and end is not None:
            duration = max(1, end - hour)
        else:
            duration = 1

        classes.append({
            "slot_id":      str(s["id"]),
            "professor_id": str(s["professor_id"]),
            "subject":      s.get("subject", "TBA"),
            "needs_ac":     bool(s.get("needs_ac", False)),
            "day_of_week":  int(s["day_of_week"]),
            "duration":     duration,
        })

    return {"rooms": schedulable, "ac_rooms": ac_rooms, "classes": classes, "professors": professors}


def pick_room(needs_ac: bool, data: dict, chrom_so_far: list) -> dict:
    room_hours = defaultdict(float)
    for g in chrom_so_far:
        room_hours[g["room_id"]] += g["duration"]

    if needs_ac and data["ac_rooms"] and random.random() < AC_ROOM_BIAS:
        pool = data["ac_rooms"]
    else:
        pool = data["rooms"]

    if not pool: return random.choice(data["rooms"])

    max_h   = max((room_hours.get(r["id"], 0) for r in pool), default=0) + 1
    weights = [max_h - room_hours.get(r["id"], 0) + 1 for r in pool]
    return random.choices(pool, weights=weights, k=1)[0]


def build_conflict_free_chrom(data: dict) -> list:
    """
    Greedy initializer: assigns each class a start time that doesn't
    conflict with any already-placed class for that professor on that day.
    Resolves the 'same professor, 2 rooms at same time' problem from the start.
    """
    chrom: list = []
    # (day, professor_id) -> list of (start, end) already placed
    placed: dict = defaultdict(list)

    for cls in data["classes"]:
        duration  = cls["duration"]
        day       = cls["day_of_week"]
        max_start = max(SCHEDULE_START, SCHEDULE_END - duration)
        candidates = list(range(SCHEDULE_START, max_start + 1))
        random.shuffle(candidates)

        chosen_start = candidates[0]
        for s in candidates:
            proposed = set(range(s, min(s + duration, SCHEDULE_END)))
            used_hrs = set()
            for (us, ue) in placed[(day, cls["professor_id"])]:
                used_hrs.update(range(us, ue))
            if not proposed.intersection(used_hrs):
                chosen_start = s
                break

        chosen_end = min(chosen_start + duration, SCHEDULE_END)
        placed[(day, cls["professor_id"])].append((chosen_start, chosen_end))

        room = pick_room(cls["needs_ac"], data, chrom)
        chrom.append({
            "slot_id":      cls["slot_id"],
            "professor_id": cls["professor_id"],
            "needs_ac":     cls["needs_ac"],
            "day_of_week":  day,
            "start_hour":   chosen_start,
            "end_hour":     chosen_end,
            "room_id":      room["id"],
            "duration":     duration,
        })
    return chrom


def random_gene(cls: dict, data: dict, chrom_so_far: list) -> dict:
    room      = pick_room(cls["needs_ac"], data, chrom_so_far)
    duration  = cls["duration"]
    max_start = max(SCHEDULE_START, SCHEDULE_END - duration)
    start     = random.randint(SCHEDULE_START, max_start)
    return {
        "slot_id":      cls["slot_id"],
        "professor_id": cls["professor_id"],
        "needs_ac":     cls["needs_ac"],
        "day_of_week":  cls["day_of_week"],
        "start_hour":   start,
        "end_hour":     min(start + duration, SCHEDULE_END),
        "room_id":      room["id"],
        "duration":     duration,
    }


def init_population(data: dict) -> list:
    pop = []
    # 70% start conflict-free, 30% random for diversity
    for i in range(POPULATION_SIZE):
        if i < int(POPULATION_SIZE * 0.70):
            pop.append(build_conflict_free_chrom(data))
        else:
            chrom = []
            for c in data["classes"]:
                chrom.append(random_gene(c, data, chrom))
            pop.append(chrom)
    return pop


def hard_violations(chrom: list) -> int:
    v, ps, rs = 0, set(), set()
    for g in chrom:
        for h in range(g["start_hour"], g["end_hour"]):
            pk = (g["day_of_week"], h, g["professor_id"])
            rk = (g["day_of_week"], h, g["room_id"])
            if pk in ps: v += 1
            else: ps.add(pk)
            if rk in rs: v += 1
            else: rs.add(rk)
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
    all_prof_ids = {g["professor_id"] for g in chrom}
    if not all_prof_ids: return 0.0
    ac_hrs = {pid: 0.0 for pid in all_prof_ids}
    for g in chrom:
        if room_lookup.get(g["room_id"], {}).get("is_ac"):
            ac_hrs[g["professor_id"]] += g["end_hour"] - g["start_hour"]
    return gini(list(ac_hrs.values()))


def fitness(chrom: list, data: dict) -> tuple:
    rl    = {r["id"]: r for r in data["rooms"]}
    hv    = hard_violations(chrom)
    gw    = gini_workload(chrom, data["professors"])
    gr    = gini_room_usage(chrom, data["rooms"])
    ga    = gini_ac_access(chrom, rl)
    bon   = sum(1 for g in chrom if g["needs_ac"] and rl.get(g["room_id"], {}).get("is_ac"))
    score = -W_HARD * hv - W_GINI_W * gw - W_GINI_R * gr - W_GINI_A * ga + W_AC_BON * bon
    return score, hv, gw, gr, ga


def tournament(pop: list, fits: list) -> list:
    sample = random.sample(list(zip(pop, fits)), min(TOURNAMENT_SIZE, len(pop)))
    return max(sample, key=lambda x: x[1])[0]


def crossover(p1: list, p2: list) -> tuple:
    c1, c2 = [], []
    for g1, g2 in zip(p1, p2):
        if random.random() < 0.5:
            c1.append(g1.copy()); c2.append(g2.copy())
        else:
            c1.append(g2.copy()); c2.append(g1.copy())
    return c1, c2


def repair(chrom: list) -> list:
    """
    Post-crossover/mutation repair: if two genes for the same professor
    overlap on the same day, shift the later one to a non-conflicting slot.
    """
    placed: dict = defaultdict(list)   # (day, prof_id) -> [(start, end, idx)]
    result = [g.copy() for g in chrom]

    for i, g in enumerate(result):
        day      = g["day_of_week"]
        pid      = g["professor_id"]
        duration = g["duration"]
        start    = g["start_hour"]
        end      = g["end_hour"]

        # Check conflict with already-placed genes for this professor today
        used = set()
        for (us, ue, _) in placed[(day, pid)]:
            used.update(range(us, ue))

        proposed = set(range(start, end))
        if proposed.intersection(used):
            # Find a free slot
            max_start = max(SCHEDULE_START, SCHEDULE_END - duration)
            options   = list(range(SCHEDULE_START, max_start + 1))
            random.shuffle(options)
            for s in options:
                if not set(range(s, min(s + duration, SCHEDULE_END))).intersection(used):
                    result[i]["start_hour"] = s
                    result[i]["end_hour"]   = min(s + duration, SCHEDULE_END)
                    break

        new_start = result[i]["start_hour"]
        new_end   = result[i]["end_hour"]
        placed[(day, pid)].append((new_start, new_end, i))

    return result


def mutate(chrom: list, rate: float, data: dict) -> list:
    result = []
    for gene in chrom:
        g = gene.copy()
        if random.random() < rate:
            g["room_id"] = pick_room(g["needs_ac"], data, result)["id"]
        if random.random() < rate:
            duration  = g["duration"]
            max_start = max(SCHEDULE_START, SCHEDULE_END - duration)
            start     = random.randint(SCHEDULE_START, max_start)
            g["start_hour"] = start
            g["end_hour"]   = min(start + duration, SCHEDULE_END)
        result.append(g)
    return repair(result)


def run_genetic_algorithm(week_start: str = None) -> dict:
    data = load_data(week_start=week_start)
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

        if no_improve >= 25:
            rate = min(rate * 1.3, 0.55)
            no_improve = 0

        if gen % 20 == 0 or gen == MAX_GENERATIONS - 1:
            print(f"Gen {gen:03d} | Fit {best_fit:>13.0f} | HV {best_hv} | Gini W:{best_gw:.3f} R:{best_gr:.3f} AC:{best_ga:.3f} | rate={rate:.3f}")

        if best_hv == 0 and best_gr < 0.05:
            print(f"Early stop at gen {gen}")
            break

        elite_idx = sorted(range(len(pop)), key=lambda i: fits[i], reverse=True)
        new_pop   = [pop[i] for i in elite_idx[:ELITISM_COUNT]]

        while len(new_pop) < POPULATION_SIZE:
            p1, p2 = tournament(pop, fits), tournament(pop, fits)
            if random.random() < CROSSOVER_PROB:
                c1, c2 = crossover(p1, p2)
            else:
                c1 = [g.copy() for g in p1]; c2 = [g.copy() for g in p2]
            new_pop.append(mutate(c1, rate, data))
            if len(new_pop) < POPULATION_SIZE:
                new_pop.append(mutate(c2, rate, data))
        pop = new_pop

    soft_score = -(best_gw + best_gr + best_ga)
    sched_id, err = database.save_generated_schedule(
        fitness_score=float(best_fit), hard_violations=int(best_hv),
        soft_score=float(soft_score), gini_workload=float(best_gw),
        gini_room_usage=float(best_gr), gini_ac_access=float(best_ga),
        notes=f"GA pop={POPULATION_SIZE} gen={MAX_GENERATIONS} slots={len(data['classes'])} hv={best_hv}",
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