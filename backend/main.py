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
from rag.routes import router as rag_router

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