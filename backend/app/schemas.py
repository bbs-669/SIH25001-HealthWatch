from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Village Schemas
# ==========================================
class VillageBase(BaseModel):
    code: str = Field(..., example="V101")
    name: str = Field(..., example="Majuli Island")
    district: str = Field(..., example="Majuli")
    latitude: float = Field(..., example=26.9538)
    longitude: float = Field(..., example=94.2037)
    population: int = Field(default=0, example=2400)
    risk_level: str = Field(default="GREEN", example="GREEN")
    risk_score: float = Field(default=0.0, example=15.0)


class VillageCreate(VillageBase):
    pass


class VillageResponse(VillageBase):
    id: int
    created_at: Optional[datetime] = None
    risk_factors: Optional[List[str]] = None
    outbreak_probability: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# ML & Explainable AI Schemas
# ==========================================
class RiskAnalysisResponse(BaseModel):
    village_code: str
    village_name: str
    district: str
    population: int
    risk_score: float
    risk_level: str
    outbreak_probability: float
    risk_factors: List[str]
    model_used: Optional[str] = None
    evaluated_at: str


class RecalculateAllResponse(BaseModel):
    status: str
    villages_updated: int
    summary: dict
    timestamp: str



# ==========================================
# Symptom Report Schemas
# ==========================================
class SymptomReportCreate(BaseModel):
    village_code: str = Field(..., example="V101")
    reporter_role: str = Field(default="ASHA", example="ASHA")  # ASHA, VILLAGER_SMS, CLINIC
    symptom_type: str = Field(..., example="DIARRHEA")         # DIARRHEA, VOMITING, FEVER, JAUNDICE
    case_count: int = Field(default=1, ge=1, example=1)
    severity: str = Field(default="MILD", example="MILD")       # MILD, SEVERE
    sync_uuid: str = Field(..., example="uuid-12345-offline-sync")


class SymptomReportResponse(BaseModel):
    id: int
    village_code: str
    reporter_role: str
    symptom_type: str
    case_count: int
    severity: str
    sync_uuid: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Water Quality Log Schemas
# ==========================================
class WaterQualityLogCreate(BaseModel):
    village_code: str = Field(..., example="V101")
    source_type: str = Field(..., example="WELL")              # WELL, RIVER, TAP
    ph: float = Field(..., example=7.2)
    turbidity_ntu: float = Field(..., example=4.5)
    bacterial_contaminated: bool = Field(default=False, example=False)
    source_method: str = Field(default="MANUAL_KIT", example="MANUAL_KIT")  # MANUAL_KIT, IOT_SIMULATOR


class WaterQualityLogResponse(BaseModel):
    id: int
    village_code: str
    source_type: str
    ph: float
    turbidity_ntu: float
    bacterial_contaminated: bool
    source_method: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SMS Webhook Schemas
# ==========================================
class SMSWebhookRequest(BaseModel):
    sender_phone: Optional[str] = Field(default="+919800000000", example="+919876543210")
    message_body: str = Field(..., example="HELP V101 1")


class SMSWebhookResponse(BaseModel):
    status: str
    parsed_village_code: Optional[str] = None
    parsed_report_type: Optional[str] = None
    record_id: Optional[int] = None
    auto_reply_sms: str


# ==========================================
# Resource Inventory Schemas
# ==========================================
class ResourceInventoryResponse(BaseModel):
    id: int
    phc_name: str
    district: str
    ors_packets: int
    chlorine_tablets: int
    test_kits: int
    nurses_available: int

    model_config = ConfigDict(from_attributes=True)


class ResourceDispatchRequest(BaseModel):
    phc_id: int = Field(..., example=1)
    target_village_code: str = Field(..., example="V101")
    ors_packets: int = Field(default=0, ge=0, example=50)
    chlorine_tablets: int = Field(default=0, ge=0, example=100)
    test_kits: int = Field(default=0, ge=0, example=5)


class ResourceDispatchResponse(BaseModel):
    status: str
    message: str
    dispatched_to: str
    dispatched_items: dict
    remaining_inventory: ResourceInventoryResponse
