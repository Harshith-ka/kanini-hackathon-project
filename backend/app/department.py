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
    for keywords, dept in SYMPTOM_TO_DEPT:
        if any(s in symptoms_set for s in keywords):
            reason = f"Risk: {risk_level}. Symptoms match {dept} (e.g. {', '.join(keywords)})."
            return dept, reason
    dept = RISK_TO_DEFAULT_DEPT.get(risk_level, "General Medicine")
    reason = f"Risk: {risk_level}. No specialty match; routed to {dept}."
    return dept, reason


def risk_to_priority_score(risk_level: str, confidence: float) -> int:
    """Map risk + confidence to 0-100 priority score (higher = more urgent)."""
    base = {"high": 85, "medium": 50, "low": 20}.get(risk_level, 30)
    return min(100, int(base + confidence * 0.15))
