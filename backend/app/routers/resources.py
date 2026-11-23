from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ResourceInventory, Village
from ..schemas import (
    ResourceInventoryResponse,
    ResourceDispatchRequest,
    ResourceDispatchResponse,
)

router = APIRouter(prefix="/resources", tags=["Resources & PHC Supply"])


@router.get("", response_model=List[ResourceInventoryResponse])
def get_all_resources(db: Session = Depends(get_db)):
    """List inventory of medical resources across all Primary Health Centres (PHCs)."""
    return db.query(ResourceInventory).order_by(ResourceInventory.id).all()


@router.post("/dispatch", response_model=ResourceDispatchResponse)
def dispatch_resources(
    dispatch_in: ResourceDispatchRequest,
    db: Session = Depends(get_db)
):
    """
    Deducts ORS, chlorine tablets, or test kit stock when a district official
    approves an emergency dispatch to an affected village.
    """
    # 1. Verify PHC existence
    phc = db.query(ResourceInventory).filter(
        ResourceInventory.id == dispatch_in.phc_id
    ).first()

    if not phc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PHC with id '{dispatch_in.phc_id}' not found."
        )

    # 2. Verify target village existence
    village = db.query(Village).filter(
        Village.code == dispatch_in.target_village_code.upper()
    ).first()

    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target village with code '{dispatch_in.target_village_code}' not found."
        )

    # 3. Check inventory sufficiency
    if phc.ors_packets < dispatch_in.ors_packets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient ORS stock at {phc.phc_name}. "
                f"Requested: {dispatch_in.ors_packets}, Available: {phc.ors_packets}"
            )
        )

    if phc.chlorine_tablets < dispatch_in.chlorine_tablets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient Chlorine stock at {phc.phc_name}. "
                f"Requested: {dispatch_in.chlorine_tablets}, Available: {phc.chlorine_tablets}"
            )
        )

    if phc.test_kits < dispatch_in.test_kits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient Test Kits stock at {phc.phc_name}. "
                f"Requested: {dispatch_in.test_kits}, Available: {phc.test_kits}"
            )
        )

    # 4. Deduct items atomically
    phc.ors_packets -= dispatch_in.ors_packets
    phc.chlorine_tablets -= dispatch_in.chlorine_tablets
    phc.test_kits -= dispatch_in.test_kits

    db.commit()
    db.refresh(phc)

    return ResourceDispatchResponse(
        status="success",
        message=f"Stock successfully dispatched from {phc.phc_name} to {village.name} ({village.code}).",
        dispatched_to=f"{village.name} ({village.code}), {village.district}",
        dispatched_items={
            "ors_packets": dispatch_in.ors_packets,
            "chlorine_tablets": dispatch_in.chlorine_tablets,
            "test_kits": dispatch_in.test_kits,
        },
        remaining_inventory=ResourceInventoryResponse.model_validate(phc)
    )
