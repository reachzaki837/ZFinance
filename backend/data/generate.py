"""
ZFinance Reconciliation — Synthetic Data Generator
====================================================
Generates two CSVs (ledger + bank statement) with deliberate mismatches:

  - Clean matches       (~60%)  exact amount + date + ref
  - Amount discrepancy  (~10%)  ₹0.01–₹500 difference (fees, rounding)
  - Date shift          (~8%)   1–2 day settlement delay
  - Description mismatch(~7%)   same transaction, different description text
  - Split transactions  (~5%)   one ledger entry = two bank entries
  - Missing from bank   (~5%)   ledger entry has no bank counterpart
  - Duplicates          (~5%)   same entry appears twice in bank statement

Run:
    python data/generate.py
    → outputs data/ledger.csv and data/bank_statement.csv
"""

import csv
import random
import hashlib
from datetime import date, timedelta
from dataclasses import dataclass, field, asdict

random.seed(42)

# ── Config ───────────────────────────────────────────────────────────────────

START_DATE   = date(2026, 7, 1)
NUM_CLEAN    = 31   # clean exact matches
TOTAL_TARGET = 55   # total ledger rows (bank will be similar ± splits/missing)

VENDORS = [
    "AWS India Pvt Ltd", "Google Cloud India", "Razorpay Software",
    "Zoho Corporation", "Freshworks Inc", "Slack Technologies",
    "Notion Labs", "Figma Inc", "GitHub Inc", "Canva Pty Ltd",
    "Swiggy Business", "Urban Company", "Dunzo Enterprise",
    "IndiaMart InterMESH", "Shopify India", "Mailchimp / Intuit",
    "Twilio India", "SendGrid", "Cloudflare Inc", "Stripe India",
]

CATEGORIES = [
    "SaaS subscription", "Cloud infrastructure", "Payment processing",
    "Marketing tools", "Office supplies", "Contract labour",
    "Logistics", "Legal fees", "Accounting", "IT hardware",
]

def _ref_id(n: int) -> str:
    return f"TXN{str(n).zfill(5)}"

def _amount() -> float:
    return round(random.uniform(500, 85_000), 2)

def _date_str(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def _slight_amount(amt: float) -> float:
    """Add small discrepancy simulating bank fees or rounding."""
    delta = round(random.uniform(0.5, 499.99), 2)
    return round(amt + random.choice([-1, 1]) * delta, 2)

def _mangle_description(desc: str) -> str:
    """Simulate bank's truncated / coded description."""
    transforms = [
        lambda s: s.upper()[:20],
        lambda s: s.replace(" ", "_")[:18],
        lambda s: s.split()[0] + " ***" + s[-4:],
        lambda s: "NEFT/" + s[:12].upper(),
        lambda s: s[:10] + "/IMPS/" + str(random.randint(1000, 9999)),
    ]
    return random.choice(transforms)(desc)


@dataclass
class LedgerRow:
    ref_id:      str
    date:        str
    vendor:      str
    description: str
    category:    str
    amount:      float
    currency:    str = "INR"

@dataclass
class BankRow:
    bank_ref:    str
    date:        str
    description: str
    debit:       float
    credit:      float
    balance:     float = 0.0
    currency:    str   = "INR"


def generate():
    ledger_rows: list[LedgerRow] = []
    bank_rows:   list[BankRow]   = []
    mismatch_log = []

    balance = 500_000.0
    idx = 1

    def add_bank(ref, dt, desc, amount, note=""):
        nonlocal balance
        balance = round(balance - amount, 2)
        bank_rows.append(BankRow(
            bank_ref    = ref,
            date        = _date_str(dt),
            description = desc,
            debit       = amount if amount > 0 else 0,
            credit      = 0,
            balance     = balance,
        ))
        if note:
            mismatch_log.append({"ledger_ref": ref, "type": note})

    # ── 1. Clean exact matches ────────────────────────────────────────────────
    for _ in range(NUM_CLEAN):
        ref  = _ref_id(idx)
        amt  = _amount()
        dt   = START_DATE + timedelta(days=random.randint(0, 25))
        vend = random.choice(VENDORS)
        desc = f"{vend} - {random.choice(CATEGORIES)}"
        cat  = random.choice(CATEGORIES)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref, dt, desc, amt)
        idx += 1

    # ── 2. Amount discrepancy (~10%) ──────────────────────────────────────────
    for _ in range(6):
        ref  = _ref_id(idx)
        amt  = _amount()
        dt   = START_DATE + timedelta(days=random.randint(0, 25))
        vend = random.choice(VENDORS)
        desc = f"{vend} - {random.choice(CATEGORIES)}"
        cat  = random.choice(CATEGORIES)
        bank_amt = _slight_amount(amt)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref, dt, desc, bank_amt, note="amount_discrepancy")
        idx += 1

    # ── 3. Date shift (settlement delay) ─────────────────────────────────────
    for _ in range(5):
        ref    = _ref_id(idx)
        amt    = _amount()
        dt     = START_DATE + timedelta(days=random.randint(0, 23))
        shift  = timedelta(days=random.randint(1, 2))
        vend   = random.choice(VENDORS)
        desc   = f"{vend} - {random.choice(CATEGORIES)}"
        cat    = random.choice(CATEGORIES)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref, dt + shift, desc, amt, note="date_shift")
        idx += 1

    # ── 4. Description mismatch ───────────────────────────────────────────────
    for _ in range(4):
        ref  = _ref_id(idx)
        amt  = _amount()
        dt   = START_DATE + timedelta(days=random.randint(0, 25))
        vend = random.choice(VENDORS)
        desc = f"{vend} - {random.choice(CATEGORIES)}"
        cat  = random.choice(CATEGORIES)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref, dt, _mangle_description(desc), amt, note="description_mismatch")
        idx += 1

    # ── 5. Split transactions (1 ledger → 2 bank entries) ────────────────────
    for _ in range(3):
        ref   = _ref_id(idx)
        amt   = _amount()
        dt    = START_DATE + timedelta(days=random.randint(0, 24))
        vend  = random.choice(VENDORS)
        desc  = f"{vend} - {random.choice(CATEGORIES)}"
        cat   = random.choice(CATEGORIES)
        split = round(amt * random.uniform(0.3, 0.7), 2)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref + "-A", dt,                     desc + " (part 1)", split,          note="split_transaction")
        add_bank(ref + "-B", dt + timedelta(days=1), desc + " (part 2)", round(amt - split, 2))
        idx += 1

    # ── 6. Missing from bank ─────────────────────────────────────────────────
    for _ in range(3):
        ref  = _ref_id(idx)
        amt  = _amount()
        dt   = START_DATE + timedelta(days=random.randint(0, 25))
        vend = random.choice(VENDORS)
        desc = f"{vend} - {random.choice(CATEGORIES)}"
        cat  = random.choice(CATEGORIES)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        # deliberately NOT adding a bank row
        mismatch_log.append({"ledger_ref": ref, "type": "missing_from_bank"})
        idx += 1

    # ── 7. Duplicate in bank statement ───────────────────────────────────────
    for _ in range(3):
        ref  = _ref_id(idx)
        amt  = _amount()
        dt   = START_DATE + timedelta(days=random.randint(0, 24))
        vend = random.choice(VENDORS)
        desc = f"{vend} - {random.choice(CATEGORIES)}"
        cat  = random.choice(CATEGORIES)

        ledger_rows.append(LedgerRow(ref, _date_str(dt), vend, desc, cat, amt))
        add_bank(ref, dt, desc, amt)
        add_bank(ref, dt + timedelta(days=1), desc + " (DUP)", amt, note="bank_duplicate")
        idx += 1

    # ── Write CSVs ────────────────────────────────────────────────────────────
    ledger_path = "data/ledger.csv"
    bank_path   = "data/bank_statement.csv"
    log_path    = "data/mismatch_ground_truth.csv"

    with open(ledger_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ref_id","date","vendor",
                                          "description","category","amount","currency"])
        w.writeheader()
        for r in ledger_rows:
            w.writerow(asdict(r))

    with open(bank_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["bank_ref","date","description",
                                          "debit","credit","balance","currency"])
        w.writeheader()
        # shuffle bank rows to make it realistic
        random.shuffle(bank_rows)
        for r in bank_rows:
            w.writerow(asdict(r))

    with open(log_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ledger_ref","type"])
        w.writeheader()
        w.writerows(mismatch_log)

    print(f"Ledger rows     : {len(ledger_rows)}")
    print(f"Bank rows       : {len(bank_rows)}")
    print(f"Mismatch types  : {set(m['type'] for m in mismatch_log)}")
    print(f"\nFiles written:")
    print(f"  {ledger_path}")
    print(f"  {bank_path}")
    print(f"  {log_path}  ← ground truth for eval")


if __name__ == "__main__":
    generate()
