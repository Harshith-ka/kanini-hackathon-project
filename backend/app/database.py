# Database setup
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column
from typing import Optional
import datetime

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./triage.db"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(unique=True, index=True) # This will be the email for patients
    full_name: Mapped[str] = mapped_column(default="")
    email: Mapped[str] = mapped_column(unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column()
    hashed_password: Mapped[str] = mapped_column()
    role: Mapped[str] = mapped_column(default="patient") # "admin" or "patient"
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

class PatientRecord(Base):
    __tablename__ = "patients"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(unique=True, index=True)
    age: Mapped[int] = mapped_column()
    gender: Mapped[str] = mapped_column()
    heart_rate: Mapped[float] = mapped_column()
    blood_pressure_systolic: Mapped[float] = mapped_column()
    blood_pressure_diastolic: Mapped[float] = mapped_column()
    temperature: Mapped[float] = mapped_column()
    spo2: Mapped[float] = mapped_column()
    respiratory_rate: Mapped[float] = mapped_column()
    pain_score: Mapped[int] = mapped_column()
    chronic_disease_count: Mapped[int] = mapped_column()
    symptom_duration: Mapped[float] = mapped_column()
    risk_level: Mapped[str] = mapped_column()
    priority_score: Mapped[float] = mapped_column()
    recommended_department: Mapped[str] = mapped_column()
    is_active: Mapped[bool] = mapped_column(default=True) # False if discharged
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)
    user_id: Mapped[Optional[int]] = mapped_column(index=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
