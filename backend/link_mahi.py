
import asyncio
from app.database import SessionLocal, PatientRecord
from sqlalchemy.future import select

async def link_mahi():
    async with SessionLocal() as db:
        # Get unlinked records
        result = await db.execute(select(PatientRecord).filter(PatientRecord.user_id == None))
        records = result.scalars().all()
        
        if not records:
            print("No unlinked records found.")
            return

        print(f"Found {len(records)} unlinked records. Linking to User ID 3 (mahi)...")
        
        for r in records:
            r.user_id = 3
            # Also update name just in case it wasn't set, though it might be in the record already?
            # The record doesn't have a name field, it relies on User. 
            # Oh wait, the schemas show PatientRecord doesn't store name directly?
            # Let's check models.py to be sure, but usually we link to User.
            # If the record has no user_id, it is effectively anonymous.
            
        await db.commit()
        print("Successfully linked records to Mahi.")

if __name__ == "__main__":
    asyncio.run(link_mahi())
