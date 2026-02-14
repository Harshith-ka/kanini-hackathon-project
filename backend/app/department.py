"""Department recommendation: ML → Risk Level, Rule-Based → Department Mapping."""

DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Neurology",
    "Emergency",
    "Pulmonology",
]

# Rule-based mapping: (risk_level, symptom_keywords) -> department
# Higher priority rules first (e.g. emergency conditions)
SYMPTOM_TO_DEPT = [
    (["chest_pain", "shortness_of_breath"], "Cardiology"),
    (["stroke_symptoms", "seizure", "unconscious"], "Neurology"),
    (["bleeding", "trauma", "burn", "unconscious"], "Emergency"),
    (["shortness_of_breath", "allergic_reaction"], "Pulmonology"),
    (["chest_pain"], "Cardiology"),
    (["headache", "dizziness", "stroke_symptoms"], "Neurology"),
]

RISK_TO_DEFAULT_DEPT = {
    "high": "Emergency",
    "medium": "General Medicine",
    "low": "General Medicine",
}


def recommend_department(risk_level: str, symptoms: list[str]) -> tuple[str, str]:
    """
    Hybrid: ML gives risk_level; rules pick department.
    Returns (recommended_department, reasoning_summary).
    """
    symptoms_set = set(symptoms)
    dept = RISK_TO_DEFAULT_DEPT.get(risk_level, "General Medicine")
    
    # Enhanced Reasoning Logic
    matched_symptoms = [s for s in symptoms if s in symptoms_set]
    clinical_findings = f"Patient presents with {', '.join(matched_symptoms)}." if matched_symptoms else "Non-specific presentation."
    
    for keywords, target_dept in SYMPTOM_TO_DEPT:
        if any(s in symptoms_set for s in keywords):
            hits = [s for s in keywords if s in symptoms_set]
            reason = (
                f"Risk assessment indicates {risk_level.upper()} severity. "
                f"Clinical markers ({', '.join(hits)}) align with {target_dept} protocols. "
                f"Recommended for immediate {target_dept} evaluation."
            )
            return target_dept, reason

    reason = (
        f"Risk assessment indicates {risk_level.upper()} severity based on vitals analysis. "
        f"{clinical_findings} "
        f"No specific specialty criteria met; routing to {dept} for comprehensive workup."
    )
    return dept, reason


def risk_to_priority_score(risk_level: str, confidence: float) -> int:
    """Map risk + confidence to 0-100 priority score (higher = more urgent)."""
    base = {"high": 85, "medium": 50, "low": 20}.get(risk_level, 30)
    return min(100, int(base + confidence * 0.15))
