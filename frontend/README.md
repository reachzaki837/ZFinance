# ZFinance — AI Reconciliation Agent
### Razorpay AI Buildathon — Track 04: AI Finance Controller

An agent that closes the multi-source reconciliation loop across 50+ transaction
records, reporting its match rate and every exception it could not resolve — with
honest reasoning for each failure.

---

## What it does

Takes two financial data sources (internal ledger + bank statement CSV) and:

1. **Exact-matches** transactions by amount + date + reference ID (deterministic, fast)
2. **Fuzzy-matches** ambiguous cases using an LLM reasoning layer (Groq / Ollama)
3. **Classifies every failure** with a specific exception type and plain-English evidence
4. **Reports honestly** — match rate, breakdown by exception type, per-record reasoning

### Exception types it handles

| Type | Description |
|---|---|
| `missing_from_bank` | Ledger entry has no bank counterpart |
| `amount_diff` | Same transaction, different amount (fees, rounding) |
| `date_shift` | Settlement delay — appears 1–2 days later in bank |
| `description_mismatch` | Same transaction, truncated/coded bank description |
| `split_transaction` | One ledger entry = two bank entries |
| `duplicate` | Entry appears twice in bank statement |
| `unknown` | Agent could not determine reason (explicitly flagged) |

---

## Architecture

```
ledger.csv  +  bank_statement.csv
           │
           ▼
      Normaliser (dates, amounts, refs)
           │
           ▼
  Stage 1 — Exact match
  (amount ± ₹1, date ± 0 days, ref_id prefix)
           │
     ┌─────┴─────┐
   Matched    Unmatched
                 │
                 ▼
  Stage 2 — LLM fuzzy match (Groq llama3-8b)
  Structured JSON output, confidence threshold 0.75
                 │
           ┌─────┴─────┐
         Matched   Unmatched
                       │
                       ▼
  Stage 3 — Exception handler (LLM classification)
  Type + evidence + recommendation per record
                       │
                       ▼
         Reconciliation Report
         match rate + exception breakdown
```

---

## Setup

```bash
git clone <repo>
cd zfinance-recon
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY
```

Get a free Groq API key at https://console.groq.com (no credit card needed).

---

## Run

```bash
# 1. Generate synthetic dataset (55 ledger rows, deliberate mismatches)
python data/generate.py

# 2. Start the API server
uvicorn api.main:app --reload --port 8000

# 3. Run demo reconciliation via API
curl http://localhost:8000/demo

# 4. Evaluate accuracy against ground truth
python tests/eval.py
```

---

## Sample output

```
════════════════════════════════════════════════════════
  RECONCILIATION REPORT — ZFinance
════════════════════════════════════════════════════════
  Ledger transactions    : 55
  Bank transactions      : 61
  Exact matches          : 31
  Fuzzy matches          : 14
  Exceptions (unresolved): 10
  Unmatched bank entries : 3
  Match rate             : 45/55 (81.8%)
────────────────────────────────────────────────────────
  EXCEPTION BREAKDOWN:
    missing_from_bank         3
    amount_diff               2
    date_shift                2
    description_mismatch      1
    split_unresolved          1
    unknown                   1
────────────────────────────────────────────────────────
  EXCEPTION DETAILS:

  [MISSING_FROM_BANK] TXN00042
    Amount : ₹34,200.00  Date: 2026-07-18
    Evidence: No bank entry found within 6-day window
    matching this amount. Likely pending settlement
    or rejected transfer. Recommend checking with bank.
    Candidates considered: 0
════════════════════════════════════════════════════════
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| Exact matching | Pandas + NumPy |
| Fuzzy pre-filter | RapidFuzz (Levenshtein) |
| LLM reasoning | Groq (llama3-8b-8192) or Ollama (local) |
| Evaluation | Custom precision/recall against ground truth |

---

## Evaluation metrics

The `tests/eval.py` script scores the agent against generated ground truth:

- **Match rate** — percentage of ledger entries successfully reconciled
- **Exception precision** — of everything flagged, how many were real exceptions
- **Exception recall** — of all real exceptions, how many were caught
- **Type classification accuracy** — did the agent correctly identify WHY it failed

---

## Files

```
zfinance-recon/
├── data/
│   ├── generate.py            ← synthetic dataset generator
│   ├── ledger.csv             ← generated ledger (55 rows)
│   ├── bank_statement.csv     ← generated bank statement (61 rows)
│   └── mismatch_ground_truth.csv ← ground truth for eval
├── agent/
│   └── reconciler.py          ← core 3-stage agent
├── api/
│   └── main.py                ← FastAPI endpoints
├── tests/
│   └── eval.py                ← evaluation + honest metrics
├── requirements.txt
└── README.md
```

---

Built by Mohammed Zaki — Razorpay AI Buildathon 2026
