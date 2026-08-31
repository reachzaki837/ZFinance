"""
ZFinance Reconciliation — Engine
===================================
Three-stage pipeline: exact match -> LLM fuzzy match -> exception classification.
"""

import logging
import time
import pandas as pd

from reconciliation.matcher import normalise_ledger, normalise_bank, exact_match
from reconciliation.fuzzy import get_candidates, llm_fuzzy_match, classify_exception

log = logging.getLogger("zfinance.reconciliation")

# Small pacing delay between LLM calls in Stages 2/3. Groq's free tier caps
# tokens/minute — spacing calls out avoids bursting into that limit on
# larger datasets, at the cost of a few extra seconds of total runtime.
LLM_CALL_DELAY_SECONDS = 0.5


class ReconciliationEngine:

    def run(self, ledger_df: pd.DataFrame, bank_df: pd.DataFrame) -> dict:
        ledger = normalise_ledger(ledger_df)
        bank = normalise_bank(bank_df)

        used_bank_indices: set = set()
        exact_matches: list[dict] = []
        fuzzy_matches: list[dict] = []
        exceptions: list[dict] = []

        # Stage 1 — exact match
        unmatched_indices = []
        for i, row in ledger.iterrows():
            match = exact_match(row, bank, used_bank_indices)
            if match:
                used_bank_indices.add(match["bank_index"])
                exact_matches.append(match)
            else:
                unmatched_indices.append(i)

        log.info("Stage 1 (exact): %d matched, %d to fuzzy", len(exact_matches), len(unmatched_indices))

        # Stage 2 — LLM fuzzy match
        still_unmatched = []
        for i in unmatched_indices:
            row = ledger.loc[i]
            candidates = get_candidates(row, bank, used_bank_indices)
            match = llm_fuzzy_match(row, candidates)
            if match and match["confidence"] >= 0.75:
                used_bank_indices.add(match["bank_index"])
                fuzzy_matches.append(match)
            else:
                still_unmatched.append(i)
            time.sleep(LLM_CALL_DELAY_SECONDS)

        log.info("Stage 2 (fuzzy): %d matched, %d to exceptions", len(fuzzy_matches), len(still_unmatched))

        # Stage 3 — exception classification
        for i in still_unmatched:
            row = ledger.loc[i]
            candidates = get_candidates(row, bank, used_bank_indices, wider=True)
            exc = classify_exception(row, candidates)
            exceptions.append(exc)
            time.sleep(LLM_CALL_DELAY_SECONDS)

        log.info("Stage 3 (exceptions): %d classified", len(exceptions))

        unmatched_bank = bank[~bank.index.isin(used_bank_indices)][
            ["bank_ref", "date", "description", "amount"]
        ].copy()
        unmatched_bank["date"] = unmatched_bank["date"].astype(str).str[:10]

        total_ledger = len(ledger)
        matched = len(exact_matches) + len(fuzzy_matches)
        match_rate = matched / total_ledger if total_ledger else 0

        return {
            "summary": {
                "total_ledger": total_ledger,
                "total_bank": len(bank),
                "exact_matches": len(exact_matches),
                "fuzzy_matches": len(fuzzy_matches),
                "exceptions": len(exceptions),
                "unmatched_bank": len(unmatched_bank),
                "match_rate": round(match_rate, 4),
            },
            "exact_matches": exact_matches,
            "fuzzy_matches": fuzzy_matches,
            "exceptions": exceptions,
            "unmatched_bank": unmatched_bank.to_dict("records"),
        }