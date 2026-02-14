"""Severity timeline prediction: rule-based risk escalation estimate."""

def predict_severity_timeline(
    risk_level: str,
    spo2: int,
    heart_rate: int,
    temperature: float,
    blood_pressure_systolic: int,
) -> str | None:
    """
    Rule-based: "Risk may escalate in X hours" or similar.
    Returns short message or None.
    """
    if risk_level == "high":
        if spo2 < 92:
            return "Critical: Low SpO2. Risk may escalate within 1–2 hours without intervention."
        if heart_rate > 120 or blood_pressure_systolic > 180:
            return "Unstable vitals. Risk may escalate in 1–2 hours; monitor closely."
        return "High risk. Monitor; condition may escalate in 2–4 hours if untreated."

    if risk_level == "medium":
        if spo2 >= 92 and spo2 < 95:
            return "Moderate risk. SpO2 below normal; may escalate in 4–6 hours if not improved."
        if temperature > 38.5:
            return "Fever present. Risk may escalate in 4–6 hours if fever persists."
        if heart_rate > 100:
            return "Elevated heart rate. Monitor; may escalate in 4–6 hours."
        return "Moderate risk. Reassess in 2–4 hours."

    # low
    if spo2 < 95 or temperature > 37.5:
        return "Low risk. Reassess in 4–6 hours if symptoms persist."
    return None
