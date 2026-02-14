"""Triage Support Bot: guided symptom collection, risk explanation, medical safe mode."""

import re
from typing import Any

from app.schemas import SYMPTOM_OPTIONS

# Human-readable labels for symptoms (for bot and UI)
SYMPTOM_LABELS = {
    "chest_pain": "chest pain",
    "shortness_of_breath": "shortness of breath",
    "headache": "headache",
    "fever": "fever",
    "dizziness": "dizziness",
    "nausea": "nausea",
    "abdominal_pain": "abdominal pain",
    "bleeding": "bleeding",
    "unconscious": "unconscious / loss of consciousness",
    "seizure": "seizure",
    "trauma": "trauma / injury",
    "burn": "burn",
    "allergic_reaction": "allergic reaction",
    "stroke_symptoms": "stroke-like symptoms (e.g. facial droop, slurred speech)",
    "other": "other",
}

# Keywords users might say -> symptom code
KEYWORD_TO_SYMPTOM: dict[str, str] = {}
for code, label in SYMPTOM_LABELS.items():
    for part in label.lower().replace("/", " ").split():
        if len(part) > 2:
            KEYWORD_TO_SYMPTOM.setdefault(part, code)
for code in SYMPTOM_OPTIONS:
    KEYWORD_TO_SYMPTOM.setdefault(code.replace("_", " "), code)

# Medical term explanations (non-diagnostic, general info)
MEDICAL_TERMS = {
    "spo2": "SpO2 is blood oxygen saturation (%). Normal is 95–100%. Lower values may need medical attention.",
    "blood pressure": "Blood pressure has two numbers: systolic (when heart beats) and diastolic (when heart rests). Normal is around 120/80 mmHg.",
    "heart rate": "Heart rate is beats per minute (bpm). Normal resting is about 60–100 bpm.",
    "triage": "Triage means sorting patients by urgency so the most critical get care first.",
    "risk level": "Our system classifies risk as Low, Medium, or High based on vitals and symptoms—not a diagnosis.",
    "systolic": "Systolic pressure is the top number, when the heart contracts.",
    "diastolic": "Diastolic pressure is the bottom number, when the heart relaxes.",
}

DISCLAIMER = "This is general information only, not medical advice. Always follow your healthcare provider's guidance."

# Guided flow: questions to collect symptoms
GUIDED_QUESTIONS = [
    "What brings you in today? Please list any symptoms (e.g. chest pain, fever, headache).",
    "Are you having any breathing problems, dizziness, or nausea?",
    "Any pain (chest, abdomen, head)? Any bleeding, burns, or trauma?",
    "Have you had seizures, loss of consciousness, or stroke-like symptoms (face drooping, slurred speech, weakness on one side)?",
    "Anything else we should know? Type 'done' when finished.",
]


def extract_symptoms_from_text(text: str) -> list[str]:
    """Extract symptom codes from free text using keywords."""
    text_lower = text.lower().strip()
    found: set[str] = set()
    for keyword, code in KEYWORD_TO_SYMPTOM.items():
        if keyword in text_lower or code.replace("_", " ") in text_lower:
            found.add(code)
    return list(found)


def get_guided_reply(step: int, user_message: str, collected_symptoms: list[str]) -> tuple[str, int, list[str]]:
    """
    Guided symptom collection. Returns (bot_reply, next_step, updated_symptoms).
    step 0..len(GUIDED_QUESTIONS)-1; when step reaches end, return summary.
    """
    msg = user_message.strip().lower()
    if msg in ("done", "finish", "that's all", "nothing else"):
        if not collected_symptoms:
            return "Please mention at least one symptom (e.g. headache, fever) so we can help. What are you experiencing?", step, collected_symptoms
        return f"I've noted: {', '.join(SYMPTOM_LABELS.get(s, s) for s in collected_symptoms)}. You can now submit these on the Add Patient form, or say 'explain risk' after a triage.", len(GUIDED_QUESTIONS), collected_symptoms

    new_symptoms = extract_symptoms_from_text(user_message)
    updated = list(set(collected_symptoms) | set(new_symptoms))

    if step >= len(GUIDED_QUESTIONS) - 1:
        reply = f"I've noted: {', '.join(SYMPTOM_LABELS.get(s, s) for s in updated)}. Say 'done' to finish or add more symptoms."
        return reply, len(GUIDED_QUESTIONS), updated

    reply = GUIDED_QUESTIONS[step]
    if updated:
        reply = f"Got it: {', '.join(SYMPTOM_LABELS.get(s, s) for s in updated)}. Next: {reply}"
    return reply, step + 1, updated


def get_risk_explanation_reply(last_patient: dict | None) -> str:
    """Answer 'why am I high risk?', 'why emergency?', 'what increased my risk?' from last patient."""
    if not last_patient:
        return "No triage result in this session yet. Add a patient using the form to get a risk assessment, then you can ask 'Why am I high risk?' or 'Why Emergency?' and I'll explain."
    risk = last_patient.get("risk_level", "")
    dept = last_patient.get("recommended_department", "")
    reasoning = last_patient.get("reasoning_summary", "")
    explain = last_patient.get("explainability") or {}
    top = explain.get("top_contributing_features", [])
    probs = last_patient.get("probability_breakdown", {})
    abnormal = explain.get("abnormal_vitals", [])

    parts = [
        f"**Risk level:** {risk}. **Department:** {dept}.",
        reasoning,
    ]
    if probs:
        parts.append(f"Model probabilities: Low {probs.get('low', 0):.0%}, Medium {probs.get('medium', 0):.0%}, High {probs.get('high', 0):.0%}.")
    if top:
        parts.append("Factors that influenced risk: " + "; ".join(f"{t.get('name', '')} ({t.get('impact', '')})" for t in top[:3]))
    if abnormal:
        parts.append("Abnormal vitals noted: " + ", ".join(f"{v.get('name')} (normal: {v.get('normal_range')})" for v in abnormal))
    return " ".join(parts)


def get_medical_term_reply(user_message: str) -> str | None:
    """If user asks about a medical term, return explanation + disclaimer."""
    msg = user_message.lower().strip()
    for term, explanation in MEDICAL_TERMS.items():
        if term in msg and ("what is" in msg or "meaning" in msg or "explain" in msg or "?" in msg):
            return f"{explanation} {DISCLAIMER}"
    return None


def chat_turn(
    user_message: str,
    chat_state: dict[str, Any],
    last_patient: dict | None,
) -> tuple[str, dict[str, Any]]:
    """
    Process one user message. chat_state: { mode, step, collected_symptoms }.
    Returns (bot_reply, updated_state).
    """
    msg = user_message.strip().lower()
    mode = chat_state.get("mode", "guided")  # guided | risk_explanation | medical
    step = chat_state.get("step", 0)
    collected = list(chat_state.get("collected_symptoms", []))

    # Mode switches
    if "explain risk" in msg or "why am i high risk" in msg or "why emergency" in msg or "what increased my risk" in msg or "why this department" in msg:
        reply = get_risk_explanation_reply(last_patient)
        return reply, {"mode": "risk_explanation", "step": step, "collected_symptoms": collected}

    if "medical" in msg or "what is " in msg or "meaning of" in msg:
        term_reply = get_medical_term_reply(user_message)
        if term_reply:
            return term_reply, {"mode": "medical", "step": step, "collected_symptoms": collected}

    if "start over" in msg or "new symptoms" in msg:
        return "Starting over. " + GUIDED_QUESTIONS[0], {"mode": "guided", "step": 1, "collected_symptoms": []}

    # Guided symptom collection
    reply, next_step, updated_symptoms = get_guided_reply(step, user_message, collected)
    return reply, {"mode": "guided", "step": next_step, "collected_symptoms": updated_symptoms}
