"""
ZFinance — Sample Data Generator
===================================
Creates two weeks of synthetic transaction CSVs:
  week1.csv — baseline week (used as history)
  week2.csv — current week, with a deliberate Marketing spend spike
              so anomaly detection has something real to catch.

Run:
    python data/generate_sample.py
"""

import csv
import random
from datetime import date, timedelta

random.seed(42)

CATEGORIES = {
    "SaaS subscriptions": (60_000, 8_000, True),
    "Consulting fees":    (40_000, 7_000, True),
    "Payroll":            (55_000, 2_000, False),
    "Marketing":          (12_000, 3_000, False),
    "Infrastructure":     (8_000,  1_500, False),
    "Misc income":        (5_000,  2_000, True),
}


def make_week(week_start: date, spike_marketing: bool, seed: int) -> list[dict]:
    rng = random.Random(seed)
    rows = []
    for i in range(7):
        tx_date = week_start + timedelta(days=i)
        for cat, (mean, std, is_revenue) in CATEGORIES.items():
            amt = max(0, rng.gauss(mean / 7, std / 7))
            if cat == "Marketing" and spike_marketing and i == 3:
                amt *= 4.5   # deliberate spike on day 3
            rows.append({
                "date": str(tx_date),
                "amount": round(amt if is_revenue else -amt, 2),
                "category": cat,
                "description": f"{cat} — {tx_date.strftime('%d %b')}",
            })
    return rows


def write_csv(path: str, rows: list[dict]):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "amount", "category", "description"])
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    import os
    os.makedirs("data", exist_ok=True)

    # 3 baseline weeks (needed — anomaly detector requires 3+ historical points)
    # + 1 current week with a deliberate Marketing spike
    starts = [date(2026, 2, 16), date(2026, 2, 23), date(2026, 3, 2), date(2026, 3, 9)]

    for i, start in enumerate(starts):
        is_current = (i == len(starts) - 1)
        rows = make_week(start, spike_marketing=is_current, seed=i + 1)
        write_csv(f"data/week{i}.csv", rows)

    print("Generated:")
    for i in range(len(starts)):
        tag = " (current — Marketing spike on day 3)" if i == len(starts) - 1 else " (baseline)"
        print(f"  data/week{i}.csv{tag}")