## Evaluation Results

Benchmarked against a 55-record synthetic dataset with 24 labeled ground-truth
mismatches across 6 categories (amount discrepancy, date shift, description
mismatch, split transaction, missing from bank, duplicate payment).

| Metric | Result |
|---|---:|
| Records | 55 |
| Exact matches (deterministic) | 38 |
| AI-assisted (fuzzy) matches | 11 |
| Unresolved (flagged for human review) | 6 |
| Match rate | 89.1% |
| Precision (needs-review detection) | 100.0% |
| Recall (needs-review detection) | 100.0% |
| Exception classification accuracy | 100.0% |
| Auto-resolution accuracy | 100.0% |
| Duplicate detection accuracy | 100.0% |
| Runtime (full dataset) | 39.8s |

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

No false positives or false negatives on this benchmark run.
