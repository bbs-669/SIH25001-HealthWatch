"""
ML Engine for SIH25001: Real-Time Epidemiological Outbreak Prediction
& Risk Scoring for Rural Northeast India.
"""
from .predictor import evaluate_village_risk, get_village_risk_factors

__all__ = ["evaluate_village_risk", "get_village_risk_factors"]
