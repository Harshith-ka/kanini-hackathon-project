import asyncio
import os
from dotenv import load_dotenv
from app.llm import medical_chat, explain_risk_assessment

async def test_openai():
    load_dotenv()
    print(f"API Key found: {bool(os.getenv('OPENAI_API_KEY'))}")
    
    print("\nTesting Medical Chat...")
    res = await medical_chat([{"role": "user", "content": "What are the common symptoms of hypertension?"}])
    print(f"Chat Response: {res[:100]}...")
    
    print("\nTesting Risk Explanation...")
    context = {
        "risk_level": "High",
        "heart_rate": 110,
        "blood_pressure_systolic": 160,
        "blood_pressure_diastolic": 100,
        "spo2": 92,
        "symptoms": ["chest pain", "shortness of breath"],
        "recommended_department": "Cardiology"
    }
    explain = await explain_risk_assessment(context)
    print(f"Explanation Reasoning: {explain.get('department_reasoning')}")

if __name__ == "__main__":
    asyncio.run(test_openai())
