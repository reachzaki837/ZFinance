"""
ZFinance Reconciliation — API Routes
========================================
Endpoints:
  POST /api/reconciliation/run    -> upload ledger + bank CSVs, get full report
  GET  /api/reconciliation/demo   -> run against bundled sample data (no upload needed)
"""

import io
import os
import logging

import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

from reconciliation.reconciliation_engine import ReconciliationEngine

log = logging.getLogger("zfinance.reconciliation.routes")
router = APIRouter()
engine = ReconciliationEngine()


def _read_csv_safely(contents: bytes, label: str) -> pd.DataFrame:
    """Same UTF-8 -> cp1252 fallback used in rag/routes.py, for Windows-exported CSVs."""
    try:
        return pd.read_csv(io.BytesIO(contents))
    except UnicodeDecodeError:
        try:
            return pd.read_csv(io.BytesIO(contents), encoding="cp1252")
        except Exception as e:
            raise HTTPException(422, f"Could not parse {label} CSV (tried utf-8 and cp1252): {e}")
    except Exception as e:
        raise HTTPException(422, f"Could not parse {label} CSV: {e}")


@router.post("/run")
async def run_reconciliation(
    ledger: UploadFile = File(..., description="Internal ledger CSV"),
    bank: UploadFile = File(..., description="Bank statement CSV"),
):
    """
    Upload a ledger CSV and a bank statement CSV, run the full 3-stage
    reconciliation pipeline, and return the complete report.

    Ledger CSV required columns : ref_id, date, description, amount
    Bank CSV required columns   : bank_ref, date, description, debit
    """
    for f, name in [(ledger, "ledger"), (bank, "bank")]:
        if not f.filename.endswith(".csv"):
            raise HTTPException(400, f"{name} file must be a CSV")

    ledger_bytes = await ledger.read()
    bank_bytes = await bank.read()

    ledger_df = _read_csv_safely(ledger_bytes, "ledger")
    bank_df = _read_csv_safely(bank_bytes, "bank")

    missing_ledger = {"ref_id", "date", "description", "amount"} - set(ledger_df.columns)
    missing_bank = {"bank_ref", "date", "description", "debit"} - set(bank_df.columns)
    if missing_ledger:
        raise HTTPException(422, f"Ledger CSV missing columns: {missing_ledger}")
    if missing_bank:
        raise HTTPException(422, f"Bank CSV missing columns: {missing_bank}")

    try:
        result = engine.run(ledger_df, bank_df)
    except Exception as e:
        log.exception("Reconciliation run failed")
        raise HTTPException(500, f"Reconciliation failed: {e}")

    return result


@router.get("/demo")
async def demo_reconciliation():
    """
    Run reconciliation against the bundled sample data in data/ledger.csv
    and data/bank_statement.csv — no upload needed. Useful for a quick
    demo or for the frontend to show something before a user uploads
    their own files.
    """
    ledger_path = "data/ledger.csv"
    bank_path = "data/bank_statement.csv"

    if not os.path.exists(ledger_path) or not os.path.exists(bank_path):
        raise HTTPException(
            404,
            "Demo data not found. Ensure data/ledger.csv and data/bank_statement.csv exist.",
        )

    ledger_df = pd.read_csv(ledger_path)
    bank_df = pd.read_csv(bank_path)

    try:
        result = engine.run(ledger_df, bank_df)
    except Exception as e:
        log.exception("Demo reconciliation failed")
        raise HTTPException(500, f"Reconciliation failed: {e}")

    return result