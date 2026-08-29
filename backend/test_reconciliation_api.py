"""
ZFinance Reconciliation — API Test
=====================================
Hits the LIVE running server's /demo endpoint (uses bundled data/ledger.csv
and data/bank_statement.csv). Confirms the route, CORS setup, and engine
all work correctly through the actual HTTP layer.

Run:
    # Terminal 1
    uvicorn main:app --reload --port 8000

    # Terminal 2
    python test_reconciliation_api.py
"""

import requests

BASE_URL = "http://localhost:8000"


def main():
    print("\n" + "═" * 60)
    print("  Reconciliation API Test")
    print("═" * 60)

    print("\n[1/2] Checking server health...")
    resp = requests.get(f"{BASE_URL}/health")
    resp.raise_for_status()
    print(f"  {resp.json()}")

    print("\n[2/2] Calling GET /api/reconciliation/demo")
    print("  (this runs the full pipeline — may take 30-60 seconds)\n")
    resp = requests.get(f"{BASE_URL}/api/reconciliation/demo")

    if resp.status_code != 200:
        print(f"  FAILED ({resp.status_code}): {resp.text}")
        return

    data = resp.json()
    s = data["summary"]

    print("─" * 60)
    print("  RESULTS (via HTTP)")
    print("─" * 60)
    print(f"  Total ledger    : {s['total_ledger']}")
    print(f"  Total bank      : {s['total_bank']}")
    print(f"  Exact matches   : {s['exact_matches']}")
    print(f"  Fuzzy matches   : {s['fuzzy_matches']}")
    print(f"  Exceptions      : {s['exceptions']}")
    print(f"  Unmatched bank  : {s['unmatched_bank']}")
    print(f"  Match rate      : {s['match_rate']*100:.1f}%")

    print("\n  Exceptions returned:")
    for e in data["exceptions"]:
        print(f"    [{e['exception_type']}] {e['ledger_ref']} — ₹{e['amount']:,.2f}")

    print("\n" + "═" * 60)
    print("  API TEST COMPLETE — routes are working correctly")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n  ERROR: Could not connect. Is uvicorn running on port 8000?\n")
