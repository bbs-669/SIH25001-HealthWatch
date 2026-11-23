from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Village(Base):
    __tablename__ = "villages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    population = Column(Integer, default=0)
    risk_level = Column(String(20), default="GREEN")
    risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)


class SymptomReport(Base):
    __tablename__ = "symptom_reports"

    id = Column(Integer, primary_key=True, index=True)
    village_code = Column(String(50), ForeignKey("villages.code"), index=True, nullable=False)
    reporter_role = Column(String(50), nullable=False)  # ASHA, VILLAGER_SMS, CLINIC
    symptom_type = Column(String(50), nullable=False)   # DIARRHEA, VOMITING, FEVER, JAUNDICE
    case_count = Column(Integer, default=1, nullable=False)
    severity = Column(String(20), default="MILD", nullable=False)  # MILD, SEVERE
    sync_uuid = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)


class WaterQualityLog(Base):
    __tablename__ = "water_quality_logs"

    id = Column(Integer, primary_key=True, index=True)
    village_code = Column(String(50), ForeignKey("villages.code"), index=True, nullable=False)
    source_type = Column(String(50), nullable=False)  # WELL, RIVER, TAP
    ph = Column(Float, nullable=False)
    turbidity_ntu = Column(Float, nullable=False)
    bacterial_contaminated = Column(Boolean, default=False, nullable=False)
    source_method = Column(String(50), default="MANUAL_KIT", nullable=False)  # MANUAL_KIT, IOT_SIMULATOR
    created_at = Column(DateTime, default=utc_now)


class ResourceInventory(Base):
    __tablename__ = "resource_inventory"

    id = Column(Integer, primary_key=True, index=True)
    phc_name = Column(String(150), unique=True, index=True, nullable=False)
    district = Column(String(100), nullable=False)
    ors_packets = Column(Integer, default=0, nullable=False)
    chlorine_tablets = Column(Integer, default=0, nullable=False)
    test_kits = Column(Integer, default=0, nullable=False)
    nurses_available = Column(Integer, default=0, nullable=False)
