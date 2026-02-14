"""Pydantic schemas for patient input, validation, and API responses."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Symptom options for multi-select
SYMPTOM_OPTIONS = [
    "chest_pain",
    "shortness_of_breath",
    "headache",
    "fever",
    "dizziness",
    "nausea",
    "abdominal_pain",
    "bleeding",
    "unconscious",
    "seizure",
    "trauma",
    "burn",
    "allergic_reaction",
    "stroke_symptoms",
    "other",
]


class PatientCreate(BaseModel):
    age: int = Field(..., ge=0, le=150)
    gender: Gender
    symptoms: list[str] = Field(..., min_length=1)
    heart_rate: int = Field(..., ge=30, le=250)
    blood_pressure_systolic: int = Field(..., ge=70, le=250)
    blood_pressure_diastolic: int = Field(..., ge=40, le=150)
    temperature: float = Field(..., ge=35.0, le=43.0)
    spo2: int = Field(..., ge=70, le=100)
    pre_existing_conditions: list[str] = Field(default_factory=list)

    @field_validator("blood_pressure_diastolic")
    @classmethod
    def diastolic_less_than_systolic(cls, v, info):
        data = info.data
        if "blood_pressure_systolic" in data and v >= data["blood_pressure_systolic"]:
            raise ValueError("Diastolic must be less than systolic")
        return v

    @field_validator("symptoms")
    @classmethod
    def symptoms_valid(cls, v):
        for s in v:
            if s not in SYMPTOM_OPTIONS:
                raise ValueError(f"Invalid symptom: {s}")
        return v


class AbnormalityAlert(BaseModel):
    field: str
    message: str
    severity: str  # "warning" | "critical"


class ProbabilityBreakdown(BaseModel):
    low: float
    medium: float
    high: float


class Explainability(BaseModel):
    top_contributing_features: list[dict]  # [{"name": str, "value": float, "impact": str}]
    abnormal_vitals: list[dict]  # [{"name": str, "value": float, "normal_range": str}]
    department_reasoning: str
    shap_contributions: list[dict] | None = None  # [{"name": str, "contribution": float}] positive=increases risk
    feature_importance: list[dict] | None = None  # [{"name": str, "importance": float}] global


class DepartmentRecommendation(BaseModel):
    risk_level: RiskLevel
    confidence_score: float  # 0-100
    probability_breakdown: ProbabilityBreakdown
    priority_score: int  # 0-100
    recommended_department: str
    reasoning_summary: str
    explainability: Explainability


class PatientResponse(BaseModel):
    patient_id: str
    age: int
    gender: str
    symptoms: list[str]
    heart_rate: int
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    temperature: float
    spo2: int
    pre_existing_conditions: list[str]
    abnormality_alerts: list[AbnormalityAlert]
    risk_level: str
    confidence_score: float
    probability_breakdown: ProbabilityBreakdown
    priority_score: int
    recommended_department: str
    reasoning_summary: str
    explainability: Explainability
    created_at: str
    routed_department: str | None = None  # After load balancing (may differ from recommended)
    routing_message: str | None = None   # e.g. "Emergency overloaded; routed to Cardiology"
    severity_timeline: str | None = None # e.g. "Risk may escalate in 2 hours"
    estimated_wait_minutes: int | None = None
