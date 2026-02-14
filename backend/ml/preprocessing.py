"""Preprocessing pipeline: encoding + scaling for triage features."""

import numpy as np
from sklearn.preprocessing import StandardScaler

from app.schemas import SYMPTOM_OPTIONS

# Feature order expected by the model (must match training)
GENDER_MAP = {"male": 0, "female": 1, "other": 2}
SYMPTOM_COLUMNS = [f"symptom_{s}" for s in SYMPTOM_OPTIONS]
NUMERIC_FEATURES = ["age", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "temperature", "spo2"]
ALL_FEATURES = ["age", "gender_enc", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "temperature", "spo2"] + SYMPTOM_COLUMNS


def encode_symptoms(symptoms: list[str]) -> dict[str, int]:
    """Encode symptoms to binary columns."""
    return {f"symptom_{s}": 1 if s in symptoms else 0 for s in SYMPTOM_OPTIONS}


def preprocess_single(
    age: int,
    gender: str,
    heart_rate: int,
    blood_pressure_systolic: int,
    blood_pressure_diastolic: int,
    temperature: float,
    spo2: int,
    symptoms: list[str],
    scaler: StandardScaler,
) -> np.ndarray:
    """Convert single patient dict to scaled feature vector for prediction."""
    gender_enc = GENDER_MAP.get(gender, 2)
    symptom_enc = encode_symptoms(symptoms)
    row = {
        "age": age,
        "gender_enc": gender_enc,
        "heart_rate": heart_rate,
        "blood_pressure_systolic": blood_pressure_systolic,
        "blood_pressure_diastolic": blood_pressure_diastolic,
        "temperature": temperature,
        "spo2": spo2,
        **symptom_enc,
    }
    # Ensure column order
    arr = np.array([[row[k] for k in ALL_FEATURES]], dtype=np.float64)
    return scaler.transform(arr)


def get_feature_names() -> list[str]:
    return list(ALL_FEATURES)
