from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Village
from ..schemas import VillageResponse, VillageCreate

router = APIRouter(prefix="/villages", tags=["Villages"])


@router.get("", response_model=List[VillageResponse])
def get_all_villages(db: Session = Depends(get_db)):
    """Fetch all villages with current risk_level and risk_score."""
    return db.query(Village).order_by(Village.code).all()


@router.get("/{village_code}", response_model=VillageResponse)
def get_village_by_code(village_code: str, db: Session = Depends(get_db)):
    """Fetch details of a single village by code (e.g., V101)."""
    village = db.query(Village).filter(Village.code == village_code.upper()).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with code '{village_code}' not found."
        )
    return village


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
    return village
