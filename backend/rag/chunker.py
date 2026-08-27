"""
ZFinance — Chunker
====================
Converts a transactions DataFrame into plain-English text chunks
that get embedded and stored for retrieval.
"""

import pandas as pd


def build_financial_chunks(df: pd.DataFrame, week: str) -> list[str]:
    """
    Turn a week's worth of transactions into narratable text chunks.

    Expected columns: date, amount, category (optional), description (optional)
    Positive amount = revenue, negative amount = expense.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

    chunks = []

    # 1. Weekly summary
    revenue = df[df["amount"] > 0]["amount"].sum()
    expenses = df[df["amount"] < 0]["amount"].abs().sum()
    net = revenue - expenses
    margin = (net / revenue * 100) if revenue > 0 else 0

    chunks.append(
        f"Week {week}: Revenue ₹{revenue:,.0f}, Expenses ₹{expenses:,.0f}, "
        f"Net ₹{net:,.0f}, Margin {margin:.1f}%."
    )

    # 2. Per-category breakdown
    if "category" in df.columns:
        for cat, grp in df.groupby("category"):
            cat_rev = grp[grp["amount"] > 0]["amount"].sum()
            cat_exp = grp[grp["amount"] < 0]["amount"].abs().sum()
            cat_net = cat_rev - cat_exp
            chunks.append(
                f"Week {week}, category '{cat}': revenue ₹{cat_rev:,.0f}, "
                f"expenses ₹{cat_exp:,.0f}, net ₹{cat_net:,.0f}."
            )

    # 3. Daily revenue trend
    daily = df[df["amount"] > 0].groupby(df["date"].dt.date)["amount"].sum().reset_index()
    if not daily.empty:
        peak = daily.loc[daily["amount"].idxmax()]
        low = daily.loc[daily["amount"].idxmin()]
        chunks.append(
            f"Week {week} trend: peak day {peak['date']} at ₹{peak['amount']:,.0f}, "
            f"lowest day {low['date']} at ₹{low['amount']:,.0f}, "
            f"average ₹{daily['amount'].mean():,.0f}/day."
        )

    # 4. Top transactions
    top = df.reindex(df["amount"].abs().sort_values(ascending=False).index).head(5)
    for _, row in top.iterrows():
        desc = row.get("description", row.get("category", "transaction"))
        chunks.append(
            f"Week {week} notable transaction: ₹{row['amount']:,.0f} — {desc} "
            f"on {row['date'].date()}."
        )

    return chunks
