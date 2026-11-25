"""
Feature extraction from SQLite database models for epidemiological outbreak prediction.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

FEATURE_NAMES = [
    "diarrhea_per_1k",
    "vomiting_per_1k",
    "fever_per_1k",
    "jaundice_per_1k",
    "severe_ratio",
    "avg_turbidity",
    "max_turbidity",
    "bacterial_rate",
    "ph_anomaly",
    "sms_alerts",
]


def extract_village_features(db, village_code: str, lookback_days: int = 14) -> Dict[str, Any]:
    """
    Extracts normalized epidemiological and water quality metrics for a given village.
    Queries Village, SymptomReport, and WaterQualityLog from SQLite.
    """
    from backend.app.models import Village, SymptomReport, WaterQualityLog

    village = db.query(Village).filter(Village.code == village_code.upper()).first()
    if not village:
        raise ValueError(f"Village '{village_code}' does not exist.")

    population = max(village.population or 1000, 100)

    # Time window for active outbreak surveillance
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    # 1. Symptom Reports
    symptom_query = db.query(SymptomReport).filter(
        SymptomReport.village_code == village.code
    )
    symptom_records = symptom_query.all()

    total_diarrhea = 0
    total_vomiting = 0
    total_fever = 0
    total_jaundice = 0
    severe_cases = 0
    total_cases = 0
    sms_alerts = 0

    for rep in symptom_records:
        count = rep.case_count or 1
        total_cases += count
        stype = (rep.symptom_type or "").upper()
        if stype == "DIARRHEA":
            total_diarrhea += count
        elif stype == "VOMITING":
            total_vomiting += count
        elif stype == "FEVER":
            total_fever += count
        elif stype == "JAUNDICE":
            total_jaundice += count

        if (rep.severity or "").upper() == "SEVERE":
            severe_cases += count

        if (rep.reporter_role or "").upper() == "VILLAGER_SMS":
            sms_alerts += 1

    # Per capita rates (per 1,000 residents)
    diarrhea_per_1k = (total_diarrhea / population) * 1000.0
    vomiting_per_1k = (total_vomiting / population) * 1000.0
    fever_per_1k = (total_fever / population) * 1000.0
    jaundice_per_1k = (total_jaundice / population) * 1000.0
    severe_ratio = (severe_cases / total_cases) if total_cases > 0 else 0.0

    # 2. Water Quality Logs
    water_records = db.query(WaterQualityLog).filter(
        WaterQualityLog.village_code == village.code
    ).all()

    if water_records:
        turbidities = [w.turbidity_ntu for w in water_records if w.turbidity_ntu is not None]
        avg_turbidity = sum(turbidities) / len(turbidities) if turbidities else 3.0
        max_turbidity = max(turbidities) if turbidities else 3.0
        bacterial_count = sum(1 for w in water_records if w.bacterial_contaminated)
        bacterial_rate = bacterial_count / len(water_records)
        phs = [w.ph for w in water_records if w.ph is not None]
        avg_ph = sum(phs) / len(phs) if phs else 7.0
        ph_anomaly = abs(avg_ph - 7.0)
    else:
        # Default safe baseline when no water tests yet logged
        avg_turbidity = 3.0
        max_turbidity = 3.0
        bacterial_rate = 0.0
        ph_anomaly = 0.2

    features = {
        "diarrhea_per_1k": round(diarrhea_per_1k, 4),
        "vomiting_per_1k": round(vomiting_per_1k, 4),
        "fever_per_1k": round(fever_per_1k, 4),
        "jaundice_per_1k": round(jaundice_per_1k, 4),
        "severe_ratio": round(severe_ratio, 4),
        "avg_turbidity": round(avg_turbidity, 2),
        "max_turbidity": round(max_turbidity, 2),
        "bacterial_rate": round(bacterial_rate, 4),
        "ph_anomaly": round(ph_anomaly, 3),
        "sms_alerts": sms_alerts,
    }

    # Meta-context useful for human-readable Explainable AI drivers
    context = {
        "village_code": village.code,
        "village_name": village.name,
        "district": village.district,
        "population": population,
        "total_cases": total_cases,
        "total_diarrhea": total_diarrhea,
        "total_vomiting": total_vomiting,
        "total_fever": total_fever,
        "total_jaundice": total_jaundice,
        "severe_cases": severe_cases,
        "water_tests_count": len(water_records),
        "bacterial_positive_count": sum(1 for w in water_records if w.bacterial_contaminated) if water_records else 0,
    }

    return {"features": features, "context": context}
