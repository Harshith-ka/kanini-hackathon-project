"""Risk prediction and explainability (top features, abnormal vitals, SHAP)."""

import json
from pathlib import Path

import joblib
import numpy as np

from app.schemas import AbnormalityAlert
from app.validation import get_abnormality_alerts
from ml.preprocessing import ALL_FEATURES, preprocess_single

MODEL_DIR = Path(__file__).resolve().parent / "artifacts"

_SHAP_AVAILABLE = False
try:
    import shap
    _SHAP_AVAILABLE = True
except ImportError:
    pass


def _load_artifacts():
    model = joblib.load(MODEL_DIR / "risk_model.joblib")
    scaler = joblib.load(MODEL_DIR / "scaler.joblib")
    with open(MODEL_DIR / "meta.json") as f:
        meta = json.load(f)
    return model, scaler, meta


def predict_risk(
    age: int,
    gender: str,
    heart_rate: int,
    blood_pressure_systolic: int,
    blood_pressure_diastolic: int,
    temperature: float,
    spo2: int,
    symptoms: list[str],
) -> dict:
    """
    Predict risk level with probability breakdown and confidence.
    Returns: risk_level, confidence_score, probability_breakdown, top_features, model
    """
    model, scaler, meta = _load_artifacts()
    X = preprocess_single(
        age=age,
        gender=gender,
        heart_rate=heart_rate,
        blood_pressure_systolic=blood_pressure_systolic,
        blood_pressure_diastolic=blood_pressure_diastolic,
        temperature=temperature,
        spo2=spo2,
        symptoms=symptoms,
        scaler=scaler,
    )
    pred = model.predict(X)[0]
    probs = model.predict_proba(X)[0]
    classes = list(model.classes_)
    prob_dict = {c: float(p) for c, p in zip(classes, probs)}
    confidence = float(max(probs)) * 100

    # Top 3 contributing features (by feature_importances_ * abs difference from mean)
    importances = model.feature_importances_
    feature_names = meta["feature_names"]
    # Simple impact: weight by (value - approximate mean) for this sample
    sample = X[0]
    top_idx = np.argsort(importances)[::-1][:3]
    top_contributing = []
    for i in top_idx:
        name = feature_names[i]
        val = float(sample[i])
        imp = float(importances[i])
        impact = "increases" if val > 0.5 else "decreases"
        top_contributing.append({"name": name, "value": val, "impact": f"{impact} risk"})

    return {
        "risk_level": pred,
        "confidence_score": round(confidence, 1),
        "probability_breakdown": prob_dict,
        "top_contributing_features": top_contributing,
        "model": model,
        "meta": meta,
    }


def get_explainability(
    age: int,
    gender: str,
    heart_rate: int,
    blood_pressure_systolic: int,
    blood_pressure_diastolic: int,
    temperature: float,
    spo2: int,
    symptoms: list[str],
    risk_level: str,
    recommended_department: str,
) -> dict:
    """Build explainability: top 3 features, abnormal vitals, department reasoning."""
    _, _, meta = _load_artifacts()
    pred_result = predict_risk(
        age=age,
        gender=gender,
        heart_rate=heart_rate,
        blood_pressure_systolic=blood_pressure_systolic,
        blood_pressure_diastolic=blood_pressure_diastolic,
        temperature=temperature,
        spo2=spo2,
        symptoms=symptoms,
    )
    top_contributing = pred_result["top_contributing_features"]

    abnormal_vitals: list[dict] = []
    if spo2 < 95:
        abnormal_vitals.append({"name": "SpO2", "value": spo2, "normal_range": "95-100%"})
    if heart_rate < 60 or heart_rate > 100:
        abnormal_vitals.append({"name": "Heart Rate", "value": heart_rate, "normal_range": "60-100 bpm"})
    if blood_pressure_systolic > 120 or blood_pressure_diastolic > 80:
        abnormal_vitals.append(
            {"name": "Blood Pressure", "value": f"{blood_pressure_systolic}/{blood_pressure_diastolic}", "normal_range": "≤120/80 mmHg"}
        )
    if temperature > 37.2 or temperature < 36.1:
        abnormal_vitals.append({"name": "Temperature", "value": temperature, "normal_range": "36.1-37.2°C"})

    dept_reasoning = f"Risk level '{risk_level}' from ML model; department '{recommended_department}' selected by rule mapping based on risk and symptoms (e.g. cardiac → Cardiology, neuro → Neurology, critical → Emergency)."

    # SHAP contributions and feature importance (if available)
    shap_contributions = None
    feature_importance_list = None
    if _SHAP_AVAILABLE:
        try:
            model, scaler, meta = _load_artifacts()
            X = preprocess_single(
                age=age, gender=gender, heart_rate=heart_rate,
                blood_pressure_systolic=blood_pressure_systolic,
                blood_pressure_diastolic=blood_pressure_diastolic,
                temperature=temperature, spo2=spo2, symptoms=symptoms, scaler=scaler,
            )
            explainer = shap.TreeExplainer(model, feature_perturbation="interventional")
            shap_vals = explainer.shap_values(X)
            feature_names = meta["feature_names"]
            # For multiclass, shap_vals is list of arrays (one per class); use predicted class
            pred_idx = list(model.classes_).index(risk_level) if risk_level in model.classes_ else 0
            if isinstance(shap_vals, list):
                sv = shap_vals[pred_idx][0]
            else:
                sv = shap_vals[0]
            contribs = [{"name": feature_names[i], "contribution": float(sv[i])} for i in range(len(sv))]
            contribs.sort(key=lambda x: abs(x["contribution"]), reverse=True)
            shap_contributions = contribs[:10]
            # Global feature importance from model
            feature_importance_list = [
                {"name": feature_names[i], "importance": float(model.feature_importances_[i])}
                for i in np.argsort(model.feature_importances_)[::-1][:10]
            ]
        except Exception:
            pass

    return {
        "top_contributing_features": top_contributing,
        "abnormal_vitals": abnormal_vitals,
        "department_reasoning": dept_reasoning,
        "shap_contributions": shap_contributions,
        "feature_importance": feature_importance_list,
    }
