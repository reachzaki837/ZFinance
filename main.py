"""
ZFinance Reconciliation — FastAPI Backend
==========================================
Run: uvicorn api.main:app --reload --port 8000

Endpoints:
  POST /reconcile        → upload two CSVs, get full report back
  GET  /report/{job_id}  → fetch a previously run report
  GET  /health           → health check
"""

import io
import json
import uuid
import os
from typing import Optional

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent.reconciler import ReconciliationAgent

app = FastAPI(
    title       = "ZFinance Reconciliation API",
    description = "AI-powered multi-source financial reconciliation agent",
    version     = "1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (replace with Redis in production)
_jobs: dict[str, dict] = {}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "ZFinance Reconciliation Agent"}


@app.post("/reconcile")
async def reconcile(
    background_tasks: BackgroundTasks,
    ledger: UploadFile = File(..., description="Internal ledger CSV"),
    bank:   UploadFile = File(..., description="Bank statement CSV"),
):
    """
    Upload two CSVs and kick off reconciliation.

    Ledger CSV columns required : ref_id, date, amount
    Bank CSV columns required   : bank_ref, date, debit

    Returns a job_id immediately. Poll GET /report/{job_id} for results.
    For demo purposes with small files, returns result synchronously.
    """
    for f, name in [(ledger, "ledger"), (bank, "bank")]:
        if not f.filename.endswith(".csv"):
            raise HTTPException(400, f"{name} file must be a CSV")

    ledger_bytes = await ledger.read()
    bank_bytes   = await bank.read()

    # Validate columns
    try:
        ld = pd.read_csv(io.BytesIO(ledger_bytes))
        bd = pd.read_csv(io.BytesIO(bank_bytes))
    except Exception as e:
        raise HTTPException(422, f"Could not parse CSV: {e}")

    missing_l = {"ref_id", "date", "amount"} - set(ld.columns)
    missing_b = {"bank_ref", "date", "debit"} - set(bd.columns)
    if missing_l:
        raise HTTPException(422, f"Ledger CSV missing columns: {missing_l}")
    if missing_b:
        raise HTTPException(422, f"Bank CSV missing columns: {missing_b}")

    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "running"}

    # Save temp files
    os.makedirs("tmp", exist_ok=True)
    ledger_path = f"tmp/{job_id}_ledger.csv"
    bank_path   = f"tmp/{job_id}_bank.csv"

    with open(ledger_path, "wb") as f: f.write(ledger_bytes)
    with open(bank_path,   "wb") as f: f.write(bank_bytes)

    # Run synchronously for demo; move to background task for production
    try:
        agent  = ReconciliationAgent()
        report = agent.run(ledger_path, bank_path)
        result = report.to_dict()
        _jobs[job_id] = {"status": "done", "report": result}
        return JSONResponse({"job_id": job_id, "status": "done", **result})
    except Exception as e:
        _jobs[job_id] = {"status": "error", "error": str(e)}
        raise HTTPException(500, f"Reconciliation failed: {e}")
    finally:
        # Clean up temp files
        for p in [ledger_path, bank_path]:
            try: os.remove(p)
            except: pass


@app.get("/report/{job_id}")
def get_report(job_id: str):
    """Fetch a previously submitted reconciliation report."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return job


@app.get("/demo")
def demo_report():
    """
    Run reconciliation on the built-in synthetic dataset.
    Useful for the pitch video — no file upload needed.
    """
    ledger_path = "data/ledger.csv"
    bank_path   = "data/bank_statement.csv"

    if not os.path.exists(ledger_path):
        raise HTTPException(404, "Demo data not found. Run: python data/generate.py")

    agent  = ReconciliationAgent()
    report = agent.run(ledger_path, bank_path)
    return report.to_dict()
