"""
ZFinance — RAG Routes
=======================
Endpoints matching what the frontend components expect:
  AINarrative.tsx    → POST /api/rag/narrative
  HealthScoreGauge   → POST /api/rag/health-score
  AnomalyRadar.tsx   → GET  /api/rag/anomalies/{business_id}/{week}
  AskZFinance.tsx    → POST /api/rag/ask
  Transactions.tsx   → POST /api/rag/ingest
  Settings.tsx       → GET/DELETE /api/rag/weeks/{business_id}
"""

import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel

from rag.rag_engine import ZFinanceRAG

router = APIRouter()
rag = ZFinanceRAG()


class NarrativeRequest(BaseModel):
    business_id: str
    week: str

class AskRequest(BaseModel):
    business_id: str
    question: str
    week: str | None = None


@router.post("/ingest")
async def ingest_csv(
    business_id: str = Query(...),
    week: str = Query(...),
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except UnicodeDecodeError:
        # Common on Windows-exported CSVs (Excel default encoding)
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding="cp1252")
        except Exception as e:
            raise HTTPException(422, f"Could not parse CSV (tried utf-8 and cp1252): {e}")
    except Exception as e:
        raise HTTPException(422, f"Could not parse CSV: {e}")

    missing = {"date", "amount"} - set(df.columns)
    if missing:
        raise HTTPException(422, f"CSV missing columns: {missing}")

    n = rag.ingest(df, business_id, week)
    return {"business_id": business_id, "week": week, "chunks_stored": n}


@router.post("/narrative")
async def narrative(req: NarrativeRequest):
    text = rag.generate_narrative(req.business_id, req.week)
    return {"business_id": req.business_id, "week": req.week, "narrative": text}


@router.post("/health-score")
async def health_score(req: NarrativeRequest):
    return rag.generate_health_score(req.business_id, req.week)


@router.post("/ask")
async def ask(req: AskRequest):
    answer = rag.ask(req.business_id, req.question, req.week)
    return {"business_id": req.business_id, "question": req.question, "answer": answer}


@router.get("/anomalies/{business_id}/{week}")
async def anomalies(business_id: str, week: str):
    return rag.get_anomalies(business_id, week)


@router.get("/weeks/{business_id}")
async def weeks(business_id: str):
    return {"business_id": business_id, "weeks": rag.list_weeks(business_id)}


@router.get("/trend/{business_id}")
async def trend(business_id: str):
    """Weekly revenue/expenses series for the dashboard chart."""
    return {"business_id": business_id, "data": rag.get_weekly_totals(business_id)}


@router.get("/transactions/{business_id}")
async def transactions(business_id: str, week: str | None = None):
    """Raw transaction rows for the Transactions table. Optional ?week= filter."""
    return {"business_id": business_id, "transactions": rag.get_transactions(business_id, week)}


@router.delete("/weeks/{business_id}/{week}")
async def delete_week(business_id: str, week: str):
    rag.delete_week(business_id, week)
    return {"deleted": True, "business_id": business_id, "week": week}