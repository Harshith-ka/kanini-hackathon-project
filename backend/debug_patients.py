
import asyncio
from app.database import SessionLocal, PatientRecord
from sqlalchemy.future import select

async def dump_patients():
    async with SessionLocal() as db:
        result = await db.execute(select(PatientRecord))
        patients = result.scalars().all()
        with open("patients_dump.txt", "w", encoding="utf-8") as f:
            f.write(f"Found {len(patients)} patients:\n")
            for p in patients:
                 # Try to get name from user relationship if possible, but here we just have patient_record
                 # The patient_record doesn't have a name field directly, it links to User.
                 # Wait, looking at models.py (or schema), PatientRecord usually links to User.
                 # Let's just dump ID and CreatedAt for now.
                 f.write(f"ID: {p.id} | PatientID: {p.patient_id} | UserID: {p.user_id}\n")
    print("Dump complete.")

if __name__ == "__main__":
    asyncio.run(dump_patients())
