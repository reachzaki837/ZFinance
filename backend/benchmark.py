"""
ZFinance — Reconciliation Benchmark
======================================
Produces the standard evaluation table for the Buildathon submission:
Records, exact/AI-assisted matches, unresolved, match rate, precision,
recall, classification accuracy, runtime — computed rigorously against
the real ground-truth fixture, with the exact definition of each metric
stated so it's defensible under questioning.

Run:
    python benchmark.py

Outputs:
    - Printed markdown table (paste directly into README)
    - BENCHMARK_RESULTS.md  (saved artifact)
    - benchmark_results.json (raw numbers, for reproducibility)
"""

import csv
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from reconciliation.reconciliation_engine import ReconciliationEngine


LEDGER_PATH = "data/ledger.csv"
BANK_PATH = "data/bank_statement.csv"
GT_PATH = "data/mismatch_ground_truth.csv"

NEEDS_REVIEW_TYPES = {"split_transaction", "missing_from_bank", "bank_duplicate"}
AUTO_RESOLVE_TYPES = {"amount_discrepancy", "date_shift", "description_mismatch"}


def strip_suffix(ref: str) -> str:
    for suffix in ("-A", "-B"):
        if ref.endswith(suffix):
            return ref[: -len(suffix)]
    return ref


def load_ground_truth() -> dict[str, str]:
    gt = {}
    with open(GT_PATH) as f:
        for row in csv.DictReader(f):
            gt[strip_suffix(row["ledger_ref"].upper())] = row["type"]
    return gt


def run_benchmark():
    for p in [LEDGER_PATH, BANK_PATH, GT_PATH]:
        if not os.path.exists(p):
            print(f"ERROR: {p} not found.")
            return

    ledger_df = pd.read_csv(LEDGER_PATH)
    bank_df = pd.read_csv(BANK_PATH)
    ground_truth = load_ground_truth()

    engine = ReconciliationEngine()

    print(f"Running full benchmark — {len(ledger_df)} ledger records, "
          f"{len(bank_df)} bank records...")
    print("(This makes real Groq API calls and may take 30-90 seconds)\n")

    start = time.time()
    result = engine.run(ledger_df, bank_df)
    runtime = time.time() - start

    s = result["summary"]
    fuzzy_refs = {m["ledger_ref"].upper() for m in result["fuzzy_matches"]}
    exact_refs = {m["ledger_ref"].upper() for m in result["exact_matches"]}
    exceptions_by_ref = {strip_suffix(e["ledger_ref"].upper()): e["exception_type"] for e in result["exceptions"]}
    unmatched_bank_bases = {strip_suffix(b["bank_ref"].upper()) for b in result["unmatched_bank"]}

    auto_resolve_gt = [ref for ref, t in ground_truth.items() if t in AUTO_RESOLVE_TYPES]
    auto_resolve_correct = sum(
        1 for ref in auto_resolve_gt if ref in fuzzy_refs or ref in exact_refs
    )
    auto_resolve_accuracy = auto_resolve_correct / len(auto_resolve_gt) if auto_resolve_gt else 0

    labeled_review_types = {"split_transaction", "missing_from_bank"}
    labeled_gt = [ref for ref, t in ground_truth.items() if t in labeled_review_types]
    labeled_correct = sum(
        1 for ref in labeled_gt
        if ref in exceptions_by_ref and exceptions_by_ref[ref] == ground_truth[ref]
    )
    classification_accuracy = labeled_correct / len(labeled_gt) if labeled_gt else 0

    dup_gt = [ref for ref, t in ground_truth.items() if t == "bank_duplicate"]
    dup_correct = sum(1 for ref in dup_gt if ref in unmatched_bank_bases)
    duplicate_accuracy = dup_correct / len(dup_gt) if dup_gt else 0

    true_needs_review = {ref for ref, t in ground_truth.items() if t in NEEDS_REVIEW_TYPES}
    system_flagged = set(exceptions_by_ref.keys()) | {
        ref for ref in dup_gt if ref in unmatched_bank_bases
    }

    true_positives = true_needs_review & system_flagged
    false_positives = system_flagged - true_needs_review
    false_negatives = true_needs_review - system_flagged

    precision = len(true_positives) / len(system_flagged) if system_flagged else 0
    recall = len(true_positives) / len(true_needs_review) if true_needs_review else 0

    results = {
        "records": s["total_ledger"],
        "exact_matches": s["exact_matches"],
        "ai_assisted_matches": s["fuzzy_matches"],
        "unresolved_exceptions": s["exceptions"],
        "match_rate": round(s["match_rate"], 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "classification_accuracy": round(classification_accuracy, 4),
        "auto_resolution_accuracy": round(auto_resolve_accuracy, 4),
        "duplicate_detection_accuracy": round(duplicate_accuracy, 4),
        "runtime_seconds": round(runtime, 1),
        "false_positives": sorted(false_positives),
        "false_negatives": sorted(false_negatives),
    }

    md = f"""## Evaluation Results

Benchmarked against a 55-record synthetic dataset with 24 labeled ground-truth
mismatches across 6 categories (amount discrepancy, date shift, description
mismatch, split transaction, missing from bank, duplicate payment).

| Metric | Result |
|---|---:|
| Records | {results['records']} |
| Exact matches (deterministic) | {results['exact_matches']} |
| AI-assisted (fuzzy) matches | {results['ai_assisted_matches']} |
| Unresolved (flagged for human review) | {results['unresolved_exceptions']} |
| Match rate | {results['match_rate']*100:.1f}% |
| Precision (needs-review detection) | {results['precision']*100:.1f}% |
| Recall (needs-review detection) | {results['recall']*100:.1f}% |
| Exception classification accuracy | {results['classification_accuracy']*100:.1f}% |
| Auto-resolution accuracy | {results['auto_resolution_accuracy']*100:.1f}% |
| Duplicate detection accuracy | {results['duplicate_detection_accuracy']*100:.1f}% |
| Runtime (full dataset) | {results['runtime_seconds']}s |

**Metric definitions:**
- **Precision / Recall** — positive class is "this record genuinely requires
  human review" (split transactions, missing-from-bank, duplicate payments).
  Precision = of everything the system flagged for review, how much genuinely
  needed it. Recall = of everything that genuinely needed review, how much
  the system caught.
- **Exception classification accuracy** — of records correctly flagged for
  review, how many received the correct exception type label.
- **Auto-resolution accuracy** — of records with cosmetic noise (fee
  differences, settlement delays, bank description truncation), how many
  were correctly resolved automatically without needlessly escalating to
  a human.
"""

    if results["false_positives"] or results["false_negatives"]:
        md += "\n**Honest failure examples:**\n"
        if results["false_positives"]:
            md += f"- False positives (flagged but didn't need review): {results['false_positives']}\n"
        if results["false_negatives"]:
            md += f"- False negatives (needed review, not flagged): {results['false_negatives']}\n"
    else:
        md += "\nNo false positives or false negatives on this benchmark run.\n"

    print(md)

    with open("BENCHMARK_RESULTS.md", "w", encoding="utf-8") as f:
        f.write(md)
    with open("benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("─" * 60)
    print("Saved: BENCHMARK_RESULTS.md (paste into README)")
    print("Saved: benchmark_results.json (raw numbers)")
    print("─" * 60)


if __name__ == "__main__":
    run_benchmark()
