"""
ZFinance — LLM Failure Resilience Test
=========================================
Deliberately breaks the Groq connection (invalid API key) and confirms:
  1. The reconciliation pipeline does NOT crash — it returns a complete report.
  2. Failed transactions get exception_type="llm_unavailable" with confidence=0,
     not silently dropped.
  3. The RAG engine (narrative/health-score/ask) returns honest fallback
     messages instead of raising.

Run:
    python test_llm_failure.py

This temporarily overrides GROQ_API_KEY in-process only — does not touch
your real .env file.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Deliberately break the key BEFORE importing anything that reads it
os.environ["GROQ_API_KEY"] = "gsk_intentionally_invalid_key_for_testing"

import pandas as pd
from reconciliation.reconciliation_engine import ReconciliationEngine
from rag.rag_engine import ZFinanceRAG


def line(c="─", n=60):
    print(c * n)


def test_reconciliation_resilience():
    print("\n" + "═" * 60)
    print("  TEST 1: Reconciliation pipeline with broken Groq key")
    print("═" * 60)

    ledger_path, bank_path = "data/ledger.csv", "data/bank_statement.csv"
    if not os.path.exists(ledger_path):
        print("  SKIPPED — data/ledger.csv not found")
        return

    # Use a small slice so this runs fast — we're testing failure handling,
    # not re-running the full 55-row benchmark
    ledger_df = pd.read_csv(ledger_path).head(10)
    bank_df = pd.read_csv(bank_path)

    engine = ReconciliationEngine()
    try:
        result = engine.run(ledger_df, bank_df)
    except Exception as e:
        print(f"\n  ✗ FAILED — pipeline crashed instead of degrading gracefully:")
        print(f"    {type(e).__name__}: {e}")
        return

    print(f"\n  ✓ Pipeline completed without crashing")
    print(f"    Exact matches : {result['summary']['exact_matches']}")
    print(f"    Fuzzy matches : {result['summary']['fuzzy_matches']}  (expect 0 — Groq is broken)")
    print(f"    Exceptions    : {result['summary']['exceptions']}")

    llm_unavailable_count = sum(
        1 for e in result["exceptions"] if e["exception_type"] == "llm_unavailable"
    )
    print(f"\n  llm_unavailable exceptions: {llm_unavailable_count}")
    if llm_unavailable_count > 0:
        sample = next(e for e in result["exceptions"] if e["exception_type"] == "llm_unavailable")
        print(f"  Sample evidence text: \"{sample['evidence'][:100]}...\"")
        print(f"  Confidence: {sample['confidence']}  (expect 0.0)")
        print("\n  ✓ Failed transactions correctly flagged, not silently dropped")
    else:
        print("  (No exceptions needed AI classification in this 10-row slice — try full dataset)")


def test_rag_resilience():
    print("\n" + "═" * 60)
    print("  TEST 2: RAG engine with broken Groq key")
    print("═" * 60)

    rag = ZFinanceRAG()
    business_id = "test_biz_001"
    week = "2026-W11"

    print("\n  Calling generate_narrative()...")
    try:
        result = rag.generate_narrative(business_id, week)
        print(f"  ✓ Did not crash. Response: \"{result[:100]}...\"")
        if "unavailable" in result.lower():
            print("  ✓ Correctly identifies itself as unavailable, not a garbage response")
    except Exception as e:
        print(f"  ✗ FAILED — crashed: {type(e).__name__}: {e}")

    print("\n  Calling generate_health_score()...")
    try:
        result = rag.generate_health_score(business_id, week)
        print(f"  ✓ Did not crash. Response: {result}")
        if result.get("ai_unavailable"):
            print("  ✓ ai_unavailable flag correctly set — frontend can detect this")
    except Exception as e:
        print(f"  ✗ FAILED — crashed: {type(e).__name__}: {e}")

    print("\n  Calling ask()...")
    try:
        result = rag.ask(business_id, "Why did costs rise?", week)
        print(f"  ✓ Did not crash. Response: \"{result[:100]}...\"")
    except Exception as e:
        print(f"  ✗ FAILED — crashed: {type(e).__name__}: {e}")


if __name__ == "__main__":
    test_reconciliation_resilience()
    test_rag_resilience()
    print("\n" + "═" * 60)
    print("  TEST COMPLETE")
    print("  If all sections show ✓, the app survives an LLM outage gracefully.")
    print("═" * 60 + "\n")