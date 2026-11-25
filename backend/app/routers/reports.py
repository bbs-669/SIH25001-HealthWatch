import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Village, SymptomReport, WaterQualityLog
from ..schemas import (
    SymptomReportCreate,
    SymptomReportResponse,
    WaterQualityLogCreate,
    WaterQualityLogResponse,
    SMSWebhookRequest,
    SMSWebhookResponse,
)

router = APIRouter(tags=["Reports & Webhooks"])


@router.post("/reports/symptom", response_model=SymptomReportResponse)
def submit_symptom_report(
    report_in: SymptomReportCreate,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Log a new symptom report.
    Idempotent offline sync: If sync_uuid already exists, returns existing record (HTTP 200).
    If new, inserts new record and returns HTTP 201.
    """
    # 1. Check idempotency via sync_uuid
    existing_report = db.query(SymptomReport).filter(
        SymptomReport.sync_uuid == report_in.sync_uuid
    ).first()

    if existing_report:
        response.status_code = status.HTTP_200_OK
        return existing_report

    # 2. Validate village code
    village = db.query(Village).filter(
        Village.code == report_in.village_code.upper()
    ).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with code '{report_in.village_code}' does not exist."
        )

    # 3. Create new record
    new_report = SymptomReport(
        village_code=report_in.village_code.upper(),
        reporter_role=report_in.reporter_role.upper(),
        symptom_type=report_in.symptom_type.upper(),
        case_count=report_in.case_count,
        severity=report_in.severity.upper(),
        sync_uuid=report_in.sync_uuid
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Real-Time ML Outbreak Risk Recalculation Hook
    try:
        from ml_engine.predictor import evaluate_village_risk
        evaluate_village_risk(db, new_report.village_code, auto_commit=True)
    except Exception as ml_err:
        print(f"[Warning] ML evaluation hook failed on symptom report: {ml_err}")

    response.status_code = status.HTTP_201_CREATED
    return new_report


@router.get("/reports/symptom", response_model=List[SymptomReportResponse])
def get_symptom_reports(db: Session = Depends(get_db)):
    """Fetch all logged symptom reports."""
    return db.query(SymptomReport).order_by(SymptomReport.id.desc()).all()


@router.post("/reports/water", response_model=WaterQualityLogResponse, status_code=status.HTTP_201_CREATED)
def submit_water_quality_log(
    log_in: WaterQualityLogCreate,
    db: Session = Depends(get_db)
):
    """Log a water quality test record."""
    village = db.query(Village).filter(
        Village.code == log_in.village_code.upper()
    ).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with code '{log_in.village_code}' does not exist."
        )

    new_log = WaterQualityLog(
        village_code=log_in.village_code.upper(),
        source_type=log_in.source_type.upper(),
        ph=log_in.ph,
        turbidity_ntu=log_in.turbidity_ntu,
        bacterial_contaminated=log_in.bacterial_contaminated,
        source_method=log_in.source_method.upper()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # Real-Time ML Outbreak Risk Recalculation Hook
    try:
        from ml_engine.predictor import evaluate_village_risk
        evaluate_village_risk(db, new_log.village_code, auto_commit=True)
    except Exception as ml_err:
        print(f"[Warning] ML evaluation hook failed on water quality log: {ml_err}")

    return new_log


@router.get("/reports/water", response_model=List[WaterQualityLogResponse])
def get_water_quality_logs(db: Session = Depends(get_db)):
    """Fetch all logged water quality tests."""
    return db.query(WaterQualityLog).order_by(WaterQualityLog.id.desc()).all()


@router.post("/webhooks/sms", response_model=SMSWebhookResponse)
def handle_sms_webhook(
    sms_in: SMSWebhookRequest,
    db: Session = Depends(get_db)
):
    """
    Accept simulated SMS text like 'HELP V101 1'
    Codes:
      1 = DIARRHEA
      2 = FEVER
      3 = DIRTY_WATER
    Parses payload, saves to database, and returns English auto-reply text.
    """
    raw_text = sms_in.message_body.strip()
    parts = raw_text.split()

    if len(parts) < 3 or parts[0].upper() != "HELP":
        return SMSWebhookResponse(
            status="error",
            auto_reply_sms=(
                "Invalid format. Please send SMS as: HELP <VILLAGE_CODE> <CODE> "
                "(Options: 1=Diarrhea, 2=Fever, 3=Dirty Water). Example: HELP V101 1"
            )
        )

    village_code = parts[1].upper()
    code_choice = parts[2].strip()

    village = db.query(Village).filter(Village.code == village_code).first()
    if not village:
        return SMSWebhookResponse(
            status="error",
            parsed_village_code=village_code,
            auto_reply_sms=(
                f"Unknown village code '{village_code}'. Please verify your village code "
                "with your local ASHA worker."
            )
        )

    if code_choice == "1":
        # Diarrhea symptom report
        report = SymptomReport(
            village_code=village.code,
            reporter_role="VILLAGER_SMS",
            symptom_type="DIARRHEA",
            case_count=1,
            severity="MILD",
            sync_uuid=f"sms-{uuid.uuid4()}"
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Real-Time ML Outbreak Risk Recalculation Hook
        try:
            from ml_engine.predictor import evaluate_village_risk
            evaluate_village_risk(db, village.code, auto_commit=True)
        except Exception as ml_err:
            print(f"[Warning] ML evaluation hook failed on SMS Diarrhea: {ml_err}")

        return SMSWebhookResponse(
            status="success",
            parsed_village_code=village.code,
            parsed_report_type="DIARRHEA",
            record_id=report.id,
            auto_reply_sms=(
                f"Alert received for {village.name}. Please drink boiled water and prepare ORS solution "
                "immediately. Local ASHA worker and PHC have been notified."
            )
        )

    elif code_choice == "2":
        # Fever symptom report
        report = SymptomReport(
            village_code=village.code,
            reporter_role="VILLAGER_SMS",
            symptom_type="FEVER",
            case_count=1,
            severity="MILD",
            sync_uuid=f"sms-{uuid.uuid4()}"
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Real-Time ML Outbreak Risk Recalculation Hook
        try:
            from ml_engine.predictor import evaluate_village_risk
            evaluate_village_risk(db, village.code, auto_commit=True)
        except Exception as ml_err:
            print(f"[Warning] ML evaluation hook failed on SMS Fever: {ml_err}")

        return SMSWebhookResponse(
            status="success",
            parsed_village_code=village.code,
            parsed_report_type="FEVER",
            record_id=report.id,
            auto_reply_sms=(
                f"Fever case registered for {village.name}. Keep patient hydrated and visit nearest "
                "Sub-Centre/PHC if temperature persists. District surveillance alerted."
            )
        )

    elif code_choice == "3":
        # Dirty Water report
        water_log = WaterQualityLog(
            village_code=village.code,
            source_type="TAP",
            ph=6.8,
            turbidity_ntu=15.0,
            bacterial_contaminated=True,
            source_method="IOT_SIMULATOR"
        )
        db.add(water_log)
        db.commit()
        db.refresh(water_log)

        # Real-Time ML Outbreak Risk Recalculation Hook
        try:
            from ml_engine.predictor import evaluate_village_risk
            evaluate_village_risk(db, village.code, auto_commit=True)
        except Exception as ml_err:
            print(f"[Warning] ML evaluation hook failed on SMS Dirty Water: {ml_err}")

        return SMSWebhookResponse(
            status="success",
            parsed_village_code=village.code,
            parsed_report_type="DIRTY_WATER",
            record_id=water_log.id,
            auto_reply_sms=(
                f"Water contamination alert logged for {village.name}. DO NOT drink tap/river water "
                "without boiling or chlorine treatment. Emergency water testing team alerted."
            )
        )

    else:
        return SMSWebhookResponse(
            status="error",
            parsed_village_code=village.code,
            auto_reply_sms=(
                f"Invalid condition code '{code_choice}'. Use: 1 for Diarrhea, 2 for Fever, 3 for Dirty Water."
            )
        )
