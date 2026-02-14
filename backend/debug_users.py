
import asyncio
from app.database import SessionLocal, User
from sqlalchemy.future import select

async def list_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"ID: {u.id} | Username: '{u.username}' | Email: '{u.email}' | Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(list_users())
