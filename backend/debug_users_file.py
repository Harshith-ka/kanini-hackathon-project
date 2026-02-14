
import asyncio
from app.database import SessionLocal, User
from sqlalchemy.future import select

async def dump_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        with open("users_dump.txt", "w", encoding="utf-8") as f:
            f.write(f"Found {len(users)} users:\n")
            for u in users:
                f.write(f"ID: {u.id} | Username: '{u.username}' | Email: '{u.email}' | Role: {u.role}\n")
    print("Dump complete.")

if __name__ == "__main__":
    asyncio.run(dump_users())
