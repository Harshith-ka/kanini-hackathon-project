"""Real-time simulation: add simulated patients, emergency spike."""

import random
from datetime import datetime
from uuid import uuid4

from app.schemas import SYMPTOM_OPTIONS

GENDERS = ["male", "female", "other"]


def _generate_patient_id() -> str:
    return f"PT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


def generate_random_patient(force_high_risk: bool = False) -> dict:
    """
    Generate one random patient payload (suitable for add_patient flow).
    If force_high_risk=True, bias vitals/symptoms toward high risk.
    """
    if force_high_risk:
        age = random.randint(40, 85)
        heart_rate = random.randint(100, 150)
        bp_sys = random.randint(140, 190)
        bp_dia = random.randint(85, 120)
        temperature = round(random.uniform(37.5, 39.5), 1)
        spo2 = random.randint(85, 94)
        symptoms = random.sample(
            ["chest_pain", "shortness_of_breath", "unconscious", "bleeding", "trauma", "stroke_symptoms"],
            k=random.randint(2, 4),
        )
        respiratory_rate = random.randint(22, 40)
        pain_score = random.randint(7, 10)
        symptom_duration = random.randint(1, 6)
        chronic_disease_count = random.randint(1, 4)
    else:
        age = random.randint(5, 90)
        heart_rate = random.randint(55, 110)
        bp_sys = random.randint(95, 145)
        bp_dia = random.randint(60, 95)
        temperature = round(random.uniform(36.2, 37.8), 1)
        spo2 = random.randint(92, 100)
        symptoms = random.sample(SYMPTOM_OPTIONS, k=random.randint(1, 4))
        respiratory_rate = random.randint(12, 20)
        pain_score = random.randint(0, 5)
        symptom_duration = random.randint(12, 72)
        chronic_disease_count = random.randint(0, 2)

    return {
        "age": age,
        "gender": random.choice(GENDERS),
        "symptoms": symptoms,
        "heart_rate": heart_rate,
        "blood_pressure_systolic": bp_sys,
        "blood_pressure_diastolic": min(bp_dia, bp_sys - 10),
        "temperature": temperature,
        "spo2": spo2,
        "respiratory_rate": respiratory_rate,
        "pain_score": pain_score,
        "symptom_duration": symptom_duration,
        "chronic_disease_count": chronic_disease_count,
        "pre_existing_conditions": [],
    }
