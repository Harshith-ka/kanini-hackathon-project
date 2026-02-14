"""Vitals range validation and abnormality alerts."""

from app.schemas import AbnormalityAlert


# Normal ranges (for alerts only; API already validates min/max)
VITAL_RANGES = {
    "heart_rate": (60, 100),
    "blood_pressure_systolic": (90, 120),
    "blood_pressure_diastolic": (60, 80),
    "temperature": (36.1, 37.2),
    "spo2": (95, 100),
}

CRITICAL_THRESHOLDS = {
    "spo2": 90,  # < 90 critical
    "heart_rate_high": 120,
    "heart_rate_low": 50,
    "systolic_high": 180,
    "systolic_low": 90,
    "diastolic_high": 120,
    "diastolic_low": 60,
    "temperature_high": 39.0,
    "temperature_low": 35.0,
}


def get_abnormality_alerts(
    heart_rate: int,
    blood_pressure_systolic: int,
    blood_pressure_diastolic: int,
    temperature: float,
    spo2: int,
) -> list[AbnormalityAlert]:
    """Generate abnormality alerts from vitals."""
    alerts: list[AbnormalityAlert] = []

    if spo2 < CRITICAL_THRESHOLDS["spo2"]:
        alerts.append(
            AbnormalityAlert(
                field="spo2",
                message=f"SpO2 critically low ({spo2}%). Normal ≥95%. Seek immediate care.",
                severity="critical",
            )
        )
    elif spo2 < 95:
        alerts.append(
            AbnormalityAlert(
                field="spo2",
                message=f"SpO2 below normal ({spo2}%). Normal range 95–100%.",
                severity="warning",
            )
        )

    low_hr, high_hr = VITAL_RANGES["heart_rate"]
    if heart_rate < CRITICAL_THRESHOLDS["heart_rate_low"]:
        alerts.append(
            AbnormalityAlert(
                field="heart_rate",
                message=f"Heart rate critically low ({heart_rate} bpm).",
                severity="critical",
            )
        )
    elif heart_rate > CRITICAL_THRESHOLDS["heart_rate_high"]:
        alerts.append(
            AbnormalityAlert(
                field="heart_rate",
                message=f"Heart rate critically high ({heart_rate} bpm).",
                severity="critical",
            )
        )
    elif heart_rate < low_hr or heart_rate > high_hr:
        alerts.append(
            AbnormalityAlert(
                field="heart_rate",
                message=f"Heart rate outside normal range ({heart_rate} bpm). Normal 60–100.",
                severity="warning",
            )
        )

    if blood_pressure_systolic >= CRITICAL_THRESHOLDS["systolic_high"] or blood_pressure_diastolic >= CRITICAL_THRESHOLDS["diastolic_high"]:
        alerts.append(
            AbnormalityAlert(
                field="blood_pressure",
                message=f"Blood pressure critically high ({blood_pressure_systolic}/{blood_pressure_diastolic}).",
                severity="critical",
            )
        )
    elif blood_pressure_systolic < CRITICAL_THRESHOLDS["systolic_low"] or blood_pressure_diastolic < CRITICAL_THRESHOLDS["diastolic_low"]:
        alerts.append(
            AbnormalityAlert(
                field="blood_pressure",
                message=f"Blood pressure low ({blood_pressure_systolic}/{blood_pressure_diastolic}).",
                severity="warning",
            )
        )

    if temperature >= CRITICAL_THRESHOLDS["temperature_high"]:
        alerts.append(
            AbnormalityAlert(
                field="temperature",
                message=f"High fever ({temperature}°C).",
                severity="critical",
            )
        )
    elif temperature < CRITICAL_THRESHOLDS["temperature_low"]:
        alerts.append(
            AbnormalityAlert(
                field="temperature",
                message=f"Low body temperature ({temperature}°C).",
                severity="warning",
            )
        )
    elif temperature > VITAL_RANGES["temperature"][1]:
        alerts.append(
            AbnormalityAlert(
                field="temperature",
                message=f"Elevated temperature ({temperature}°C). Normal 36.1–37.2°C.",
                severity="warning",
            )
        )

    return alerts
