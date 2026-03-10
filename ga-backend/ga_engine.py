import random
import os
import time
from dotenv import load_dotenv
import database
from collections import defaultdict

load_dotenv()
random.seed(time.time())

POPULATION_SIZE = int(os.getenv("POPULATION_SIZE", 50))
MAX_GENERATIONS = int(os.getenv("MAX_GENERATIONS", 200))
CROSSOVER_PROBABILITY = 0.8
MUTATION_RATE_INITIAL = 0.1
ELITISM_COUNT = int(POPULATION_SIZE * 0.1)
TOURNAMENT_SIZE = 5


def load_data_from_database():
    professors = database.get_all_professors()
    courses = database.get_all_courses()
    rooms = database.get_all_rooms()

    existing_slots = database.supabase.table("timetable_slots").select("*").execute().data

    ac_rooms = [
        {"id": 322, "code": "322", "has_ac": True},
        {"id": 323, "code": "323", "has_ac": True},
        {"id": 324, "code": "324", "has_ac": True},
    ]

    if not rooms:
        rooms = ac_rooms

    all_rooms = [{"id": r["id"], "code": r["code"], "has_ac": r.get("has_ac", False)} for r in rooms]

    classes_to_schedule = []

    for slot in existing_slots:
        classes_to_schedule.append({
            "course_id": 1,
            "professor_id": slot["professor_id"],
            "prefers_ac": slot.get("needs_ac", False),
            "fixed_day": slot["day_of_week"],
            "fixed_hour": slot["hour"],
            "fixed_end_hour": slot.get("end_hour", slot["hour"] + 1),
        })

    return {
        "rooms": all_rooms,
        "ac_rooms": [r for r in all_rooms if r["has_ac"]],
        "days": list(range(7)),
        "time_slots": list(range(24)),
        "classes": classes_to_schedule,
        "professors": professors,
        "courses": courses,
        "constraints": []
    }


def generate_random_gene(class_data, data):

    day = class_data["fixed_day"]
    start_hour = class_data["fixed_hour"]
    end_hour = class_data["fixed_end_hour"]

    rooms = data.get("rooms", [])

    if not rooms:
        raise Exception("No rooms found in database")

    if class_data.get("prefers_ac") and data["ac_rooms"]:
        room = random.choice(data["ac_rooms"])
    else:
        room = random.choice(rooms)

    return {
        "course_id": class_data["course_id"],
        "professor_id": class_data["professor_id"],
        "room_id": room["id"],
        "day_of_week": day,
        "start_hour": start_hour,
        "end_hour": end_hour
    }


def initialize_population(data):
    population = []
    for _ in range(POPULATION_SIZE):
        chromosome = [generate_random_gene(cls, data) for cls in data["classes"]]
        population.append(chromosome)
    return population


def hard_constraint_penalty(chromosome):

    violations = 0
    professor_set = set()

    for gene in chromosome:

        start = gene["start_hour"]
        end = gene["end_hour"]

        for hour in range(start, end):

            key = (gene["day_of_week"], hour, gene["professor_id"])

            if key in professor_set:
                violations += 1
            else:
                professor_set.add(key)

    return -violations * 10000


def soft_constraint_score(chromosome, data):

    score = 0

    room_lookup = {r["id"]: r for r in data["rooms"]}

    for i, gene in enumerate(chromosome):

        class_data = data["classes"][i]
        room = room_lookup.get(gene["room_id"])

        if class_data.get("prefers_ac") and room and room.get("has_ac"):
            score += 100

    return score


def calculate_fitness(chromosome, data):

    alpha = 1000
    beta = 10

    hard = hard_constraint_penalty(chromosome)
    soft = soft_constraint_score(chromosome, data)

    return alpha * hard + beta * soft


def tournament_selection(population, fitnesses):

    members = random.sample(list(zip(population, fitnesses)), TOURNAMENT_SIZE)

    return max(members, key=lambda x: x[1])[0]


def uniform_crossover(p1, p2):

    child1 = []
    child2 = []

    for g1, g2 in zip(p1, p2):

        if random.random() < 0.5:
            child1.append(g1)
            child2.append(g2)
        else:
            child1.append(g2)
            child2.append(g1)

    return child1, child2


def mutate(chromosome, mutation_rate, data):

    rooms = data.get("rooms", [])

    if not rooms:
        return chromosome

    new_chromosome = []

    for gene in chromosome:

        new_gene = gene.copy()

        if random.random() < mutation_rate:

            room = random.choice(rooms)
            new_gene["room_id"] = room["id"]

        new_chromosome.append(new_gene)

    return new_chromosome


def run_genetic_algorithm():

    data = load_data_from_database()

    population = initialize_population(data)

    best_schedule = None
    best_fitness = -float("inf")

    mutation_rate = MUTATION_RATE_INITIAL

    for generation in range(MAX_GENERATIONS):

        fitnesses = [calculate_fitness(c, data) for c in population]

        best_index = fitnesses.index(max(fitnesses))

        if fitnesses[best_index] > best_fitness:
            best_fitness = fitnesses[best_index]
            best_schedule = population[best_index]

        new_population = []

        elite_indices = sorted(range(POPULATION_SIZE), key=lambda i: fitnesses[i], reverse=True)[:ELITISM_COUNT]

        for i in elite_indices:
            new_population.append(population[i])

        while len(new_population) < POPULATION_SIZE:

            parent1 = tournament_selection(population, fitnesses)
            parent2 = tournament_selection(population, fitnesses)

            if random.random() < CROSSOVER_PROBABILITY:
                child1, child2 = uniform_crossover(parent1, parent2)
            else:
                child1, child2 = parent1, parent2

            child1 = mutate(child1, mutation_rate, data)
            child2 = mutate(child2, mutation_rate, data)

            new_population.append(child1)

            if len(new_population) < POPULATION_SIZE:
                new_population.append(child2)

        population = new_population

    schedule_id, err = database.save_generated_schedule(
        fitness_score=best_fitness,
        hard_violations=0,
        soft_score=0
    )

    database.save_schedule_slots(schedule_id, best_schedule)

    return {
        "schedule_id": schedule_id,
        "fitness_score": best_fitness,
        "hard_violations": 0,
        "soft_score": 0
    }