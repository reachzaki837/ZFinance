"""
ZFinance Backend — main.py
============================
Run locally:
    uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import pandas as pd

load_dotenv()   # must run BEFORE importing rag/reconciliation routes, since those
                 # modules read env vars at import time

# Diagnostic — confirms the key actually loaded, without printing the real value
_key = os.getenv("GROQ_API_KEY", "")
if not _key or _key.startswith("gsk_xxxx"):
    print("⚠️  WARNING: GROQ_API_KEY is missing or still the placeholder value.")
    print(f"    Current value length: {len(_key)} chars")
else:
    print(f"✓ GROQ_API_KEY loaded ({len(_key)} chars, starts with '{_key[:7]}...')")

from rag.routes import router as rag_router, rag
from reconciliation.routes import router as reconciliation_router


DEMO_BUSINESS_ID = "test_biz_001"
DEMO_WEEKS = ["2026-W08", "2026-W09", "2026-W10", "2026-W11"]


def _seed_demo_data_if_missing():
    """
    Auto-seed the demo dataset on startup if ChromaDB is empty for the demo
    business. This makes the deployed app self-healing regardless of whether
    the hosting platform's disk is persistent across restarts/redeploys —
    a judge visiting the live link always sees real data, not empty states,
    without needing a paid persistent-disk tier.
    """
    existing_weeks = rag.list_weeks(DEMO_BUSINESS_ID)
    if len(existing_weeks) >= len(DEMO_WEEKS):
        print(f"✓ Demo data already present ({len(existing_weeks)} weeks) — skipping seed")
        return

    print("⏳ Seeding demo data (first boot or data missing)...")
    for i, week in enumerate(DEMO_WEEKS):
        path = f"data/week{i}.csv"
        if not os.path.exists(path):
            print(f"  ⚠️  {path} not found — skipping. Run data/sample_generate.py "
                  f"and commit the output CSVs so this seed step has data to load.")
            continue
        df = pd.read_csv(path)
        n = rag.ingest(df, DEMO_BUSINESS_ID, week)
        print(f"  ✓ Seeded {week}: {n} chunks")
    print("✓ Demo data seeding complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_demo_data_if_missing()
    yield
    # (no shutdown cleanup needed)


app = FastAPI(
    title="ZFinance API",
    description="AI-powered financial dashboard backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the frontend to call this backend.
# IMPORTANT: after deploying the frontend to Vercel, add its real URL here
# and redeploy the backend — see deployment checklist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        # "https://your-app.vercel.app",   # <-- add after first frontend deploy
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "ZFinance API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "ZFinance API"}


app.include_router(rag_router, prefix="/api/rag", tags=["AI Engine"])
app.include_router(reconciliation_router, prefix="/api/reconciliation", tags=["Reconciliation"])