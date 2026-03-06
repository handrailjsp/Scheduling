import random
import os
from dotenv import load_dotenv
import database
from collections import defaultdict

load_dotenv()

POPULATION_SIZE = int(os.getenv("POPULATION_SIZE", 50))
MAX_GENERATIONS = int(os.getenv("MAX_GENERATIONS", 200))
CROSSOVER_PROBABILITY = 0.8
MUTATION_RATE_INITIAL = 0.1
ELITISM_COUNT = int(POPULATION_SIZE * 0.1)
TOURNAMENT_SIZE = 5


# -----------------------------
# DATA LOADING
# -----------------------------

def load_data_from_database():

    professors = database.get_all_professors()
    courses = database.get_all_courses()

    # Hardcoded rooms with AC status
    rooms = [
        {"id": "101", "has_ac": False},
        {"id": "141", "has_ac": False},
        {"id": "212", "has_ac": False},
        {"id": "305", "has_ac": False},
        {"id": "322", "has_ac": True},
        {"id": "323", "has_ac": True},
        {"id": "324", "has_ac": True},
    ]

    existing_slots = database.supabase.table("timetable_slots").select("*").execute().data

    classes_to_schedule = []

    for slot in existing_slots:

        duration = slot.get("end_hour", slot["hour"] + 1) - slot["hour"]

        classes_to_schedule.append({

            "course_id": slot["id"],
            "course_name": slot["subject"],
            "professor_id": slot["professor_id"],
            "hours_needed": duration,

            "fixed_day": slot["day_of_week"],
            "fixed_start": slot["hour"],
            "fixed_end": slot.get("end_hour", slot["hour"] + 1),

            "prefers_ac": slot.get("needs_ac", False)

        })

    return {

        "classes": classes_to_schedule,
        "rooms": rooms,
        "professors": professors,
        "days": list(range(0,5)),
        "time_slots": list(range(7,19))

    }


# -----------------------------
# GENE GENERATION
# -----------------------------

def generate_gene(class_data, data):

    duration = class_data["hours_needed"]

    day = class_data["fixed_day"]
    start = class_data["fixed_start"]
    end = class_data["fixed_end"]

    if class_data["prefers_ac"]:
        ac_rooms = [r for r in data["rooms"] if r["has_ac"]]
        if ac_rooms:
            room = random.choice(ac_rooms)
        else:
            room = random.choice(data["rooms"])  # fallback if no AC rooms
    else:
        room = random.choice(data["rooms"])

    return {

        "course_id": class_data["course_id"],
        "professor_id": class_data["professor_id"],
        "room_id": room["id"],

        "day_of_week": day,
        "start_hour": start,
        "end_hour": end

    }


# -----------------------------
# POPULATION INIT
# -----------------------------

def initialize_population(data):

    population = []

    for _ in range(POPULATION_SIZE):

        chromosome = [

            generate_gene(cls,data)
            for cls in data["classes"]

        ]

        population.append(chromosome)

    return population


# -----------------------------
# HARD CONSTRAINT CHECK
# -----------------------------

def hard_constraint_penalty(chromosome, data):

    professor_usage=set()
    room_usage=set()

    violations=0

    for gene in chromosome:

        for hour in range(gene["start_hour"],gene["end_hour"]):

            prof_key=(gene["day_of_week"],hour,gene["professor_id"])
            room_key=(gene["day_of_week"],hour,gene["room_id"])

            if prof_key in professor_usage:
                violations+=1

            if room_key in room_usage:
                violations+=1

            professor_usage.add(prof_key)
            room_usage.add(room_key)

        # Check AC requirement
        class_data = next((c for c in data["classes"] if c["course_id"] == gene["course_id"]), None)
        if class_data and class_data["prefers_ac"]:
            room = next((r for r in data["rooms"] if r["id"] == gene["room_id"]), None)
            if room and not room["has_ac"]:
                violations += (gene["end_hour"] - gene["start_hour"])  # penalty proportional to duration

    return -10000*violations


# -----------------------------
# GINI CALCULATION
# -----------------------------

def calculate_gini(values):

    if not values:
        return 0

    sorted_vals=sorted(values)

    n=len(sorted_vals)

    cum=sum((i+1)*v for i,v in enumerate(sorted_vals))

    return (2*cum)/(n*sum(sorted_vals))-(n+1)/n


def fairness_score(chromosome):

    prof_hours=defaultdict(int)

    for g in chromosome:

        prof_hours[g["professor_id"]]+=g["end_hour"]-g["start_hour"]

    gini=calculate_gini(list(prof_hours.values()))

    return (1-gini)*100


# -----------------------------
# FITNESS
# -----------------------------

def fitness(chromosome, data):

    hard=hard_constraint_penalty(chromosome, data)

    fair=fairness_score(chromosome)

    return hard + fair


# -----------------------------
# SELECTION
# -----------------------------

def tournament_selection(pop,fit):

    sample=random.sample(list(zip(pop,fit)),TOURNAMENT_SIZE)

    return max(sample,key=lambda x:x[1])[0]


# -----------------------------
# CROSSOVER
# -----------------------------

def crossover(p1,p2):

    child1=[]
    child2=[]

    for g1,g2 in zip(p1,p2):

        if random.random()<0.5:
            child1.append(g1.copy())
            child2.append(g2.copy())
        else:
            child1.append(g2.copy())
            child2.append(g1.copy())

    return child1,child2


# -----------------------------
# MUTATION
# -----------------------------

def mutate(chromosome,data):

    for gene in chromosome:

        if random.random()<MUTATION_RATE_INITIAL:

            class_data = next((c for c in data["classes"] if c["course_id"] == gene["course_id"]), None)
            if class_data and class_data["prefers_ac"]:
                ac_rooms = [r for r in data["rooms"] if r["has_ac"]]
                if ac_rooms:
                    gene["room_id"]=random.choice(ac_rooms)["id"]
            else:
                gene["room_id"]=random.choice(data["rooms"])["id"]

    return chromosome


# -----------------------------
# MAIN GA
# -----------------------------

def run_genetic_algorithm():

    data=load_data_from_database()

    population=initialize_population(data)

    best=None
    best_fit=-999999

    for gen in range(MAX_GENERATIONS):

        fits=[fitness(c, data) for c in population]

        max_index=fits.index(max(fits))

        if fits[max_index]>best_fit:

            best_fit=fits[max_index]
            best=population[max_index]

        new_pop=[]

        elite_index=sorted(range(len(population)),key=lambda i:fits[i],reverse=True)[:ELITISM_COUNT]

        for i in elite_index:
            new_pop.append(population[i])

        while len(new_pop)<POPULATION_SIZE:

            p1=tournament_selection(population,fits)
            p2=tournament_selection(population,fits)

            if random.random()<CROSSOVER_PROBABILITY:
                c1,c2=crossover(p1,p2)
            else:
                c1=p1
                c2=p2

            c1=mutate(c1,data)
            c2=mutate(c2,data)

            new_pop.append(c1)

            if len(new_pop)<POPULATION_SIZE:
                new_pop.append(c2)

        population=new_pop

    print("GA finished")

    # Calculate final metrics
    final_fitness = fitness(best, data)
    final_hard = hard_constraint_penalty(best, data)
    final_fair = fairness_score(best)
    
    # Calculate Gini coefficients
    prof_hours = defaultdict(int)
    for g in best:
        prof_hours[g["professor_id"]] += g["end_hour"] - g["start_hour"]
    gini_workload = calculate_gini(list(prof_hours.values()))
    
    # Placeholders for other ginis
    gini_room_usage = 0.0
    gini_ac_access = 0.0

    schedule_id = database.save_generated_schedule(final_fitness, -final_hard // 10000 if final_hard < 0 else 0, final_fair, gini_workload, gini_room_usage, gini_ac_access, "GA RESULT")

    database.save_schedule_slots(schedule_id[0] if schedule_id[0] else 1, best, [])

    return {
        "schedule_id": schedule_id[0] if schedule_id[0] else 1,
        "fitness_score": final_fitness,
        "hard_violations": -final_hard // 10000 if final_hard < 0 else 0,
        "soft_score": final_fair,
        "gini_workload": gini_workload,
        "gini_room_usage": gini_room_usage,
        "gini_ac_access": gini_ac_access,
        "schedule": best
    }