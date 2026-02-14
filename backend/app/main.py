"""FastAPI app: patient input, risk classification, department recommendation, dashboard."""

import csv
import io
from datetime import datetime
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.chat import chat_turn
from app.department import recommend_department, risk_to_priority_score
from app.ehr import process_ehr_upload
from app.fairness import compute_fairness_metrics
from app.load_balancing import get_department_status, route_with_load_balancing
from app.severity_timeline import predict_severity_timeline
from app.simulation import generate_random_patient
from app.schemas import (
    Explainability,
    Gender,
    PatientCreate,
    PatientResponse,
    ProbabilityBreakdown,
    SYMPTOM_OPTIONS,
)
from app.validation import get_abnormality_alerts
from ml.inference import get_explainability, predict_risk

app = FastAPI(title="Triage API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for "today's" patients (reset per demo/session)
patients_store: list[dict] = []

BASE_WAIT_MINUTES = 15


def _generate_patient_id() -> str:
    return f"PT-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


def _update_estimated_waits(store: list[dict]) -> None:
    """Set estimated_wait_minutes for each patient by queue position and priority."""
    ordered = sorted(store, key=lambda p: (-p.get("priority_score", 0), p.get("created_at", "")))
    for i, p in enumerate(ordered):
        priority = p.get("priority_score", 50)
        priority_factor = max(1, priority / 50)
        p["estimated_wait_minutes"] = max(0, int(BASE_WAIT_MINUTES * (i + 1) / priority_factor))


@app.post("/api/patients", response_model=PatientResponse)
def add_patient(data: PatientCreate):
    """Add patient: validate, predict risk, recommend department, build explainability."""
    alerts = get_abnormality_alerts(
        heart_rate=data.heart_rate,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        temperature=data.temperature,
        spo2=data.spo2,
        respiratory_rate=data.respiratory_rate,
    )
    try:
        pred = predict_risk(
            age=data.age,
            gender=data.gender.value,
            heart_rate=data.heart_rate,
            blood_pressure_systolic=data.blood_pressure_systolic,
            blood_pressure_diastolic=data.blood_pressure_diastolic,
            temperature=data.temperature,
            spo2=data.spo2,
            chronic_disease_count=data.chronic_disease_count,
            respiratory_rate=data.respiratory_rate,
            pain_score=data.pain_score,
            symptom_duration=data.symptom_duration,
            symptoms=data.symptoms,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Run: python -m ml.train_model from backend directory.",
        )
    risk_level = pred["risk_level"]
    prob_breakdown = pred["probability_breakdown"]
    confidence = pred["confidence_score"]
    preferred_dept, reasoning = recommend_department(risk_level, data.symptoms)
    routed_dept, routing_message = route_with_load_balancing(preferred_dept, risk_level, patients_store)
    dept = routed_dept
    if routing_message:
        reasoning = reasoning + " " + routing_message
    priority = risk_to_priority_score(risk_level, confidence)
    explain = get_explainability(
        age=data.age,
        gender=data.gender.value,
        heart_rate=data.heart_rate,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        temperature=data.temperature,
        spo2=data.spo2,
        chronic_disease_count=data.chronic_disease_count,
        respiratory_rate=data.respiratory_rate,
        pain_score=data.pain_score,
        symptom_duration=data.symptom_duration,
        symptoms=data.symptoms,
        risk_level=risk_level,
        recommended_department=dept,
    )
    severity_timeline = predict_severity_timeline(
        risk_level=risk_level,
        spo2=data.spo2,
        heart_rate=data.heart_rate,
        temperature=data.temperature,
        blood_pressure_systolic=data.blood_pressure_systolic,
    )
    prob_model = ProbabilityBreakdown(
        low=prob_breakdown.get("low", 0),
        medium=prob_breakdown.get("medium", 0),
        high=prob_breakdown.get("high", 0),
    )
    explainability = Explainability(
        top_contributing_features=explain["top_contributing_features"],
        abnormal_vitals=explain["abnormal_vitals"],
        department_reasoning=explain["department_reasoning"],
        shap_contributions=explain.get("shap_contributions"),
        feature_importance=explain.get("feature_importance"),
    )
    patient_id = _generate_patient_id()
    created_at = datetime.utcnow().isoformat() + "Z"

    record = {
        "patient_id": patient_id,
        "age": data.age,
        "gender": data.gender.value,
        "symptoms": data.symptoms,
        "heart_rate": data.heart_rate,
        "blood_pressure_systolic": data.blood_pressure_systolic,
        "blood_pressure_diastolic": data.blood_pressure_diastolic,
        "temperature": data.temperature,
        "spo2": data.spo2,
        "chronic_disease_count": data.chronic_disease_count,
        "respiratory_rate": data.respiratory_rate,
        "pain_score": data.pain_score,
        "symptom_duration": data.symptom_duration,
        "pre_existing_conditions": data.pre_existing_conditions,
        "abnormality_alerts": [a.model_dump() for a in alerts],
        "risk_level": risk_level,
        "confidence_score": confidence,
        "probability_breakdown": prob_model.model_dump(),
        "priority_score": priority,
        "recommended_department": dept,
        "routed_department": preferred_dept if (routing_message and preferred_dept != dept) else None,
        "routing_message": routing_message or None,
        "severity_timeline": severity_timeline,
        "estimated_wait_minutes": None,
        "reasoning_summary": reasoning,
        "explainability": explainability.model_dump(),
        "created_at": created_at,
    }
    patients_store.append(record)
    _update_estimated_waits(patients_store)
    return PatientResponse(**record)


@app.get("/api/patients")
def list_patients(sort: str | None = "priority"):
    """List all patients (today's triage). sort=priority (default) | created. Includes estimated_wait_minutes."""
    _update_estimated_waits(patients_store)
    if sort == "priority":
        ordered = sorted(patients_store, key=lambda p: (-p.get("priority_score", 0), p.get("created_at", "")))
    else:
        ordered = list(patients_store)
    return {"patients": ordered, "total": len(patients_store)}


@app.get("/api/departments/status")
def departments_status():
    """Department load: max capacity, current patients, load %, overloaded flag."""
    return {"departments": get_department_status(patients_store)}


@app.get("/api/dashboard")
def dashboard():
    """Overview: total today, high/medium/low counts, risk and department distribution."""
    high = sum(1 for p in patients_store if p.get("risk_level") == "high")
    medium = sum(1 for p in patients_store if p.get("risk_level") == "medium")
    low = sum(1 for p in patients_store if p.get("risk_level") == "low")
    dept_counts: dict[str, int] = {}
    for p in patients_store:
        d = p.get("recommended_department", "General Medicine")
        dept_counts[d] = dept_counts.get(d, 0) + 1
    return {
        "total_patients_today": len(patients_store),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "risk_distribution": {"high": high, "medium": medium, "low": low},
        "department_distribution": dept_counts,
    }


@app.get("/api/symptoms")
def list_symptoms():
    """Return symptom options for multi-select."""
    return {"symptoms": SYMPTOM_OPTIONS}


class ChatRequest(BaseModel):
    message: str
    chat_state: dict = {}
    last_patient_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    chat_state: dict
    collected_symptoms: list[str]


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Triage support bot: guided symptoms, risk explanation, medical terms."""
    last_patient = None
    if req.last_patient_id:
        for p in patients_store:
            if p.get("patient_id") == req.last_patient_id:
                last_patient = p
                break
    reply, state = chat_turn(req.message, req.chat_state, last_patient)
    return ChatResponse(
        reply=reply,
        chat_state=state,
        collected_symptoms=state.get("collected_symptoms", []),
    )


@app.post("/api/ehr/upload")
def ehr_upload(file: UploadFile = File(...)):
    """Upload PDF or TXT; extract text and symptoms; return highlights for auto-fill."""
    content = file.file.read()
    result = process_ehr_upload(content, file.filename or "upload")
    return result


class SimulationAddRequest(BaseModel):
    count: int = 1
    emergency_spike: bool = False


@app.post("/api/simulation/add")
def simulation_add(req: SimulationAddRequest | None = None):
    """Add simulated patient(s). count=1 by default; emergency_spike=True adds high-risk biased patients."""
    if req is None:
        req = SimulationAddRequest()
    added: list[PatientResponse] = []
    for _ in range(max(1, min(req.count, 20))):
        payload = generate_random_patient(force_high_risk=req.emergency_spike)
        try:
            payload["gender"] = Gender(payload["gender"])
        except ValueError:
            payload["gender"] = Gender.OTHER
        patient_data = PatientCreate(**payload)
        res = add_patient(patient_data)
        added.append(res)
    return {"added": len(added), "patients": [r.model_dump() for r in added]}


@app.post("/api/simulation/spike")
def simulation_spike():
    """Add 5 high-risk simulated patients (emergency spike demo)."""
    return simulation_add(SimulationAddRequest(count=5, emergency_spike=True))


@app.get("/api/fairness")
def fairness():
    """Bias & fairness: gender/age vs risk, heatmap data, imbalance alert."""
    return compute_fairness_metrics(patients_store)


# ----- Admin & Model -----

@app.get("/api/admin/patients")
def admin_list_patients(
    risk: str | None = Query(None, description="Filter by risk: low, medium, high"),
    limit: int = Query(500, le=2000),
):
    """Patient logs with optional risk filter."""
    out = list(patients_store)
    if risk:
        out = [p for p in out if p.get("risk_level") == risk]
    out = out[:limit]
    _update_estimated_waits(patients_store)
    return {"patients": out, "total": len(out)}


_EXPORT_COLUMNS = [
    "patient_id", "age", "gender", "risk_level", "confidence_score", "priority_score",
    "recommended_department", "routed_department", "routing_message", "severity_timeline",
    "estimated_wait_minutes", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic",
    "temperature", "spo2", "chronic_disease_count", "respiratory_rate", 
    "pain_score", "symptom_duration", "symptoms", "created_at",
]


@app.get("/api/admin/export")
def admin_export_patients(risk: str | None = Query(None)):
    """Download prediction history as CSV."""
    out = list(patients_store)
    if risk:
        out = [p for p in out if p.get("risk_level") == risk]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_EXPORT_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for p in out:
        row = {k: p.get(k) for k in _EXPORT_COLUMNS if isinstance(p.get(k), (str, int, float, type(None)))}
        row["symptoms"] = ",".join(p.get("symptoms", []))
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=triage_export.csv"},
    )


@app.post("/api/admin/synthetic/regenerate")
def admin_regenerate_synthetic(n_samples: int = Query(2500, ge=500, le=10000)):
    """Regenerate synthetic dataset and retrain model."""
    try:
        from ml.train_model import train
        _, _, summary = train(n_samples=n_samples)
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/synthetic/summary")
def admin_synthetic_summary():
    """Last synthetic dataset / model summary from meta.json."""
    import json
    from pathlib import Path
    meta_path = Path(__file__).resolve().parent.parent / "ml" / "artifacts" / "meta.json"
    if not meta_path.exists():
        return {"error": "Model not trained yet", "summary": None}
    with open(meta_path) as f:
        meta = json.load(f)
    return {
        "summary": {
            "test_accuracy": meta.get("test_accuracy"),
            "class_distribution": meta.get("synthetic_class_distribution"),
            "total_samples": meta.get("synthetic_total"),
            "version": meta.get("version"),
            "trained_at": meta.get("trained_at"),
        },
    }


@app.get("/api/admin/model")
def admin_model_info():
    """Model version, accuracy, metadata."""
    import json
    from pathlib import Path
    meta_path = Path(__file__).resolve().parent.parent / "ml" / "artifacts" / "meta.json"
    if not meta_path.exists():
        return {"error": "Model not trained yet", "version": None, "test_accuracy": None}
    with open(meta_path) as f:
        meta = json.load(f)
    return {
        "version": meta.get("version"),
        "test_accuracy": meta.get("test_accuracy"),
        "trained_at": meta.get("trained_at"),
        "classes": meta.get("classes"),
    }


@app.post("/api/admin/model/retrain")
def admin_model_retrain(n_samples: int = Query(2500, ge=500, le=10000)):
    """Retrain model (regenerate synthetic data + train)."""
    try:
        from ml.train_model import train
        _, _, summary = train(n_samples=n_samples)
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
