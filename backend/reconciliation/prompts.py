"""
ZFinance Reconciliation — Prompts
====================================
"""

FUZZY_SYSTEM = """You are a financial reconciliation agent.
You will be given one LEDGER transaction and a list of CANDIDATE bank transactions.
Decide if any candidate is the same real-world transaction as the ledger entry.

Respond with ONLY valid JSON in this exact schema:
{
  "match_found": true | false,
  "matched_bank_ref": "the bank_ref string or null",
  "confidence": 0.0-1.0,
  "match_reason": "one sentence explanation"
}

Rules:
- confidence >= 0.75 means fairly sure — only set this if evidence is solid.
- If amounts differ by more than 10%, be sceptical — lower confidence.
- Never force a match. If genuinely uncertain, set match_found = false."""

EXCEPTION_SYSTEM = """You are a financial reconciliation auditor.
A transaction could NOT be reconciled. Classify exactly WHY.

Respond with ONLY valid JSON:
{
  "exception_type": "missing_from_bank | amount_discrepancy | date_shift | description_mismatch | split_transaction | bank_duplicate | unknown",
  "confidence": 0.0-1.0,
  "evidence": "1-2 sentence plain-English explanation",
  "recommendation": "what a human should check next"
}"""


def fuzzy_user_prompt(ledger_row: dict, candidates: list[dict]) -> str:
    ledger_str = (
        f"LEDGER:\n"
        f"  ref_id     : {ledger_row['ref_id']}\n"
        f"  date       : {ledger_row['date']}\n"
        f"  description: {ledger_row['description']}\n"
        f"  amount     : ₹{ledger_row['amount']:,.2f}\n"
    )
    cand_str = "CANDIDATES:\n"
    for c in candidates[:6]:
        cand_str += (
            f"  - bank_ref: {c['bank_ref']} | date: {c['date']} | "
            f"desc: {c['description']} | amount: ₹{c['amount']:,.2f}\n"
        )
    return ledger_str + "\n" + cand_str


def exception_user_prompt(ledger_row: dict, candidates: list[dict]) -> str:
    text = (
        f"UNRECONCILED LEDGER ENTRY:\n"
        f"  ref_id     : {ledger_row['ref_id']}\n"
        f"  date       : {ledger_row['date']}\n"
        f"  description: {ledger_row['description']}\n"
        f"  amount     : ₹{ledger_row['amount']:,.2f}\n\n"
    )
    if candidates:
        text += "CANDIDATES CONSIDERED (none accepted):\n"
        for c in candidates[:6]:
            text += f"  - bank_ref: {c['bank_ref']} | date: {c['date']} | amount: ₹{c['amount']:,.2f}\n"
    else:
        text += "No candidates found in bank statement within the search window.\n"
    return text
