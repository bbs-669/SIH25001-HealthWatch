from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Village
from ..schemas import RecalculateAllResponse

router = APIRouter(prefix="/ml", tags=["ML & Outbreak Risk"])


@router.post("/recalculate-all", response_model=RecalculateAllResponse)
def recalculate_all_village_risks(db: Session = Depends(get_db)):
    """
    Triggers on-demand batch epidemiological recalculation for all villages
    using the scikit-learn outbreak prediction model.
    """
    try:
        from ml_engine.predictor import evaluate_village_risk

        villages = db.query(Village).all()
        summary = {"GREEN": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
        details = []

        for v in villages:
            res = evaluate_village_risk(db, v.code, auto_commit=False)
            level = res["risk_level"]
            summary[level] = summary.get(level, 0) + 1
            details.append({
                "code": v.code,
                "name": v.name,
                "risk_score": res["risk_score"],
                "risk_level": level,
                "factors_count": len(res["risk_factors"]),
            })

        db.commit()

        return RecalculateAllResponse(
            status="success",
            villages_updated=len(villages),
            summary={
                "distribution": summary,
                "total_villages": len(villages),
                "high_risk_alerts": summary.get("ORANGE", 0) + summary.get("RED", 0),
            },
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate village risks: {e}"
        )


@router.get("/status")
def get_ml_engine_status():
    """Returns runtime status of the ML outbreak model and feature definitions."""
    from ml_engine.features import FEATURE_NAMES
    from ml_engine.predictor import MODEL_PATH, _get_model

    model = _get_model()
    return {
        "engine": "SIH25001 Outbreak Predictor",
        "model_loaded": model is not None,
        "model_type": str(type(model).__name__) if model else "HeuristicFallback",
        "model_path": MODEL_PATH,
        "features": FEATURE_NAMES,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
