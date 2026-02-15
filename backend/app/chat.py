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
    "spo2": "SpO2 is blood oxygen saturation (%). Normal is 95–100%. Lower values (hypoxia) may indicate breathing or circulation issues.",
    "blood pressure": "Blood pressure has two numbers: systolic (when heart beats) and diastolic (when heart rests). Normal is around 120/80 mmHg. High BP (hypertension) can increase cardiovascular risk.",
    "heart rate": "Heart rate (pulse) is beats per minute. Normal resting is about 60–100 bpm. Elevated pulse (tachycardia) can be due to pain, fever, or stress.",
    "triage": "Triage means sorting patients by clinical urgency. Critical cases (High Risk) are seen immediately.",
    "risk level": "Our system classifies risk as Low, Medium, or High based on vitals and symptoms. This is a sorting tool, not a clinical diagnosis.",
    "systolic": "The top BP number, representing pressure during heart contraction.",
    "diastolic": "The bottom BP number, representing pressure when the heart is between beats.",
    "hypertension": "Consistently high blood pressure (e.g. above 140/90). It's a major risk factor for heart disease and stroke.",
    "shock index": "Shock Index is Heart Rate divided by Systolic BP. A value > 0.9 may indicate early circulatory distress even if vitals look stable.",
}

DISCLAIMER = "Note: This is an AI-generated explanation for educational purposes. It is NOT a medical diagnosis. Always follow your provider's instructions."

# Guided flow questions
GUIDED_QUESTIONS = [
    "I'll help you prepare for triage. First, what are your primary symptoms? (e.g. chest pain, fever, shortness of breath)",
    "Are you experiencing any dizziness, nausea, or localized pain in your abdomen or limbs?",
    "Any history of chronic diseases like diabetes or hypertension? Also, how long have you had these symptoms?",
    "Lastly, any severe warning signs like fainting, seizures, or sudden weakness?",
    "Got it. Type 'done' to finish or add more details. I'll summarize everything for the clinical team."
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
    """Guided symptom collection flow."""
    msg = user_message.strip().lower()
    if msg in ("done", "finish", "that's all", "nothing else", "no"):
        if not collected_symptoms:
            return "Please mention at least one symptom (like fever or pain) so I can help. What brings you in?", step, collected_symptoms
        return f"Assessment complete. I've noted: {', '.join(SYMPTOM_LABELS.get(s, s) for s in collected_symptoms)}. You can now submit this to the intake form.", len(GUIDED_QUESTIONS), collected_symptoms

    new_symptoms = extract_symptoms_from_text(user_message)
    updated = list(set(collected_symptoms) | set(new_symptoms))

    if step >= len(GUIDED_QUESTIONS):
        return f"Noted. Currently tracked: {', '.join(SYMPTOM_LABELS.get(s, s) for s in updated)}. Say 'done' to finish.", len(GUIDED_QUESTIONS), updated

    reply = GUIDED_QUESTIONS[step]
    if updated and step == 0:
        reply = f"I've noted those symptoms. Next: {GUIDED_QUESTIONS[1]}"
        return reply, 2, updated
        
    return reply, step + 1, updated


def get_risk_explanation_reply(last_patient: dict | None) -> str:
    """Mode 2 - Explain risk using SHAP and vitals."""
    if not last_patient:
        return "I don't see a triage result for you yet. Once the admin runs an AI analysis, I can explain the risk factors."
        
    risk = last_patient.get("risk_level", "").upper()
    dept = last_patient.get("recommended_department", "")
    explain = last_patient.get("explainability") or {}
    abnormal = explain.get("abnormal_vitals", [])
    top_features = explain.get("top_contributing_features", [])
    insights = explain.get("disease_insights", [])
    
    parts = [f"### Triage Analysis: {risk}\n"]
    
    if risk == "HIGH":
        parts.append("🛑 **Priority Alert:** Your clinical indicators suggest urgent attention is needed.")
    elif risk == "MEDIUM":
        parts.append("⚠️ **Observation Needed:** You have markers that require medical evaluation.")
    else:
        parts.append("✅ **Stable:** Your indicators currently suggest a low urgency level.")

    parts.append(f"\n**Assigned Department:** {dept}")
    
    if abnormal:
        parts.append("\n**Key Vitals Contributing to Risk:**")
        for v in abnormal:
            parts.append(f"- {v.get('name')}: {v.get('value')} (Target range: {v.get('normal_range')})")
            
    if insights:
         parts.append("\n**Disease Context:**")
         for insight in insights:
             parts.append(f"- {insight}")

    if top_features:
        parts.append("\n**AI Model Insights:**")
        for f in top_features[:3]:
            impact = f.get('impact', '').lower()
            parts.append(f"- {f.get('name')}: High contribution to {risk} risk classification.")

    parts.append(f"\n_{DISCLAIMER}_")
    return "\n".join(parts)


def get_medical_term_reply(user_message: str) -> str | None:
    """Mode 3 - Education/Explanation."""
    msg = user_message.lower().strip()
    for term, explanation in MEDICAL_TERMS.items():
        if term in msg:
            return f"**{term.upper()} Explanation:** {explanation}\n\n_{DISCLAIMER}_"
    return None


async def chat_turn(
    user_message: str,
    chat_state: dict[str, Any],
    last_patient: dict | None,
) -> tuple[str, dict[str, Any]]:
    """Main chat router."""
    msg = user_message.strip().lower()
    mode = chat_state.get("mode", "guided")
    step = chat_state.get("step", 0)
    collected = list(chat_state.get("collected_symptoms", []))

    # Explicit Mode Triggers
    if any(k in msg for k in ["why", "explain", "risk", "reason", "increased"]):
        if last_patient:
            # Use LLM for risk explanation if available
            from app.llm import explain_risk_assessment
            import os
            if os.getenv("OPENAI_API_KEY"):
                 # Prepare context
                 context = {
                    "risk_level": last_patient.get("risk_level"),
                    "heart_rate": last_patient.get("heart_rate"),
                    "blood_pressure_systolic": last_patient.get("blood_pressure_systolic"),
                    "blood_pressure_diastolic": last_patient.get("blood_pressure_diastolic"),
                    "spo2": last_patient.get("spo2"),
                    "symptoms": last_patient.get("symptoms", []),
                    "recommended_department": last_patient.get("recommended_department")
                 }
                 try:
                     explanation = await explain_risk_assessment(context)
                     # Format the LLM JSON response into a string for the chat
                     parts = [f"### Triage Analysis: {context['risk_level']}\n"]
                     parts.append(f"**Department:** {context['recommended_department']}\n")
                     parts.append(f"**Reasoning:** {explanation.get('department_reasoning')}\n")
                     if explanation.get('disease_insights'):
                         parts.append("**Insights:**")
                         for i in explanation['disease_insights']:
                             parts.append(f"- {i}")
                     parts.append(f"\n_{explanation.get('safety_disclaimer')}_")
                     return "\n".join(parts), {"mode": "risk_explanation", "step": step, "collected_symptoms": collected}
                 except:
                     pass # Fallback to static
            
            reply = get_risk_explanation_reply(last_patient)
            return reply, {"mode": "risk_explanation", "step": step, "collected_symptoms": collected}
            
    # Run guided flow in background to see if we found symptoms
    reply, next_step, updated_symptoms = get_guided_reply(step, user_message, collected)
    
    # If the user message didn't result in new symptoms and isn't "done", 
    # and it's long enough to be a question, try LLM for general context.
    import os
    from app.llm import medical_chat
    if os.getenv("OPENAI_API_KEY"):
        # If it's a longer message that might be a question
        # OR if the guided flow didn't find anything new
        is_question = len(msg.split()) > 2 or "?" in msg
        found_nothing_new = next_step == step and len(updated_symptoms) == len(collected)
        
        if is_question or found_nothing_new:
            try:
                llm_reply = await medical_chat([{"role": "user", "content": user_message}])
                return llm_reply, {"mode": "medical_qa", "step": step, "collected_symptoms": updated_symptoms}
            except Exception as e:
                print(f"LLM Chat Error: {e}")
                # Fallback to guided reply below

    return reply, {"mode": "guided", "step": next_step, "collected_symptoms": updated_symptoms}
