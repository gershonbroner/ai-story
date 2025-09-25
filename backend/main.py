from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List
import os, requests

from sqlalchemy import create_engine, Column, Integer, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base

# ---- Mistral settings ----
API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-large-latest"
SYSTEM_PROMPT = (
    "אתה מחבר סיפורים. כתוב סיפור קצר (120-180 מילים), בעברית, קולח ומעניין. "
    "הדגש התחלה-אמצע-סוף, וללא תוכן בעייתי."
)

# ---- DB (SQLite) ----
SQLALCHEMY_DATABASE_URL = "sqlite:///./stories.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class Story(Base):
    __tablename__ = "stories"
    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    story = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ---- Schemas ----
class CreateStoryIn(BaseModel):
    prompt: str

class StoryOut(BaseModel):
    id: int
    prompt: str
    story: str
    created_at: datetime
    class Config:
        from_attributes = True

# ---- App ----
app = FastAPI(title="AI Story API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def call_mistral(prompt: str) -> str:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Missing MISTRAL_API_KEY")
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"תכתוב סיפור על: {prompt}"},
        ],
        "temperature": 0.8,
        "max_tokens": 400,
    }
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

    try:
        resp = requests.post(MISTRAL_URL, json=payload, headers=headers, timeout=45)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Mistral request failed: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Bad response shape from Mistral")

@app.post("/api/story", response_model=StoryOut)
def create_story(payload: CreateStoryIn):
    p = payload.prompt.strip()
    if not p:
        raise HTTPException(status_code=400, detail="prompt is empty")

    text = call_mistral(p)

    db = SessionLocal()
    try:
        row = Story(prompt=p, story=text)
        db.add(row); db.commit(); db.refresh(row)
        return row
    finally:
        db.close()

@app.get("/api/story", response_model=List[StoryOut])
def list_stories():
    db = SessionLocal()
    try:
        rows = db.query(Story).order_by(Story.id.desc()).limit(20).all()
        return rows
    finally:
        db.close()
