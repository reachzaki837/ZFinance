"""
ZFinance Reconciliation — Standalone Test
=============================================
Tests the reconciliation engine directly (no API layer) against the real
ledger.csv / bank_statement.csv / mismatch_ground_truth.csv fixtures.

Run:
    python test_reconciliation.py

Requires: data/ledger.csv, data/bank_statement.csv, data/mismatch_ground_truth.csv
"""

import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from backend.reconciliation.reconciliation_engine import ReconciliationEngine


def load_ground_truth(path: str) -> dict[str, str]:
    gt = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            gt[row["ledger_ref"].upper()] = row["type"]
    return gt


def line(char="─", n=64):
    print(char * n)


def main():
    print("\n" + "═" * 64)
    print("  ZFinance Reconciliation — Standalone Test")
    print("═" * 64)

    ledger_path = "data/ledger.csv"
    bank_path = "data/bank_statement.csv"
    gt_path = "data/mismatch_ground_truth.csv"

    for p in [ledger_path, bank_path, gt_path]:
        if not os.path.exists(p):
            print(f"\n  ERROR: {p} not found. Place the uploaded CSVs in the data/ folder.")
            return

    ledger_df = pd.read_csv(ledger_path)
    bank_df = pd.read_csv(bank_path)
    ground_truth = load_ground_truth(gt_path)

    print(f"\n  Ledger rows       : {len(ledger_df)}")
    print(f"  Bank rows         : {len(bank_df)}")
    print(f"  Ground truth exceptions: {len(ground_truth)}")

    print("\n  Running reconciliation engine (this calls Groq for fuzzy matches")
    print("  and exception classification — may take 30-60 seconds)...\n")

    engine = ReconciliationEngine()
    result = engine.run(ledger_df, bank_df)

    s = result["summary"]
    line("═")
    print("  RESULTS")
    line("═")
    print(f"  Total ledger      : {s['total_ledger']}")
    print(f"  Total bank        : {s['total_bank']}")
    print(f"  Exact matches     : {s['exact_matches']}")
    print(f"  Fuzzy matches     : {s['fuzzy_matches']}")
    print(f"  Exceptions        : {s['exceptions']}")
    print(f"  Unmatched bank    : {s['unmatched_bank']}")
    print(f"  Match rate        : {s['match_rate']*100:.1f}%")

    # ── Score against ground truth (business-logic-aware) ─────────────────────
    line("─")
    print("  RECONCILIATION QUALITY (vs ground truth)")
    line("─")
    print("  A transaction counts as 'handled correctly' if the agent either:")
    print("    (a) auto-resolved it via fuzzy match (for amount/date discrepancies), or")
    print("    (b) correctly flagged it as an exception with the right type, or")
    print("    (c) surfaced it as an unmatched bank entry (for duplicates/split residue)")
    print()

    def strip_suffix(ref: str) -> str:
        """TXN00047-A / TXN00047-B -> TXN00047, for comparing against base ledger refs."""
        for suffix in ("-A", "-B"):
            if ref.endswith(suffix):
                return ref[: -len(suffix)]
        return ref

    # Normalise ground truth keys to base refs, tracking type per base ref
    gt_by_base: dict[str, str] = {}
    for ref, typ in ground_truth.items():
        gt_by_base[strip_suffix(ref)] = typ

    fuzzy_refs = {m["ledger_ref"].upper() for m in result["fuzzy_matches"]}
    exact_refs = {m["ledger_ref"].upper() for m in result["exact_matches"]}
    exception_refs = {strip_suffix(e["ledger_ref"].upper()): e["exception_type"] for e in result["exceptions"]}
    unmatched_bank_bases = {strip_suffix(b["bank_ref"].upper()) for b in result["unmatched_bank"]}

    correct, incorrect, details = 0, 0, []
    for ref, gt_type in gt_by_base.items():
        if gt_type in ("amount_discrepancy", "date_shift") and ref in fuzzy_refs:
            correct += 1
            details.append((ref, gt_type, "auto-resolved (fuzzy match)", True))
        elif gt_type == "description_mismatch" and ref in exact_refs:
            correct += 1
            details.append((ref, gt_type, "auto-resolved (exact match — description is cosmetic noise)", True))
        elif ref in exception_refs:
            predicted_type = exception_refs[ref]
            is_right_type = (predicted_type in gt_type) or (gt_type in predicted_type) or (
                predicted_type == "split_transaction" and gt_type == "split_transaction"
            )
            correct += 1 if is_right_type else 0
            incorrect += 0 if is_right_type else 1
            details.append((ref, gt_type, f"flagged as exception ({predicted_type})", is_right_type))
        elif gt_type == "bank_duplicate" and ref in unmatched_bank_bases:
            correct += 1
            details.append((ref, gt_type, "surfaced as unmatched bank entry", True))
        else:
            incorrect += 1
            details.append((ref, gt_type, "NOT HANDLED", False))

    total_gt = len(gt_by_base)
    accuracy = correct / total_gt if total_gt else 0

    print(f"  Handled correctly : {correct} / {total_gt}  ({accuracy:.1%})")
    print(f"  Handled incorrectly: {incorrect}")
    print()
    for ref, gt_type, outcome, ok in details:
        mark = "✓" if ok else "✗"
        print(f"  [{mark}] {ref:<12} ground truth: {gt_type:<22} → {outcome}")

    # ── Show exception details ───────────────────────────────────────────────
    line("─")
    print("  EXCEPTION DETAILS (raw agent output)")
    line("─")
    for e in result["exceptions"]:
        print(f"\n  [{e['exception_type'].upper()}] {e['ledger_ref']}")
        print(f"      ₹{e['amount']:,.2f} on {e['date']}")
        print(f"      {e['evidence']}")

    print("\n" + "═" * 64)
    print("  TEST COMPLETE")
    print("═" * 64 + "\n")


if __name__ == "__main__":
    main()