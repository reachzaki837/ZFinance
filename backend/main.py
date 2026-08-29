"""
ZFinance Backend — main.py
============================
Step 1: minimal FastAPI app. Just health check + CORS for now.
We'll add real endpoints (narrative, health-score, ask, ingest, reconcile)
one at a time in later steps, once this runs cleanly.

Run:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()   # must run BEFORE importing rag.routes, since rag/engine.py reads env vars at import time

# Diagnostic — confirms the key actually loaded, without printing the real value
_key = os.getenv("GROQ_API_KEY", "")
if not _key or _key.startswith("gsk_xxxx"):
    print("⚠️  WARNING: GROQ_API_KEY is missing or still the placeholder value.")
    print(f"    Current value length: {len(_key)} chars")
else:
    print(f"✓ GROQ_API_KEY loaded ({len(_key)} chars, starts with '{_key[:7]}...')")

from rag.routes import router as rag_router
from reconciliation.routes import router as reconciliation_router

app = FastAPI(
    title="ZFinance API",
    description="AI-powered financial dashboard backend",
    version="0.1.0",
)

# CORS — allow the frontend to call this backend.
# Add your Vercel URL here once deployed; localhost ports cover local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server default
        "http://localhost:3000",   # fallback
        "http://127.0.0.1:5173",
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