"""Bias & fairness monitoring: gender/age vs risk, imbalance alerts."""

from collections import defaultdict

AGE_GROUPS = ["0-17", "18-39", "40-59", "60-79", "80+"]


def _age_group(age: int) -> str:
    if age < 18:
        return "0-17"
    if age < 40:
        return "18-39"
    if age < 60:
        return "40-59"
    if age < 80:
        return "60-79"
    return "80+"


def compute_fairness_metrics(patients: list[dict]) -> dict:
    """
    Returns:
    - gender_risk_matrix: { gender: { risk: count } }
    - age_group_risk_matrix: { age_group: { risk: count } }
    - fairness_metrics: parity ratios, imbalance_alert
    - heatmap_data: for UI heatmap
    """
    if not patients:
        return {
            "gender_risk_matrix": {},
            "age_group_risk_matrix": {},
            "fairness_metrics": {"imbalance_alert": None, "gender_parity": {}, "age_parity": {}},
            "heatmap_data": {"gender": [], "age_group": []},
        }

    gender_risk: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    age_risk: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for p in patients:
        g = p.get("gender", "other")
        r = p.get("risk_level", "low")
        a = _age_group(p.get("age", 0))
        gender_risk[g][r] = gender_risk[g][r] + 1
        age_risk[a][r] = age_risk[a][r] + 1

    # High-risk rate per group
    def high_risk_rate(matrix: dict) -> dict[str, float]:
        rates = {}
        for group, counts in matrix.items():
            total = sum(counts.values())
            high = counts.get("high", 0)
            rates[group] = (high / total * 100) if total else 0
        return rates

    gender_rates = high_risk_rate(gender_risk)
    age_rates = high_risk_rate(age_risk)

    # Imbalance alert: if any group has >2x the average high-risk rate
    all_rates = list(gender_rates.values()) + list(age_rates.values())
    avg_rate = sum(all_rates) / len(all_rates) if all_rates else 0
    imbalance_alert = None
    for g, r in gender_rates.items():
        if avg_rate > 0 and r > avg_rate * 2:
            imbalance_alert = f"Gender '{g}' has high-risk rate {r:.1f}% (avg {avg_rate:.1f}%). Consider reviewing for bias."
            break
    if not imbalance_alert:
        for a, r in age_rates.items():
            if avg_rate > 0 and r > avg_rate * 2:
                imbalance_alert = f"Age group '{a}' has high-risk rate {r:.1f}% (avg {avg_rate:.1f}%). Consider reviewing for bias."
                break

    # Parity: ratio to overall high-risk rate
    overall_high_pct = sum(p.get("risk_level") == "high" for p in patients) / len(patients) * 100 if patients else 0
    gender_parity = {g: (r / overall_high_pct if overall_high_pct else 1) for g, r in gender_rates.items()}
    age_parity = {a: (r / overall_high_pct if overall_high_pct else 1) for a, r in age_rates.items()}

    # Heatmap-friendly: list of { group, low, medium, high }
    heatmap_gender = [
        {"group": g, "low": gender_risk[g].get("low", 0), "medium": gender_risk[g].get("medium", 0), "high": gender_risk[g].get("high", 0)}
        for g in sorted(gender_risk.keys())
    ]
    heatmap_age = [
        {"group": a, "low": age_risk[a].get("low", 0), "medium": age_risk[a].get("medium", 0), "high": age_risk[a].get("high", 0)}
        for a in AGE_GROUPS
        if a in age_risk
    ]

    return {
        "gender_risk_matrix": {k: dict(v) for k, v in gender_risk.items()},
        "age_group_risk_matrix": {k: dict(v) for k, v in age_risk.items()},
        "fairness_metrics": {
            "imbalance_alert": imbalance_alert,
            "gender_parity": gender_parity,
            "age_parity": age_parity,
            "overall_high_risk_pct": round(overall_high_pct, 1),
        },
        "heatmap_data": {"gender": heatmap_gender, "age_group": heatmap_age},
    }
