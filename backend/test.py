"""
ZFinance — End-to-End Pipeline Test
======================================
Hits the LIVE running server (must already be up on localhost:8000)
and walks through the full flow:

  1. Ingest week 1 (baseline — builds history)
  2. Ingest week 2 (current — has a Marketing spike)
  3. Check anomalies were detected
  4. Generate the AI narrative
  5. Generate the health score
  6. Ask a question

Run:
    # Terminal 1
    uvicorn main:app --reload --port 8000

    # Terminal 2
    python data/generate_sample.py
    python test_step3.py
"""

import requests

BASE_URL    = "http://localhost:8000"
BUSINESS_ID = "test_biz_001"
WEEKS       = ["2026-W08", "2026-W09", "2026-W10", "2026-W11"]   # last one is current
CURRENT_WEEK = WEEKS[-1]


def line(char="─", n=60):
    print(char * n)


def step(n: int, title: str):
    print()
    line("═")
    print(f"  STEP {n}: {title}")
    line("═")


def ingest(csv_path: str, week: str):
    with open(csv_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/api/rag/ingest",
            params={"business_id": BUSINESS_ID, "week": week},
            files={"file": (csv_path, f, "text/csv")},
        )
    if resp.status_code != 200:
        print(f"  Response body: {resp.text}")
    resp.raise_for_status()
    return resp.json()


def call(method, path, **kwargs):
    resp = requests.request(method, f"{BASE_URL}{path}", **kwargs)
    if resp.status_code != 200:
        print(f"  Response body: {resp.text}")
    return resp


def main():
    # ── Health check first ────────────────────────────────────────────────────
    step(0, "Checking server is alive")
    resp = requests.get(f"{BASE_URL}/health")
    resp.raise_for_status()
    print(f"  Server status: {resp.json()}")

    # ── Step 1: Ingest all weeks (3 baseline + 1 current with spike) ──────────
    step(1, "Ingesting 4 weeks of data (3 baseline + 1 with Marketing spike)")
    for i, week in enumerate(WEEKS):
        result = ingest(f"data/week{i}.csv", week)
        tag = " (current)" if week == CURRENT_WEEK else ""
        print(f"  {week}{tag}: {result['chunks_stored']} chunks stored")

    # ── Step 2: Check anomalies ───────────────────────────────────────────────
    step(2, "Checking Anomaly Radar")
    resp = call("GET", f"/api/rag/anomalies/{BUSINESS_ID}/{CURRENT_WEEK}")
    if resp.status_code == 200:
        anomalies = resp.json()
        if anomalies:
            for a in anomalies:
                flag = "CRITICAL" if a["is_critical"] else "warning"
                print(f"  [{flag}] {a['category']} — {a['sigma']}σ")
                print(f"    {a['text']}")
        else:
            print("  No anomalies detected")
    else:
        print(f"  FAILED ({resp.status_code})")

    # ── Step 3: Generate narrative ────────────────────────────────────────────
    step(3, "Generating AI Narrative (calls Groq — needs GROQ_API_KEY set)")
    resp = call("POST", "/api/rag/narrative", json={"business_id": BUSINESS_ID, "week": CURRENT_WEEK})
    if resp.status_code == 200:
        print()
        print(resp.json()["narrative"])
    else:
        print(f"  FAILED ({resp.status_code})")

    # ── Step 4: Generate health score ─────────────────────────────────────────
    step(4, "Generating Health Score")
    resp = call("POST", "/api/rag/health-score", json={"business_id": BUSINESS_ID, "week": CURRENT_WEEK})
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Score: {data.get('score')}/100")
        print(f"  Reason: {data.get('reason')}")
        print(f"  Components: {data.get('components')}")
    else:
        print(f"  FAILED ({resp.status_code})")

    # ── Step 5: Ask a question ────────────────────────────────────────────────
    step(5, "Asking: 'Why did marketing costs rise?'")
    resp = call("POST", "/api/rag/ask", json={
        "business_id": BUSINESS_ID, "question": "Why did marketing costs rise?", "week": CURRENT_WEEK,
    })
    if resp.status_code == 200:
        print()
        print(f"  {resp.json()['answer']}")
    else:
        print(f"  FAILED ({resp.status_code})")

    print()
    line("═")
    print("  TEST COMPLETE")
    line("═")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n  ERROR: Could not connect to server.")
        print("  Make sure uvicorn is running: uvicorn main:app --reload --port 8000\n")