import asyncio
from app.database import init_db, SessionLocal, User
from app.auth import get_password_hash
from sqlalchemy.future import select

async def setup():
    await init_db()
    async with SessionLocal() as db:
        result = await db.execute(select(User).filter(User.username == "admin"))
        if not result.scalars().first():
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)
            await db.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    asyncio.run(setup())
