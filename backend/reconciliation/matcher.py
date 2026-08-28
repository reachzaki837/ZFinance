"""
ZFinance Reconciliation — Exact Matcher
==========================================
Deterministic matching by amount + date + reference ID. No LLM calls.
"""

import pandas as pd
from datetime import timedelta


def normalise_ledger(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0).abs()
    df["ref_id"] = df["ref_id"].astype(str).str.strip().str.upper()
    df["description"] = df["description"].astype(str).str.strip().str.lower()
    return df


def normalise_bank(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = pd.to_numeric(df["debit"], errors="coerce").fillna(0).abs()
    df["bank_ref"] = df["bank_ref"].astype(str).str.strip().str.upper()
    df["description"] = df["description"].astype(str).str.strip().str.lower()
    return df


def exact_match(
    ledger_row: pd.Series,
    bank: pd.DataFrame,
    used_bank_indices: set,
    amount_tolerance: float = 1.0,
    date_tolerance_days: int = 0,
) -> dict | None:
    """Try to find an exact match for one ledger row. Returns match dict or None.

    Uses bank DataFrame row index (not bank_ref value) to track which rows are
    'used' — bank_ref is NOT guaranteed unique (e.g. duplicate payments
    deliberately share the same reference number), so index-based tracking
    is required to correctly distinguish two rows with an identical bank_ref.
    """
    mask = (
        (~bank.index.isin(used_bank_indices)) &
        (bank["amount"].between(
            ledger_row["amount"] - amount_tolerance,
            ledger_row["amount"] + amount_tolerance,
        )) &
        (bank["date"].between(
            ledger_row["date"] - timedelta(days=date_tolerance_days),
            ledger_row["date"] + timedelta(days=date_tolerance_days),
        ))
    )
    candidates = bank[mask]
    if candidates.empty:
        return None

    ref_match = candidates[candidates["bank_ref"].str.startswith(ledger_row["ref_id"])]
    chosen = ref_match.iloc[0] if not ref_match.empty else candidates.iloc[0]

    return {
        "ledger_ref": ledger_row["ref_id"],
        "bank_ref": chosen["bank_ref"],
        "bank_index": chosen.name,
        "match_type": "exact",
        "confidence": 1.0,
        "amount_diff": round(abs(ledger_row["amount"] - chosen["amount"]), 2),
    }