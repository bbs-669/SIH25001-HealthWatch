from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Village
from ..schemas import VillageResponse, VillageCreate, RiskAnalysisResponse

router = APIRouter(prefix="/villages", tags=["Villages"])


def _enrich_village_with_risk_factors(db: Session, village: Village) -> VillageResponse:
    """Helper to attach Explainable AI risk factors and probability to a village."""
    try:
        from ml_engine.predictor import extract_village_features, get_village_risk_factors
        import math
        extracted = extract_village_features(db, village.code)
        factors = get_village_risk_factors(extracted["features"], extracted["context"], village.risk_score)
        prob = round(1.0 / (1.0 + math.exp(-0.09 * (village.risk_score - 45.0))), 2)
    except Exception:
        factors = ["Risk Telemetry Baseline Active"]
        prob = 0.1

    resp = VillageResponse.model_validate(village)
    resp.risk_factors = factors
    resp.outbreak_probability = prob
    return resp


@router.get("", response_model=List[VillageResponse])
def get_all_villages(db: Session = Depends(get_db)):
    """Fetch all villages with current risk_level, risk_score, and AI risk factors."""
    villages = db.query(Village).order_by(Village.code).all()
    return [_enrich_village_with_risk_factors(db, v) for v in villages]


@router.get("/{village_code}", response_model=VillageResponse)
def get_village_by_code(village_code: str, db: Session = Depends(get_db)):
    """Fetch details of a single village by code (e.g., V101)."""
    village = db.query(Village).filter(Village.code == village_code.upper()).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with code '{village_code}' not found."
        )
    return _enrich_village_with_risk_factors(db, village)


@router.get("/{village_code}/risk-analysis", response_model=RiskAnalysisResponse)
def get_village_risk_analysis(village_code: str, db: Session = Depends(get_db)):
    """
    Explainable AI Outbreak Risk Analysis Endpoint.
    Returns current risk score, outbreak probability, and human-readable AI risk drivers.
    """
    try:
        from ml_engine.predictor import evaluate_village_risk
        analysis = evaluate_village_risk(db, village_code, auto_commit=True)
        return RiskAnalysisResponse(
            village_code=analysis["village_code"],
            village_name=analysis["village_name"],
            district=analysis["district"],
            population=analysis["population"],
            risk_score=analysis["risk_score"],
            risk_level=analysis["risk_level"],
            outbreak_probability=analysis["outbreak_probability"],
            risk_factors=analysis["risk_factors"],
            model_used=analysis.get("model_used"),
            evaluated_at=analysis["evaluated_at"],
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate village risk analysis: {err}"
        )


@router.post("", response_model=VillageResponse, status_code=status.HTTP_201_CREATED)
def create_village(village_in: VillageCreate, db: Session = Depends(get_db)):
    """Register a new village."""
    existing = db.query(Village).filter(Village.code == village_in.code.upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Village with code '{village_in.code}' already exists."
        )
    village = Village(
        code=village_in.code.upper(),
        name=village_in.name,
        district=village_in.district,
        latitude=village_in.latitude,
        longitude=village_in.longitude,
        population=village_in.population,
        risk_level=village_in.risk_level,
        risk_score=village_in.risk_score
    )
    db.add(village)
    db.commit()
    db.refresh(village)
    return _enrich_village_with_risk_factors(db, village)
