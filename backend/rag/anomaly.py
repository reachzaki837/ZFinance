"""
ZFinance — Anomaly Detection
==============================
Z-score based anomaly detection across spending categories.
Compares this week's category totals against historical averages.
"""

import numpy as np


def detect_anomalies(
    current_totals: dict[str, float],
    history: dict[str, list[float]],
    week: str,
    sigma_threshold: float = 2.5,
) -> list[dict]:
    """
    current_totals: { category: net_amount_this_week }
    history:        { category: [net_amount_week1, net_amount_week2, ...] }

    Returns a list of anomaly dicts:
      { category, sigma, direction, is_critical, text }
    """
    anomalies = []

    for category, current_value in current_totals.items():
        past_values = history.get(category, [])
        if len(past_values) < 3:
            continue  # not enough history to judge

        mean = np.mean(past_values)
        std = np.std(past_values)
        if std == 0:
            continue

        sigma = abs(current_value - mean) / std
        if sigma >= sigma_threshold:
            direction = "spike" if current_value > mean else "drop"
            is_critical = sigma >= 3.5

            anomalies.append({
                "category": category,
                "sigma": round(sigma, 2),
                "direction": direction,
                "is_critical": is_critical,
                "text": (
                    f"Week {week}: '{category}' net ₹{current_value:,.0f} is a "
                    f"{direction} — {sigma:.1f} standard deviations from the "
                    f"{len(past_values)}-week average of ₹{mean:,.0f}."
                ),
            })

    return anomalies
