"""
ZFinance Reconciliation — Fuzzy Matcher
==========================================
LLM-based matching for ambiguous cases + exception classification.
Reuses the same _call_llm wiring already tested in rag/engine.py.
"""

import json
import logging

import pandas as pd
from rapidfuzz import fuzz

from rag.rag_engine import _call_llm
from reconciliation.prompts import (
    FUZZY_SYSTEM, EXCEPTION_SYSTEM, fuzzy_user_prompt, exception_user_prompt,
)

log = logging.getLogger("zfinance.reconciliation")


def _safe_json(raw: str) -> dict:
    try:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        log.warning("JSON parse failed: %s | raw: %s", e, raw[:150])
        return {}


def get_candidates(
    ledger_row: pd.Series,
    bank: pd.DataFrame,
    used_bank_indices: set,
    date_window_days: int = 3,
    amount_pct: float = 5.0,
    wider: bool = False,
) -> list[dict]:
    date_window = date_window_days * (2 if wider else 1)
    pct = amount_pct * (2 if wider else 1)
    buffer = ledger_row["amount"] * pct / 100

    from datetime import timedelta
    mask = (
        (~bank.index.isin(used_bank_indices)) &
        (bank["amount"].between(ledger_row["amount"] - buffer, ledger_row["amount"] + buffer)) &
        (bank["date"].between(
            ledger_row["date"] - timedelta(days=date_window),
            ledger_row["date"] + timedelta(days=date_window),
        ))
    )
    rows = bank[mask][["bank_ref", "date", "description", "amount"]].copy()
    rows["bank_index"] = bank[mask].index

    desc_mask = (
        (~bank.index.isin(used_bank_indices)) &
        (bank["description"].apply(lambda d: fuzz.partial_ratio(ledger_row["description"], d) > 70))
    )
    desc_rows = bank[desc_mask][["bank_ref", "date", "description", "amount"]].copy()
    desc_rows["bank_index"] = bank[desc_mask].index

    combined = pd.concat([rows, desc_rows]).drop_duplicates("bank_index")
    result = combined.to_dict("records")
    for r in result:
        r["date"] = str(r["date"])[:10]
    return result


def llm_fuzzy_match(ledger_row: pd.Series, candidates: list[dict]) -> dict | None:
    if not candidates:
        return None

    ledger_dict = {
        "ref_id": ledger_row["ref_id"],
        "date": str(ledger_row["date"])[:10],
        "description": ledger_row["description"],
        "amount": ledger_row["amount"],
    }
    prompt = fuzzy_user_prompt(ledger_dict, candidates)

    try:
        raw = _call_llm(FUZZY_SYSTEM, prompt, temperature=0.0, json_mode=True)
    except Exception as e:
        # Groq down, rate-limited, network error, etc. — don't crash the whole
        # reconciliation run. Fall through to "no match" so this one transaction
        # lands in Stage 3 (exception classification), which has its own
        # LLM-failure fallback below.
        log.warning("LLM fuzzy match call failed for %s: %s", ledger_row["ref_id"], e)
        return None

    data = _safe_json(raw)

    if not data.get("match_found"):
        return None

    bank_ref = data.get("matched_bank_ref", "")
    matched = next((c for c in candidates if c["bank_ref"] == bank_ref), None)
    if not matched:
        return None

    return {
        "ledger_ref": ledger_row["ref_id"],
        "bank_ref": bank_ref,
        "bank_index": matched["bank_index"],
        "match_type": "fuzzy",
        "confidence": float(data.get("confidence", 0.0)),
        "amount_diff": round(abs(ledger_row["amount"] - matched["amount"]), 2),
        "reason": data.get("match_reason", ""),
    }


def classify_exception(ledger_row: pd.Series, candidates: list[dict]) -> dict:
    ledger_dict = {
        "ref_id": ledger_row["ref_id"],
        "date": str(ledger_row["date"])[:10],
        "description": ledger_row["description"],
        "amount": ledger_row["amount"],
    }
    prompt = exception_user_prompt(ledger_dict, candidates)

    try:
        raw = _call_llm(EXCEPTION_SYSTEM, prompt, temperature=0.0, json_mode=True)
        data = _safe_json(raw)
    except Exception as e:
        # LLM is genuinely unavailable. Still return a complete, honest record —
        # never silently drop a transaction from the report. Confidence 0 makes
        # it clearly distinguishable from a real AI classification.
        log.warning("LLM exception classification failed for %s: %s", ledger_row["ref_id"], e)
        data = {
            "exception_type": "llm_unavailable",
            "confidence": 0.0,
            "evidence": (
                "AI classification could not be completed (the language model "
                "was unreachable or returned an invalid response). This transaction "
                "requires manual review."
            ),
            "recommendation": "Retry reconciliation once AI service is available, or review manually.",
        }

    return {
        "ledger_ref": ledger_row["ref_id"],
        "amount": ledger_row["amount"],
        "date": str(ledger_row["date"])[:10],
        "description": ledger_row["description"],
        "exception_type": data.get("exception_type", "unknown"),
        "confidence": float(data.get("confidence", 0.0)),
        "evidence": data.get("evidence", "No evidence returned."),
        "recommendation": data.get("recommendation", ""),
        "candidates": [c["bank_ref"] for c in candidates],
    }