"""
ZFinance Reconciliation — Core Agent
======================================
Three-stage pipeline:
  Stage 1 — Exact match    (deterministic, fast)
  Stage 2 — LLM fuzzy match (Groq / Ollama, structured JSON)
  Stage 3 — Exception handler (honest classification + evidence)

Usage:
    from agent.reconciler import ReconciliationAgent
    agent = ReconciliationAgent()
    report = agent.run("data/ledger.csv", "data/bank_statement.csv")
    print(report.summary())
"""

import os
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
from rapidfuzz import fuzz

log = logging.getLogger("recon.agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ── Config ────────────────────────────────────────────────────────────────────

AMOUNT_TOLERANCE  = float(os.getenv("AMOUNT_TOLERANCE",  "1.0"))    # ₹ exact-match window
DATE_TOLERANCE    = int(os.getenv("DATE_TOLERANCE",      "0"))      # days exact-match window
FUZZY_DATE_WINDOW = int(os.getenv("FUZZY_DATE_WINDOW",   "3"))      # days LLM candidate window
FUZZY_AMOUNT_PCT  = float(os.getenv("FUZZY_AMOUNT_PCT",  "5.0"))    # % LLM candidate window
LLM_PROVIDER      = os.getenv("LLM_PROVIDER",  "groq")             # "groq" | "ollama"
LLM_MODEL         = os.getenv("LLM_MODEL",     "llama3-8b-8192")
GROQ_API_KEY      = os.getenv("GROQ_API_KEY",  "")
CONFIDENCE_ACCEPT = float(os.getenv("CONFIDENCE_ACCEPT", "0.75"))   # min score to accept fuzzy

# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class MatchResult:
    ledger_ref:   str
    bank_ref:     str
    match_type:   str          # "exact" | "fuzzy" | "exception"
    confidence:   float        # 0.0 – 1.0
    amount_diff:  float        # 0 if exact
    date_diff:    int          # days
    notes:        str = ""

@dataclass
class ExceptionRecord:
    ledger_ref:      str
    ledger_amount:   float
    ledger_date:     str
    ledger_desc:     str
    exception_type:  str       # missing_from_bank | amount_diff | date_diff |
                               # ref_mismatch | duplicate | split | unknown
    evidence:        str       # plain-English explanation
    candidates:      list      # bank rows that were considered
    confidence:      float     # how confident we are in the classification

@dataclass
class ReconciliationReport:
    total_ledger:    int
    total_bank:      int
    exact_matches:   list[MatchResult]   = field(default_factory=list)
    fuzzy_matches:   list[MatchResult]   = field(default_factory=list)
    exceptions:      list[ExceptionRecord] = field(default_factory=list)
    unmatched_bank:  list[dict]          = field(default_factory=list)

    def match_rate(self) -> float:
        matched = len(self.exact_matches) + len(self.fuzzy_matches)
        return matched / self.total_ledger if self.total_ledger else 0.0

    def summary(self) -> str:
        matched = len(self.exact_matches) + len(self.fuzzy_matches)
        lines = [
            "═" * 56,
            "  RECONCILIATION REPORT — ZFinance",
            "═" * 56,
            f"  Ledger transactions   : {self.total_ledger}",
            f"  Bank transactions     : {self.total_bank}",
            f"  Exact matches         : {len(self.exact_matches)}",
            f"  Fuzzy matches         : {len(self.fuzzy_matches)}",
            f"  Exceptions (unresolved): {len(self.exceptions)}",
            f"  Unmatched bank entries : {len(self.unmatched_bank)}",
            f"  Match rate            : {matched}/{self.total_ledger} "
              f"({self.match_rate()*100:.1f}%)",
            "─" * 56,
        ]
        if self.exceptions:
            lines.append("  EXCEPTION BREAKDOWN:")
            by_type: dict[str, int] = {}
            for e in self.exceptions:
                by_type[e.exception_type] = by_type.get(e.exception_type, 0) + 1
            for t, n in sorted(by_type.items()):
                lines.append(f"    {t:<25} {n}")
            lines.append("─" * 56)
            lines.append("  EXCEPTION DETAILS:")
            for e in self.exceptions:
                lines.append(f"\n  [{e.exception_type.upper()}] {e.ledger_ref}")
                lines.append(f"    Amount : ₹{e.ledger_amount:,.2f}  Date: {e.ledger_date}")
                lines.append(f"    Evidence: {e.evidence}")
                if e.candidates:
                    lines.append(f"    Candidates considered: {len(e.candidates)}")
        lines.append("═" * 56)
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "summary": {
                "total_ledger":   self.total_ledger,
                "total_bank":     self.total_bank,
                "exact_matches":  len(self.exact_matches),
                "fuzzy_matches":  len(self.fuzzy_matches),
                "exceptions":     len(self.exceptions),
                "unmatched_bank": len(self.unmatched_bank),
                "match_rate":     round(self.match_rate(), 4),
            },
            "exact_matches":  [asdict(m) for m in self.exact_matches],
            "fuzzy_matches":  [asdict(m) for m in self.fuzzy_matches],
            "exceptions":     [asdict(e) for e in self.exceptions],
            "unmatched_bank": self.unmatched_bank,
        }


# ── Normaliser ────────────────────────────────────────────────────────────────

def _normalise_ledger(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"]   = pd.to_datetime(df["date"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0).abs()
    df["ref_id"] = df["ref_id"].astype(str).str.strip().str.upper()
    df["description"] = df["description"].astype(str).str.strip().str.lower()
    return df

def _normalise_bank(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"]     = pd.to_datetime(df["date"])
    df["amount"]   = pd.to_numeric(df["debit"], errors="coerce").fillna(0).abs()
    df["bank_ref"] = df["bank_ref"].astype(str).str.strip().str.upper()
    df["description"] = df["description"].astype(str).str.strip().str.lower()
    return df


# ── LLM caller ───────────────────────────────────────────────────────────────

FUZZY_SYSTEM = """You are a financial reconciliation agent.
You will be given one LEDGER transaction and a list of CANDIDATE bank transactions.
Your job is to decide if any candidate is the same real-world transaction as the ledger entry.

Respond with ONLY valid JSON in this exact schema:
{
  "match_found": true | false,
  "matched_bank_ref": "TXNXXXXX or null",
  "confidence": 0.0-1.0,
  "match_reason": "one sentence explanation",
  "exception_type": "null | amount_diff | date_shift | description_mismatch | split_transaction | ref_mismatch",
  "evidence": "what specifically led to this conclusion"
}

Rules:
- confidence >= 0.75 means you are fairly sure. Only set this if evidence is solid.
- If amounts differ by more than 10%, be sceptical — set confidence lower.
- A split transaction means the ledger amount equals the SUM of two candidates.
- Never force a match. If genuinely uncertain, set match_found = false.
- exception_type is only filled when match_found = false."""

EXCEPTION_SYSTEM = """You are a financial reconciliation auditor.
A transaction could NOT be reconciled. Classify exactly WHY.

Respond with ONLY valid JSON:
{
  "exception_type": "missing_from_bank | amount_diff | date_shift | ref_mismatch | duplicate | split_unresolved | unknown",
  "confidence": 0.0-1.0,
  "evidence": "1-2 sentence plain-English explanation of why this could not be matched",
  "recommendation": "what a human auditor should check next"
}"""

def _call_llm(system: str, user: str) -> str:
    if LLM_PROVIDER == "groq":
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.0,        # deterministic for reconciliation
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    else:
        import ollama
        resp = ollama.chat(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            options={"temperature": 0.0},
            format="json",
        )
        return resp["message"]["content"]

def _safe_json(raw: str) -> dict:
    try:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        log.warning("JSON parse failed: %s | raw: %s", e, raw[:120])
        return {}


# ── Main agent ────────────────────────────────────────────────────────────────

class ReconciliationAgent:

    def run(self, ledger_path: str, bank_path: str) -> ReconciliationReport:
        ledger = _normalise_ledger(pd.read_csv(ledger_path))
        bank   = _normalise_bank(pd.read_csv(bank_path))

        report = ReconciliationReport(
            total_ledger = len(ledger),
            total_bank   = len(bank),
        )

        matched_bank_refs: set[str] = set()

        # ── Stage 1: Exact match ──────────────────────────────────────────────
        log.info("Stage 1 — Exact match (%d ledger rows)", len(ledger))
        unmatched_ledger_indices: list[int] = []

        for i, lrow in ledger.iterrows():
            match = self._exact_match(lrow, bank, matched_bank_refs)
            if match:
                matched_bank_refs.add(match.bank_ref)
                report.exact_matches.append(match)
                log.debug("EXACT %s → %s", lrow["ref_id"], match.bank_ref)
            else:
                unmatched_ledger_indices.append(i)

        log.info("Stage 1 done — %d exact, %d to fuzzy",
                 len(report.exact_matches), len(unmatched_ledger_indices))

        # ── Stage 2: LLM fuzzy match ──────────────────────────────────────────
        log.info("Stage 2 — LLM fuzzy match (%d rows)", len(unmatched_ledger_indices))
        still_unmatched: list[int] = []

        for i in unmatched_ledger_indices:
            lrow       = ledger.loc[i]
            candidates = self._get_candidates(lrow, bank, matched_bank_refs)
            if not candidates:
                still_unmatched.append(i)
                continue

            result = self._llm_fuzzy_match(lrow, candidates)
            if result and result.confidence >= CONFIDENCE_ACCEPT:
                matched_bank_refs.add(result.bank_ref)
                report.fuzzy_matches.append(result)
                log.debug("FUZZY %s → %s (%.2f)", lrow["ref_id"], result.bank_ref, result.confidence)
            else:
                still_unmatched.append(i)

        log.info("Stage 2 done — %d fuzzy, %d to exception handler",
                 len(report.fuzzy_matches), len(still_unmatched))

        # ── Stage 3: Exception handler ────────────────────────────────────────
        log.info("Stage 3 — Exception handler (%d rows)", len(still_unmatched))

        for i in still_unmatched:
            lrow      = ledger.loc[i]
            candidates = self._get_candidates(
                lrow, bank, matched_bank_refs, wider=True
            )
            exc = self._classify_exception(lrow, candidates)
            report.exceptions.append(exc)
            log.info("EXCEPTION %s → %s (%.2f conf)",
                     lrow["ref_id"], exc.exception_type, exc.confidence)

        # Unmatched bank entries (bank has it, ledger doesn't)
        report.unmatched_bank = bank[
            ~bank["bank_ref"].isin(matched_bank_refs)
        ][["bank_ref", "date", "description", "amount"]].to_dict("records")

        log.info("Reconciliation complete — match rate %.1f%%",
                 report.match_rate() * 100)
        return report

    # ── Stage 1 helpers ───────────────────────────────────────────────────────

    def _exact_match(
        self,
        lrow: pd.Series,
        bank: pd.DataFrame,
        used: set[str],
    ) -> Optional[MatchResult]:
        mask = (
            (~bank["bank_ref"].isin(used)) &
            (bank["amount"].between(
                lrow["amount"] - AMOUNT_TOLERANCE,
                lrow["amount"] + AMOUNT_TOLERANCE,
            )) &
            (bank["date"].between(
                lrow["date"] - timedelta(days=DATE_TOLERANCE),
                lrow["date"] + timedelta(days=DATE_TOLERANCE),
            ))
        )
        candidates = bank[mask]

        # prefer ref_id match
        ref_match = candidates[
            candidates["bank_ref"].str.startswith(lrow["ref_id"])
        ]
        chosen = ref_match.iloc[0] if not ref_match.empty else (
            candidates.iloc[0] if not candidates.empty else None
        )
        if chosen is None:
            return None

        return MatchResult(
            ledger_ref  = lrow["ref_id"],
            bank_ref    = chosen["bank_ref"],
            match_type  = "exact",
            confidence  = 1.0,
            amount_diff = round(abs(lrow["amount"] - chosen["amount"]), 2),
            date_diff   = abs((lrow["date"] - chosen["date"]).days),
        )

    # ── Stage 2 helpers ───────────────────────────────────────────────────────

    def _get_candidates(
        self,
        lrow: pd.Series,
        bank: pd.DataFrame,
        used: set[str],
        wider: bool = False,
    ) -> list[dict]:
        date_window   = FUZZY_DATE_WINDOW * (2 if wider else 1)
        amount_pct    = FUZZY_AMOUNT_PCT  * (2 if wider else 1)
        amount_buffer = lrow["amount"] * amount_pct / 100

        mask = (
            (~bank["bank_ref"].isin(used)) &
            (bank["amount"].between(
                lrow["amount"] - amount_buffer,
                lrow["amount"] + amount_buffer,
            )) &
            (bank["date"].between(
                lrow["date"] - timedelta(days=date_window),
                lrow["date"] + timedelta(days=date_window),
            ))
        )
        rows = bank[mask][["bank_ref","date","description","amount"]]

        # also surface description fuzzy matches (even if amount is off)
        desc_mask = (
            (~bank["bank_ref"].isin(used)) &
            (bank["description"].apply(
                lambda d: fuzz.partial_ratio(lrow["description"], d) > 70
            ))
        )
        desc_rows = bank[desc_mask][["bank_ref","date","description","amount"]]

        combined = pd.concat([rows, desc_rows]).drop_duplicates("bank_ref")
        return combined.to_dict("records")

    def _llm_fuzzy_match(
        self,
        lrow: pd.Series,
        candidates: list[dict],
    ) -> Optional[MatchResult]:
        ledger_str = (
            f"LEDGER:\n"
            f"  ref_id     : {lrow['ref_id']}\n"
            f"  date       : {lrow['date'].date()}\n"
            f"  description: {lrow['description']}\n"
            f"  amount     : ₹{lrow['amount']:,.2f}\n"
        )
        cand_str = "CANDIDATES:\n"
        for c in candidates[:6]:   # cap at 6 to stay within token limit
            cand_str += (
                f"  - bank_ref: {c['bank_ref']} | "
                f"date: {str(c['date'])[:10]} | "
                f"desc: {c['description']} | "
                f"amount: ₹{c['amount']:,.2f}\n"
            )

        raw  = _call_llm(FUZZY_SYSTEM, ledger_str + "\n" + cand_str)
        data = _safe_json(raw)

        if not data.get("match_found"):
            return None

        bank_ref = data.get("matched_bank_ref", "")
        matched  = next((c for c in candidates if c["bank_ref"] == bank_ref), None)
        if not matched:
            return None

        return MatchResult(
            ledger_ref  = lrow["ref_id"],
            bank_ref    = bank_ref,
            match_type  = "fuzzy",
            confidence  = float(data.get("confidence", 0.0)),
            amount_diff = round(abs(lrow["amount"] - matched["amount"]), 2),
            date_diff   = abs((lrow["date"] - pd.Timestamp(matched["date"])).days),
            notes       = data.get("match_reason", ""),
        )

    # ── Stage 3 helpers ───────────────────────────────────────────────────────

    def _classify_exception(
        self,
        lrow: pd.Series,
        candidates: list[dict],
    ) -> ExceptionRecord:
        ledger_str = (
            f"UNRECONCILED LEDGER ENTRY:\n"
            f"  ref_id     : {lrow['ref_id']}\n"
            f"  date       : {lrow['date'].date()}\n"
            f"  description: {lrow['description']}\n"
            f"  amount     : ₹{lrow['amount']:,.2f}\n\n"
            f"CANDIDATES CONSIDERED (none were accepted):\n"
        )
        for c in candidates[:6]:
            ledger_str += (
                f"  - bank_ref: {c['bank_ref']} | "
                f"date: {str(c['date'])[:10]} | "
                f"amount: ₹{c['amount']:,.2f}\n"
            )
        if not candidates:
            ledger_str += "  (no candidates found in bank statement)\n"

        raw  = _call_llm(EXCEPTION_SYSTEM, ledger_str)
        data = _safe_json(raw)

        return ExceptionRecord(
            ledger_ref     = lrow["ref_id"],
            ledger_amount  = lrow["amount"],
            ledger_date    = str(lrow["date"].date()),
            ledger_desc    = lrow["description"],
            exception_type = data.get("exception_type", "unknown"),
            evidence       = data.get("evidence", "LLM did not return evidence."),
            candidates     = [c["bank_ref"] for c in candidates],
            confidence     = float(data.get("confidence", 0.0)),
        )
