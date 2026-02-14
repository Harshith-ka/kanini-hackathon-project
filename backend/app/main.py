"""FastAPI app: patient input, risk classification, department recommendation, dashboard."""

import csv
import io
from datetime import datetime
import os
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()

from typing import Optional, List, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.chat import chat_turn
from app.database import init_db, PatientRecord, User
from app.auth import get_db, get_password_hash, verify_password, create_access_token, get_current_user, get_current_admin
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
    RegistrationResponse,
    PatientRegister,
    PatientUpdate,
)
from app.validation import get_abnormality_alerts
from ml.inference import get_explainability, predict_risk
import secrets
import string

def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Triage API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Endpoints
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "patient"

@app.post("/api/auth/register")
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if username or email already exists
    result = await db.execute(select(User).filter((User.username == data.username) | (User.email == data.email)))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    
    new_user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=data.role
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User created successfully"}

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    print(f"Login attempt for: {form_data.username}")
    result = await db.execute(select(User).filter((User.username == form_data.username) | (User.email == form_data.username)))
    user = result.scalars().first()
    if not user:
        print(f"User not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(form_data.password, user.hashed_password):
        print(f"Password mismatch for user: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role, 
        "username": user.username,
        "full_name": user.full_name
    }

# BASE WAIT MINUTES

BASE_WAIT_MINUTES = 15


def _generate_patient_id() -> str:
    return f"PT-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


def _update_estimated_waits(store: list[dict]) -> None:
    """Set estimated_wait_minutes for each patient by queue position, priority, and department load."""
    if not store:
        return
        
    # Standardize priority scores (0-100)
    # Group by department to calculate local load
    dept_load = {}
    for p in store:
        dept = p.get("recommended_department", "General Medicine")
        dept_load[dept] = dept_load.get(dept, 0) + 1

    # Pressure from high risk patients (affects everyone)
    high_risk_count = sum(1 for p in store if p.get("risk_level") == "high")
    resource_pressure = 1.0 + (high_risk_count * 0.15) # +15% per high risk patient

    ordered = sorted(store, key=lambda p: (-p.get("priority_score", 0), p.get("created_at", "")))
    
    for i, p in enumerate(ordered):
        dept = p.get("recommended_department", "General Medicine")
        load_factor = 1.0 + (dept_load.get(dept, 1) * 0.1) # +10% per patient in same dept
        
        priority = p.get("priority_score", 50)
        # Higher priority = lower wait time
        priority_factor = max(0.5, priority / 50.0)
        
        # Base wait scaled by position, load, and global pressure
        minutes = int((BASE_WAIT_MINUTES * (i + 1) * load_factor * resource_pressure) / priority_factor)
        p["estimated_wait_minutes"] = max(5, minutes) # Min 5 mins



@app.post("/api/patients", response_model=PatientResponse)
async def add_patient(
    data: PatientCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
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
    
    # Load balancing (requires list of patients - fetch from DB for "today")
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(select(PatientRecord).filter(PatientRecord.created_at >= today_start))
    today_patients = [p.__dict__ for p in result.scalars().all()]
    
    routed_dept, routing_message = route_with_load_balancing(preferred_dept, risk_level, today_patients)
    dept = routed_dept
    if routing_message:
        reasoning = reasoning + " " + routing_message
        
    priority = risk_to_priority_score(risk_level, confidence)
    
    # AI Explanation Integration
    ai_res = None
    if os.getenv("OPENAI_API_KEY"):
        try:
            from app.llm import explain_risk_assessment
            ai_context = {
                "risk_level": risk_level,
                "heart_rate": data.heart_rate,
                "blood_pressure_systolic": data.blood_pressure_systolic,
                "blood_pressure_diastolic": data.blood_pressure_diastolic,
                "spo2": data.spo2,
                "symptoms": data.symptoms,
                "recommended_department": dept
            }
            ai_res = await explain_risk_assessment(ai_context)
            # Update reasoning with AI output
            reasoning = ai_res.get("department_reasoning", reasoning)
        except Exception as e:
            print(f"AI Generation Failed: {e}")

    expert_system_explain = get_explainability(
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

    
    # Merge AI results into explainability
    final_explain_dict = expert_system_explain.model_dump()
    if ai_res:
        final_explain_dict["department_reasoning"] = ai_res.get("department_reasoning", final_explain_dict["department_reasoning"])
        final_explain_dict["disease_insights"] = ai_res.get("disease_insights", [])
        if ai_res.get("top_contributing_features"):
             final_explain_dict["top_contributing_features"] = ai_res.get("top_contributing_features")
        if ai_res.get("safety_disclaimer"):
             final_explain_dict["safety_disclaimer"] = ai_res.get("safety_disclaimer")

    severity_timeline = predict_severity_timeline(
        risk_level=risk_level,
        spo2=data.spo2,
        heart_rate=data.heart_rate,
        temperature=data.temperature,
        blood_pressure_systolic=data.blood_pressure_systolic,
    )
    
    patient_id = _generate_patient_id()
    
    # Determine user ownership
    target_user_id = None
    
    if data.email:
        # Check if user exists
        existing_user = (await db.execute(select(User).filter(User.email == data.email))).scalars().first()
        if existing_user:
            target_user_id = existing_user.id
        else:
            # Create new user for patient
            new_user = User(
                username=data.email, # Use email as username
                email=data.email,
                full_name=data.full_name,
                hashed_password=get_password_hash("VitalPass123!"), # Temporary default password
                role="patient"
            )
            db.add(new_user)
            await db.flush() # Get ID without committing transaction yet
            target_user_id = new_user.id
    elif current_user:
        # If no email provided, link to current user ONLY if they are a patient
        if current_user.role == 'patient':
            target_user_id = current_user.id
        # If admin, we leave it unlinked (None) unless email was provided above

    new_record = PatientRecord(
        patient_id=patient_id,
        age=data.age,
        gender=data.gender.value,
        heart_rate=data.heart_rate,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        temperature=data.temperature,
        spo2=data.spo2,
        respiratory_rate=data.respiratory_rate,
        pain_score=data.pain_score,
        chronic_disease_count=data.chronic_disease_count,
        symptom_duration=data.symptom_duration,
        risk_level=risk_level,
        priority_score=priority,
        recommended_department=dept,
        reasoning_summary=reasoning,
        user_id=target_user_id,
        explainability=final_explain_dict
    )
    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)
    
    # Prepare response
    prob_model = ProbabilityBreakdown(
        low=prob_breakdown.get("low", 0),
        medium=prob_breakdown.get("medium", 0),
        high=prob_breakdown.get("high", 0),
    )
    # The explainability object is already in final_explain_dict
    # We can reconstruct it or just use the dict if schemas allow
    patient_id = _generate_patient_id()
    created_at = new_record.created_at.isoformat() + "Z"
 
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
        "explainability": final_explain_dict,
        "created_at": created_at,
    }
    return PatientResponse(**record)


@app.get("/api/patients")
async def list_patients(sort: str | None = "priority", db: AsyncSession = Depends(get_db)):
    """List all patients from DB."""
    result = await db.execute(select(PatientRecord))
    patients = [p.__dict__ for p in result.scalars().all()]
    _update_estimated_waits(patients)
    if sort == "priority":
        ordered = sorted(patients, key=lambda p: (-p.get("priority_score", 0), p.get("created_at", "")))
    else:
        ordered = list(patients)
    return {"patients": ordered, "total": len(patients)}


@app.get("/api/departments/status")
async def departments_status(db: AsyncSession = Depends(get_db)):
    """Department load from DB records."""
    result = await db.execute(select(PatientRecord))
    patients = [p.__dict__ for p in result.scalars().all()]
    return {"departments": get_department_status(patients)}


@app.get("/api/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Overview from DB with throughput metrics."""
    result = await db.execute(select(PatientRecord))
    patients = [p.__dict__ for p in result.scalars().all()]
    
    high = sum(1 for p in patients if p.get("risk_level") == "high")
    medium = sum(1 for p in patients if p.get("risk_level") == "medium")
    low = sum(1 for p in patients if p.get("risk_level") == "low")
    
    # Calculate throughput metrics
    wait_times = [p.get("estimated_wait_minutes") for p in patients if p.get("estimated_wait_minutes")]
    avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0
    
    # Throughput efficiency (simplified: lower wait + higher priority handled = higher efficiency)
    efficiency = 0
    if patients:
        avg_priority = sum(p.get("priority_score", 0) for p in patients) / len(patients)
        efficiency = min(100, max(0, int(avg_priority - (avg_wait * 0.5) + 50)))

    dept_counts: dict[str, int] = {}
    for p in patients:
        d = p.get("recommended_department", "General Medicine")
        dept_counts[d] = dept_counts.get(d, 0) + 1
        
    return {
        "total_patients_today": len(patients),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "risk_distribution": {"high": high, "medium": medium, "low": low},
        "department_distribution": dept_counts,
        "throughput_metrics": {
            "avg_wait_time": int(avg_wait),
            "efficiency_score": efficiency,
            "system_load": "High" if len(patients) > 15 else "Moderate" if len(patients) > 5 else "Optimal",
            "capacity_utilization": min(100, int((len(patients) / 30) * 100)) # Assumes 30 is max capacity for demo
        }
    }



@app.get("/api/symptoms")
def list_symptoms():
    """Return symptom options for multi-select."""
    return {"symptoms": SYMPTOM_OPTIONS}


@app.post("/api/admin/register-patient", response_model=RegistrationResponse)
async def register_patient(
    data: PatientRegister, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin registers a new patient, creating a user account and record stub."""
    # Determine username (explicit > email)
    final_username = data.username if data.username and data.username.strip() else data.email
    
    # Check if user already exists
    result = await db.execute(select(User).filter(User.username == final_username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail=f"User with username '{final_username}' already exists")
    
    temp_password = generate_temp_password()
    new_user = User(
        username=final_username,
        email=data.email,
        full_name=data.full_name,
        phone=data.phone,
        hashed_password=get_password_hash(temp_password),
        role="patient"
    )
    db.add(new_user)
    await db.flush() # Get user ID
    
    patient_id = _generate_patient_id()
    # Create a stub record with minimal info
    # (Actual clinical data will be added later in add_patient step)
    
    return RegistrationResponse(
        username=final_username,
        temporary_password=temp_password,
        patient_id=patient_id
    )


@app.get("/api/patient/dashboard")
async def get_patient_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch latest medical status for the logged-in patient."""
    if current_user.role != "patient":
        raise HTTPException(status_code=400, detail="Only patients can access this dashboard")
    
    result = await db.execute(
        select(PatientRecord)
        .filter(PatientRecord.user_id == current_user.id)
        .order_by(PatientRecord.created_at.desc())
    )
    record = result.scalars().first()
    if not record:
        return {"has_record": False, "message": "No triage record found."}
    
    # We need to reconstruct the full response with explainability
    # For simplicity in this demo, we'll return the record dict + some mock wait time
    # In a real app, we'd reuse the add_patient logic or store full JSON in DB
    
    # Calculate queue position
    all_active = await db.execute(
        select(PatientRecord)
        .filter(PatientRecord.is_active == True)
        .order_by(PatientRecord.priority_score.desc(), PatientRecord.created_at.asc())
    )
    active_list = all_active.scalars().all()
    queue_pos = -1
    for i, p in enumerate(active_list):
        if p.patient_id == record.patient_id:
            queue_pos = i + 1
            break
            
    wait_time = max(15, queue_pos * 10) if queue_pos > 0 else 0
    
    # Reconstruct explainability object
    # In a real app, this would be stored in a JSON column or re-calculated
    if os.getenv("OPENAI_API_KEY"):
        # Use OpenAI for dynamic explanation
        context = {
            "risk_level": record.risk_level,
            "heart_rate": record.heart_rate,
            "blood_pressure_systolic": record.blood_pressure_systolic,
            "blood_pressure_diastolic": record.blood_pressure_diastolic,
            "spo2": record.spo2,
            "symptoms": [], # Add symptoms if you can fetch them
            "recommended_department": record.recommended_department
        }
        # In a real scenario, you'd fetch symptoms from a related table or JSON column
        from app.llm import explain_risk_assessment
        explainability = await explain_risk_assessment(context)
    else:
        # Fallback static explanation
        explainability = {
            "top_contributing_features": [{"name": "Reported Symptoms", "value": 1.0, "impact": "High"}],
            "abnormal_vitals": [],
            "department_reasoning": "Based on reported symptoms.",
            "contributing_risk_factors": [],
            "disease_insights": []
        }

    # Helper to convert record to dict and add explainability
    record_dict = record.__dict__.copy()
    if "_sa_instance_state" in record_dict:
        del record_dict["_sa_instance_state"]
    
    record_dict["explainability"] = explainability
    record_dict["symptoms"] = [] # Symptoms might not be in DB model yet if not added
    record_dict["pre_existing_conditions"] = []
    record_dict["abnormality_alerts"] = []
    
    return {
        "has_record": True,
        "record": record_dict,
        "queue_position": queue_pos,
        "estimated_wait_minutes": wait_time,
        "user_profile": {
            "full_name": current_user.full_name,
            "email": current_user.email
        }
    }


@app.patch("/api/patients/{patient_id}")
async def update_patient(
    patient_id: str,
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Update patient vitals/details and potentially re-run risk analysis."""
    result = await db.execute(select(PatientRecord).filter(PatientRecord.patient_id == patient_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Logic to re-run analysis if vitals are updated
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return record

    for key, value in update_data.items():
        setattr(record, key, value)
    
    # Check if any vital signs or symptoms were updated
    vitals_keys = {
        "age", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic",
        "temperature", "spo2", "respiratory_rate", "pain_score", 
        "chronic_disease_count", "symptom_duration", "gender", "symptoms"
    }
    
    if any(k in update_data for k in vitals_keys):
        # Re-run risk prediction
        try:
            # Need to ensure all required fields are present (fallback to existing record values)
            pred = predict_risk(
                age=record.age,
                gender=record.gender,
                heart_rate=record.heart_rate,
                blood_pressure_systolic=record.blood_pressure_systolic,
                blood_pressure_diastolic=record.blood_pressure_diastolic,
                temperature=record.temperature,
                spo2=record.spo2,
                chronic_disease_count=record.chronic_disease_count,
                respiratory_rate=record.respiratory_rate,
                pain_score=record.pain_score,
                symptom_duration=record.symptom_duration,
                symptoms=record.symptoms or [] # Handle potential None
            )
            
            record.risk_level = pred["risk_level"]
            record.confidence_score = pred["confidence_score"]
            # We would also update probability_breakdown etc if stored in DB
            
            # Recalculate priority
            record.priority_score = risk_to_priority_score(record.risk_level, record.confidence_score)
            
            # Re-recommend department if not manually overridden
            if "recommended_department" not in update_data:
                dept, reasoning = recommend_department(record.risk_level, record.symptoms or [])
                record.recommended_department = dept

            # AI Re-Analysis
            if os.getenv("OPENAI_API_KEY"):
                try:
                    from app.llm import explain_risk_assessment
                    ai_context = {
                        "risk_level": record.risk_level,
                        "heart_rate": record.heart_rate,
                        "blood_pressure_systolic": record.blood_pressure_systolic,
                        "blood_pressure_diastolic": record.blood_pressure_diastolic,
                        "spo2": record.spo2,
                        "symptoms": record.symptoms or [],
                        "recommended_department": record.recommended_department
                    }
                    ai_res = await explain_risk_assessment(ai_context)
                    record.reasoning_summary = ai_res.get("department_reasoning", reasoning)
                    
                    # Update explainability in DB
                    # We need to reconstruct or fetch existing explainability
                    current_explain = record.explainability or {}
                    # If it's empty, we might want to run expert_system first, but for now let's just patch it
                    current_explain["department_reasoning"] = ai_res.get("department_reasoning")
                    current_explain["disease_insights"] = ai_res.get("disease_insights", [])
                    current_explain["top_contributing_features"] = ai_res.get("top_contributing_features", current_explain.get("top_contributing_features", []))
                    record.explainability = current_explain
                    
                except Exception as e:
                    print(f"AI Re-Analysis Failed: {e}")
                
        except Exception as e:
            print(f"Error re-calculating risk: {e}")
            # Continue with update even if ML fails
            pass

    await db.commit()
    await db.refresh(record)
    return record


@app.post("/api/patients/{patient_id}/discharge")
async def discharge_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Set patient as inactive (discharged)."""
    result = await db.execute(select(PatientRecord).filter(PatientRecord.patient_id == patient_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    record.is_active = False
    await db.commit()
    return {"message": "Patient discharged successfully"}


class ChatRequest(BaseModel):
    message: str
    chat_state: dict = {}
    last_patient_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    chat_state: dict
    collected_symptoms: list[str]


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Triage support bot with DB lookup."""
    last_patient = None
    if req.last_patient_id:
        result = await db.execute(select(PatientRecord).filter(PatientRecord.patient_id == req.last_patient_id))
        last_patient_obj = result.scalars().first()
        if last_patient_obj:
            last_patient = last_patient_obj.__dict__
    reply, state = await chat_turn(req.message, req.chat_state, last_patient)
    return ChatResponse(
        reply=reply,
        chat_state=state,
        collected_symptoms=state.get("collected_symptoms", []),
    )


@app.post("/api/ehr/upload")
async def ehr_upload(file: UploadFile = File(...)):
    """Upload PDF or TXT; extract text and symptoms; return highlights for auto-fill."""
    content = await file.read()
    result = process_ehr_upload(content, file.filename or "upload")
    return result



class SimulationAddRequest(BaseModel):
    count: int = 1
    emergency_spike: bool = False


@app.post("/api/simulation/add")
async def simulation_add(
    req: SimulationAddRequest | None = None, 
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Add simulated patient(s) to DB with Admin protection."""
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
        res = await add_patient(patient_data, db=db, current_user=current_admin)
        added.append(res)
    return {"added": len(added), "patients": [r.model_dump() for r in added]}


@app.post("/api/simulation/spike")
async def simulation_spike(db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    """Add 5 high-risk simulated patients (emergency spike demo)."""
    return await simulation_add(SimulationAddRequest(count=5, emergency_spike=True), db=db, current_admin=current_admin)


@app.get("/api/fairness")
async def fairness(db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    """Bias & fairness with Admin protection."""
    result = await db.execute(select(PatientRecord))
    patients = [p.__dict__ for p in result.scalars().all()]
    return compute_fairness_metrics(patients)


# ----- Admin & Model -----

@app.get("/api/admin/patients")
async def admin_list_patients(
    risk: str | None = Query(None, description="Filter by risk: low, medium, high"),
    limit: int = Query(500, le=2000),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Patient logs from DB with Admin protection."""
    query = select(PatientRecord)
    if risk:
        query = query.filter(PatientRecord.risk_level == risk)
    query = query.limit(limit)
    result = await db.execute(query)
    patients = [p.__dict__ for p in result.scalars().all()]
    _update_estimated_waits(patients)
    return {"patients": patients, "total": len(patients)}


_EXPORT_COLUMNS = [
    "patient_id", "age", "gender", "risk_level", "confidence_score", "priority_score",
    "recommended_department", "routed_department", "routing_message", "severity_timeline",
    "estimated_wait_minutes", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic",
    "temperature", "spo2", "chronic_disease_count", "respiratory_rate", 
    "pain_score", "symptom_duration", "symptoms", "created_at",
]


@app.get("/api/admin/export")
async def admin_export_patients(
    risk: str | None = Query(None), 
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Download prediction history as CSV from DB with Admin protection."""
    query = select(PatientRecord)
    if risk:
        query = query.filter(PatientRecord.risk_level == risk)
    result = await db.execute(query)
    out = [p.__dict__ for p in result.scalars().all()]
    
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_EXPORT_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for p in out:
        row = {k: p.get(k) for k in _EXPORT_COLUMNS if isinstance(p.get(k), (str, int, float, type(None)))}
        # Fix symptoms if it's stored as list or string
        syms = p.get("symptoms", [])
        if isinstance(syms, str):
            row["symptoms"] = syms
        else:
            row["symptoms"] = ",".join(syms)
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=triage_export.csv"},
    )


@app.post("/api/admin/synthetic/regenerate")
def admin_regenerate_synthetic(
    n_samples: int = Query(2500, ge=500, le=10000),
    current_admin: User = Depends(get_current_admin)
):
    """Regenerate synthetic dataset and retrain model with Admin protection."""
    try:
        from ml.train_model import train
        _, _, summary = train(n_samples=n_samples)
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/synthetic/summary")
def admin_synthetic_summary(current_admin: User = Depends(get_current_admin)):
    """Last synthetic dataset / model summary from meta.json with Admin protection."""
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
def admin_model_info(current_admin: User = Depends(get_current_admin)):
    """Model version, accuracy, metadata with Admin protection."""
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
def admin_model_retrain(
    n_samples: int = Query(2500, ge=500, le=10000),
    current_admin: User = Depends(get_current_admin)
):
    """Retrain model (regenerate synthetic data + train) with Admin protection."""
    try:
        from ml.train_model import train
        _, _, summary = train(n_samples=n_samples)
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/patients/{patient_id}/discharge")
async def discharge_patient(patient_id: str, db: AsyncSession = Depends(get_db)):
    """Discharge a patient (remove from active queue)."""
    result = await db.execute(select(PatientRecord).filter(PatientRecord.patient_id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    await db.delete(patient)
    await db.commit()
    return {"message": "Patient discharged successfully"}


@app.get("/health")
def health():
    return {"status": "ok"}
