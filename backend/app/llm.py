
import os
import json
from openai import AsyncOpenAI
from typing import List, Dict, Any

# Initialize OpenAI client
# Ensure OPENAI_API_KEY is set in environment variables
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SAFETY_SYSTEM_PROMPT = """
You are a highly experienced clinical explanation assistant for a triage system.
Your goal is to explain medical risk factors and conditions to patients in clear, professional, and comforting language.

CRITICAL SAFETY RULES:
1. DO NOT provide a medical diagnosis. You are an AI assistant, not a doctor.
2. DO NOT prescribe medications or specific treatments.
3. DO NOT override the risk level provided in the context.
4. ALWAYS recommend seeing a healthcare professional for definitive advice.
5. Use "Possible indications" or "Associated with" instead of "You have".
6. Keep explanations concise and structured.

If the input is missing or unclear, provide a general safety warning.
"""

async def explain_risk_assessment(context: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """
    Generates a structured explanation of the risk assessment using OpenAI.
    """
    try:
        # Construct a structured prompt
        prompt = f"""
        Analyze the following patient triage data and provide a patient-friendly explanation.
        
        Patient Data:
        - Risk Level: {context.get('risk_level', 'Unknown')}
        - Vitals: HR {context.get('heart_rate')}, BP {context.get('blood_pressure_systolic')}/{context.get('blood_pressure_diastolic')}, SpO2 {context.get('spo2')}%
        - Symptoms: {', '.join(context.get('symptoms', []))}
        - Department: {context.get('recommended_department')}
        
        Language: {language} (Respond in this language)
        
        Output Format (JSON):
        {{
            "top_contributing_features": [
                {{"name": "Feature Name", "impact": "High/Medium/Low", "explanation": "Brief explanation why this is a risk"}}
            ],
            "department_reasoning": "Clear explanation of why this department was selected.",
            "disease_insights": ["Insight 1", "Insight 2"],
            "safety_disclaimer": "Standard medical disclaimer in {language}."
        }}
        """

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        print(f"OpenAI Error: {e}")
        # Fallback if OpenAI fails or key is missing
        return {
            "top_contributing_features": [],
            "department_reasoning": "Clinical assessment based on reported vitals and symptoms. Please consult the assigned nurse.",
            "disease_insights": [],
            "safety_disclaimer": "AI generation unavailable. Please consult a doctor."
        }

async def medical_chat(history: List[Dict[str, str]], language: str = "en") -> str:
    """
    Handles general medical Q&A with safety guardrails.
    """
    try:
        system_msg = SAFETY_SYSTEM_PROMPT + f"\nRespond in {language}."
        
        # Keep only last 5 messages to save context/cost
        messages = [{"role": "system", "content": system_msg}] + history[-5:]

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Chat Error: {e}")
        return "I apologize, but I am currently unable to process your request. Please seek immediate medical attention if this is an emergency."
