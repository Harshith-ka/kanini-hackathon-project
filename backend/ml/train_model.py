"""Train Random Forest risk classifier with synthetic data (handles imbalanced classes)."""

import json
import os
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight

from ml.preprocessing import ALL_FEATURES, GENDER_MAP

# Risk levels for classification
RISK_LABELS = ["low", "medium", "high"]
MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_DIR.mkdir(exist_ok=True)


def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """Generate synthetic triage data with realistic ranges and controlled risk imbalance."""
    np.random.seed(42)
    n = n_samples

    age = np.clip(np.random.normal(45, 20, n).astype(int), 1, 100)
    gender = np.random.choice(list(GENDER_MAP.keys()), n)
    heart_rate = np.clip(np.random.normal(80, 20, n).astype(int), 40, 180)
    bp_sys = np.clip(np.random.normal(120, 25, n).astype(int), 80, 200)
    bp_dia = np.clip(bp_sys * np.random.uniform(0.55, 0.75, n), 50, 120).astype(int)
    temperature = np.clip(np.random.normal(36.8, 0.8, n), 35.0, 40.0)
    spo2 = np.clip(np.random.normal(97, 4, n).astype(int), 75, 100)

    # Introduce high-risk patterns: low SpO2, very high HR, chest pain, etc.
    high_risk_mask = (
        (spo2 < 92)
        | (heart_rate > 120)
        | (np.random.random(n) < 0.15)
    )
    medium_risk_mask = (
        (spo2 < 95) & (spo2 >= 92)
        | (heart_rate > 100) & (heart_rate <= 120)
        | (temperature > 38)
        | (np.random.random(n) < 0.25)
    ) & ~high_risk_mask
    low_risk_mask = ~high_risk_mask & ~medium_risk_mask

    risk = np.where(high_risk_mask, "high", np.where(medium_risk_mask, "medium", "low"))
    # Force some imbalance: more low, fewer high
    indices = np.arange(n)
    high_idx = indices[risk == "high"]
    med_idx = indices[risk == "medium"]
    low_idx = indices[risk == "low"]
    # Resample to get ~60% low, 30% medium, 10% high
    n_low, n_med, n_high = int(0.6 * n), int(0.3 * n), int(0.1 * n)
    if len(low_idx) < n_low:
        low_idx = np.random.choice(indices, n_low)
    else:
        low_idx = np.random.choice(low_idx, n_low, replace=False)
    if len(med_idx) < n_med:
        med_idx = np.random.choice(indices, n_med)
    else:
        med_idx = np.random.choice(med_idx, n_med, replace=False)
    if len(high_idx) < n_high:
        high_idx = np.random.choice(indices, n_high)
    else:
        high_idx = np.random.choice(high_idx, n_high, replace=False)
    idx = np.concatenate([low_idx, med_idx, high_idx])
    np.random.shuffle(idx)

    df = pd.DataFrame({
        "age": age[idx],
        "gender": [gender[i] for i in idx],
        "heart_rate": heart_rate[idx],
        "blood_pressure_systolic": bp_sys[idx],
        "blood_pressure_diastolic": bp_dia[idx],
        "temperature": temperature[idx],
        "spo2": spo2[idx],
        "risk": [risk[i] for i in idx],
    })

    # Add symptom columns (risk-correlated)
    symptom_cols = [c.replace("symptom_", "") for c in ALL_FEATURES if c.startswith("symptom_")]
    for s in symptom_cols:
        df[f"symptom_{s}"] = 0
    for i in range(len(df)):
        r = df.iloc[i]["risk"]
        n_symp = np.random.randint(1, 5) if r == "high" else (np.random.randint(1, 3) if r == "medium" else np.random.randint(0, 2))
        chosen = np.random.choice(symptom_cols, min(n_symp, len(symptom_cols)), replace=False)
        for s in chosen:
            df.loc[df.index[i], f"symptom_{s}"] = 1

    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Build feature matrix from raw dataframe."""
    df = df.copy()
    df["gender_enc"] = df["gender"].map(GENDER_MAP)
    X = df[ALL_FEATURES].astype(float)
    return X


def train(n_samples: int = 2500):
    """Train and persist model + scaler. Returns (model, scaler, summary)."""
    print("Generating synthetic data...")
    df = generate_synthetic_data(n_samples)
    X = build_features(df)
    y = df["risk"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Handle imbalanced dataset with class_weight
    classes = np.unique(y_train)
    class_weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = dict(zip(classes, class_weights))

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=5,
        class_weight=class_weight_dict,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    score = model.score(X_test_scaled, y_test)
    print(f"Test accuracy: {score:.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    import joblib
    joblib.dump(model, MODEL_DIR / "risk_model.joblib")
    joblib.dump(scaler, MODEL_DIR / "scaler.joblib")

    class_dist = {c: int((y == c).sum()) for c in model.classes_}
    meta = {
        "feature_names": ALL_FEATURES,
        "classes": list(model.classes_),
        "test_accuracy": float(score),
        "version": datetime.utcnow().strftime("%Y%m%d%H%M"),
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "synthetic_class_distribution": class_dist,
        "synthetic_total": int(len(df)),
    }
    with open(MODEL_DIR / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Model and scaler saved to {MODEL_DIR}")
    summary = {
        "test_accuracy": float(score),
        "class_distribution": class_dist,
        "total_samples": len(df),
        "version": meta["version"],
        "trained_at": meta["trained_at"],
    }
    return model, scaler, summary


if __name__ == "__main__":
    train()
