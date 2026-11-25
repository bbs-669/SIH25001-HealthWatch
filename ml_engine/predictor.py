"""
Inference & Explainable AI Prediction Module for SIH25001.
Computes village outbreak risk scores, outbreak probability, and human-readable risk drivers.
Includes automatic zero-crash heuristic fallback.
"""
import os
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np

from .features import FEATURE_NAMES, extract_village_features

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outbreak_model.joblib")

_MODEL_CACHE = None
_MODEL_LOAD_ATTEMPTED = False


def _get_model():
    """Lazy-load the trained scikit-learn model artifact."""
    global _MODEL_CACHE, _MODEL_LOAD_ATTEMPTED
    if not _MODEL_LOAD_ATTEMPTED:
        _MODEL_LOAD_ATTEMPTED = True
        if os.path.exists(MODEL_PATH):
            try:
                import joblib
                _MODEL_CACHE = joblib.load(MODEL_PATH)
                print(f"[ML Engine] Loaded outbreak risk model from {MODEL_PATH}")
            except Exception as e:
                print(f"[ML Engine Warning] Failed to load model artifact ({e}). Using heuristic fallback.")
                _MODEL_CACHE = None
        else:
            print("[ML Engine] Model artifact not found yet. Using heuristic fallback.")
            _MODEL_CACHE = None
    return _MODEL_CACHE


def _calculate_heuristic_risk(features: Dict[str, float], context: Dict[str, Any]) -> float:
    """
    Deterministic epidemiological scoring formula tailored to rural Northeast India.
    Used as an automatic fallback when model file has not been trained yet.
    """
    base = 5.0

    # 1. Water contamination impact (up to 45 pts)
    bac_pts = features.get("bacterial_rate", 0.0) * 35.0
    turb = features.get("max_turbidity", 3.0)
    turb_pts = min(25.0, max(0.0, (turb - 4.0) * 1.4))
    ph_pts = min(10.0, features.get("ph_anomaly", 0.0) * 8.0)

    # 2. Symptom surge impact (up to 45 pts)
    d_pts = min(30.0, features.get("diarrhea_per_1k", 0.0) * 4.5)
    v_pts = min(20.0, features.get("vomiting_per_1k", 0.0) * 3.5)
    f_pts = min(15.0, features.get("fever_per_1k", 0.0) * 1.5)
    j_pts = min(25.0, features.get("jaundice_per_1k", 0.0) * 12.0)
    sev_mult = 1.0 + (features.get("severe_ratio", 0.0) * 0.5)

    symptom_total = (d_pts + v_pts + f_pts + j_pts) * sev_mult

    # 3. Community SMS alert impact (up to 15 pts)
    sms_pts = min(15.0, features.get("sms_alerts", 0) * 3.0)

    raw_score = base + bac_pts + turb_pts + ph_pts + symptom_total + sms_pts
    return float(np.clip(raw_score, 1.0, 99.0))


def get_village_risk_factors(features: Dict[str, float], context: Dict[str, Any], risk_score: float) -> List[str]:
    """
    Generates human-readable, explainable AI risk drivers based on clinical and environmental triggers.
    """
    factors = []

    # Water Quality Triggers
    if features.get("bacterial_rate", 0.0) > 0.0:
        factors.append("Bacterial Contamination Detected in Water Supply")

    max_turb = features.get("max_turbidity", 0.0)
    if max_turb >= 15.0:
        factors.append(f"Severe Turbidity Spike ({max_turb:.1f} NTU - {max_turb/5.0:.1f}x WHO Limit)")
    elif max_turb >= 7.0:
        factors.append(f"Elevated Water Turbidity ({max_turb:.1f} NTU)")

    # Symptom Outbreak Triggers
    total_d = context.get("total_diarrhea", 0)
    d_1k = features.get("diarrhea_per_1k", 0.0)
    if total_d >= 3 or d_1k >= 2.0:
        factors.append(f"Acute Diarrhea Surge ({total_d} cases, {d_1k:.1f}/1k)")

    total_v = context.get("total_vomiting", 0)
    v_1k = features.get("vomiting_per_1k", 0.0)
    if total_v >= 2 or v_1k >= 1.0:
        factors.append(f"Vomiting & Dehydration Cluster ({total_v} cases)")

    severe_count = context.get("severe_cases", 0)
    if severe_count >= 2 or features.get("severe_ratio", 0.0) >= 0.35:
        factors.append(f"High Clinical Severity Ratio ({severe_count} severe cases)")

    total_j = context.get("total_jaundice", 0)
    if total_j >= 1:
        factors.append(f"Suspected Hepatitis/Jaundice Alert ({total_j} cases)")

    sms = features.get("sms_alerts", 0)
    if sms >= 1:
        factors.append(f"{sms} Urgent Villager SMS Emergency Alerts Received")

    # Safe baseline fallback
    if not factors or risk_score < 20.0:
        factors = ["Water Quality Parameters Normal & Low Symptom Incidence"]

    return factors


def evaluate_village_risk(db, village_code: str, auto_commit: bool = True) -> Dict[str, Any]:
    """
    Evaluates current risk score and risk level for a village in SQLite.
    Updates the Village record directly and returns comprehensive risk analysis.
    """
    from backend.app.models import Village

    village = db.query(Village).filter(Village.code == village_code.upper()).first()
    if not village:
        raise ValueError(f"Village with code '{village_code}' does not exist.")

    # 1. Extract feature vector
    extracted = extract_village_features(db, village.code)
    features = extracted["features"]
    context = extracted["context"]

    # 2. Run inference
    model = _get_model()
    model_name = "RandomForestRegressor"

    if model is not None:
        try:
            vector = np.array([[features[name] for name in FEATURE_NAMES]], dtype=np.float32)
            predicted_score = float(model.predict(vector)[0])
        except Exception as e:
            print(f"[ML Predictor] Inference error ({e}), using heuristic.")
            predicted_score = _calculate_heuristic_risk(features, context)
            model_name = "HeuristicEngineFallback"
    else:
        predicted_score = _calculate_heuristic_risk(features, context)
        model_name = "HeuristicEngine"

    # Clamp and round score to 1 decimal place
    risk_score = round(float(np.clip(predicted_score, 0.0, 100.0)), 1)

    # 3. Categorize Risk Level
    if risk_score < 20.0:
        risk_level = "GREEN"
    elif risk_score < 50.0:
        risk_level = "YELLOW"
    elif risk_score < 75.0:
        risk_level = "ORANGE"
    else:
        risk_level = "RED"

    # 4. Outbreak Probability (Sigmoid calibrated around risk_score=45)
    # Range: 0.05 (safe) to 0.99 (critical epidemic)
    prob = 1.0 / (1.0 + math.exp(-0.09 * (risk_score - 45.0)))
    outbreak_probability = round(prob, 2)

    # 5. Explainable AI risk factors
    risk_factors = get_village_risk_factors(features, context, risk_score)

    # 6. Update database record
    village.risk_score = risk_score
    village.risk_level = risk_level

    if auto_commit:
        db.commit()
        db.refresh(village)

    return {
        "village_code": village.code,
        "village_name": village.name,
        "district": village.district,
        "population": village.population,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "outbreak_probability": outbreak_probability,
        "risk_factors": risk_factors,
        "features": features,
        "model_used": model_name,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }
