"""Department load balancing: capacity, load %, smart routing when overloaded."""

from app.department import DEPARTMENTS

# Max capacity per department (configurable)
DEFAULT_CAPACITY = 20
DEPARTMENT_MAX_CAPACITY: dict[str, int] = {
    "General Medicine": 30,
    "Cardiology": 15,
    "Neurology": 12,
    "Emergency": 25,
    "Pulmonology": 15,
}

LOAD_THRESHOLD_PERCENT = 85  # Above this, suggest alternate


def get_department_counts(patients: list[dict]) -> dict[str, int]:
    """Current patient count per recommended department."""
    counts: dict[str, int] = {d: 0 for d in DEPARTMENTS}
    for p in patients:
        d = p.get("recommended_department")
        if d and d in counts:
            counts[d] += 1
    return counts


def get_department_status(patients: list[dict]) -> list[dict]:
    """
    Each department: name, max_capacity, current_patients, load_percentage.
    """
    counts = get_department_counts(patients)
    status = []
    for dept in DEPARTMENTS:
        cap = DEPARTMENT_MAX_CAPACITY.get(dept, DEFAULT_CAPACITY)
        current = counts.get(dept, 0)
        load_pct = round(100 * current / cap, 1) if cap > 0 else 0
        status.append({
            "department": dept,
            "max_capacity": cap,
            "current_patients": current,
            "load_percentage": load_pct,
            "overloaded": load_pct >= LOAD_THRESHOLD_PERCENT,
        })
    return status


def find_alternate_department(
    preferred_dept: str,
    risk_level: str,
    patients: list[dict],
) -> tuple[str | None, str]:
    """
    If preferred department is overloaded (>85%), find alternate with capacity.
    Returns (alternate_department or None, message).
    """
    status = get_department_status(patients)
    preferred_status = next((s for s in status if s["department"] == preferred_dept), None)
    if not preferred_status or preferred_status["load_percentage"] < LOAD_THRESHOLD_PERCENT:
        return None, ""

    # Find departments with capacity (same or lower acuity acceptable)
    available = [s for s in status if s["department"] != preferred_dept and not s["overloaded"]]
    if not available:
        return preferred_dept, f"{preferred_dept} overloaded ({preferred_status['load_percentage']}%). No alternate with capacity; patient remains routed to {preferred_dept}."

    # Prefer critical-capable for high risk: Emergency, Cardiology, Pulmonology, then General Medicine
    critical_depts = ["Emergency", "Cardiology", "Pulmonology", "Neurology", "General Medicine"]
    for d in critical_depts:
        cand = next((s for s in available if s["department"] == d), None)
        if cand:
            msg = f"{preferred_dept} overloaded ({preferred_status['load_percentage']}%). Patient routed to {cand['department']} (available {100 - cand['load_percentage']:.0f}%)."
            return cand["department"], msg
    alt = available[0]
    msg = f"{preferred_dept} overloaded ({preferred_status['load_percentage']}%). Patient routed to {alt['department']} (available {100 - alt['load_percentage']:.0f}%)."
    return alt["department"], msg


def route_with_load_balancing(
    preferred_department: str,
    risk_level: str,
    patients: list[dict],
) -> tuple[str, str]:
    """
    Returns (final_department, routing_message).
    If preferred is overloaded, use alternate; else use preferred.
    """
    alternate, msg = find_alternate_department(preferred_department, risk_level, patients)
    if alternate is None:
        return preferred_department, ""
    return alternate, msg
