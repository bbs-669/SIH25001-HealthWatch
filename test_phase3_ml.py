"""
Automated end-to-end test suite for Phase 3:
ML Outbreak Risk Engine, Real-Time Hooks, and Explainable AI.
"""
import sys
import os

# Add repo root and backend to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Village, SymptomReport, WaterQualityLog

client = TestClient(app)


def run_phase3_test_suite():
    print("=== Running SIH25001 Phase 3 ML Outbreak Engine Test Suite ===\n")

    # 1. Verify Model Artifact & Status
    print("Test 1: GET /ml/status (Verify trained ML model)")
    resp = client.get("/ml/status")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    status_data = resp.json()
    assert status_data["model_loaded"] is True, "Trained ML model should be loaded!"
    assert "RandomForest" in status_data["model_type"], f"Expected RandomForest, got {status_data['model_type']}"
    print(f"  PASSED: {status_data['model_type']} loaded from {status_data['model_path']}\n")

    # 2. Reset or check baseline for V102 (Barpeta)
    print("Test 2: Check baseline for V102 (Barpeta Riverside)")
    resp = client.get("/villages/V102")
    assert resp.status_code == 200
    initial_v102 = resp.json()
    print(f"  Initial V102: Level={initial_v102['risk_level']}, Score={initial_v102['risk_score']}")
    print(f"  Initial Factors: {initial_v102.get('risk_factors')}\n")

    # 3. Simulate Flood Contamination Incident: POST /reports/water to V102
    print("Test 3: POST /reports/water (Inject bacterial water contamination in V102)")
    water_payload = {
        "village_code": "V102",
        "source_type": "RIVER",
        "ph": 6.3,
        "turbidity_ntu": 24.5,
        "bacterial_contaminated": True,
        "source_method": "MANUAL_KIT",
    }
    resp_w = client.post("/reports/water", json=water_payload)
    assert resp_w.status_code == 201, f"Expected 201, got {resp_w.status_code}"
    
    # Check intermediate risk update
    v102_after_water = client.get("/villages/V102").json()
    print(f"  V102 after water contamination: Score={v102_after_water['risk_score']}, Level={v102_after_water['risk_level']}")
    assert v102_after_water["risk_score"] > initial_v102["risk_score"], "Risk score should increase after contamination!"
    print("  PASSED: Real-time hook triggered on water quality log.\n")

    # 4. Simulate Clinical Outbreak Spike: POST /reports/symptom (Severe Diarrhea)
    print("Test 4: POST /reports/symptom (Inject 6 severe diarrhea cases in V102)")
    symptom_payload = {
        "village_code": "V102",
        "reporter_role": "ASHA",
        "symptom_type": "DIARRHEA",
        "case_count": 6,
        "severity": "SEVERE",
        "sync_uuid": f"test-ml-diarrhea-{os.urandom(4).hex()}",
    }
    resp_s = client.post("/reports/symptom", json=symptom_payload)
    assert resp_s.status_code == 201

    # 5. Ingest Villager SMS Alert: POST /webhooks/sms
    print("Test 5: POST /webhooks/sms (Ingest villager SMS alert for V102)")
    sms_payload = {
        "sender_phone": "+919876543210",
        "message_body": "HELP V102 1",
    }
    resp_sms = client.post("/webhooks/sms", json=sms_payload)
    assert resp_sms.status_code == 200

    # 6. Verify Escalation to ORANGE or RED
    print("Test 6: Verify Outbreak Escalation on V102")
    resp_updated = client.get("/villages/V102")
    assert resp_updated.status_code == 200
    escalated_v102 = resp_updated.json()
    print(f"  Escalated V102: Level={escalated_v102['risk_level']}, Score={escalated_v102['risk_score']}")
    assert escalated_v102["risk_level"] in ["ORANGE", "RED"], f"Expected ORANGE or RED, got {escalated_v102['risk_level']}"
    assert escalated_v102["risk_score"] >= 50.0, f"Expected risk_score >= 50.0, got {escalated_v102['risk_score']}"
    print(f"  PASSED: V102 successfully escalated into {escalated_v102['risk_level']} (Score: {escalated_v102['risk_score']})\n")

    # 7. Verify Explainable AI Endpoint: GET /villages/V102/risk-analysis
    print("Test 7: GET /villages/V102/risk-analysis (Explainable AI Risk Drivers)")
    resp_analysis = client.get("/villages/V102/risk-analysis")
    assert resp_analysis.status_code == 200
    analysis = resp_analysis.json()
    assert analysis["village_code"] == "V102"
    assert analysis["outbreak_probability"] >= 0.5, f"Expected probability >= 0.5, got {analysis['outbreak_probability']}"
    assert len(analysis["risk_factors"]) >= 2, f"Expected multiple risk factors, got {analysis['risk_factors']}"
    
    factors_str = " | ".join(analysis["risk_factors"])
    assert "Bacterial" in factors_str, "Should identify bacterial contamination factor"
    assert ("Turbidity" in factors_str or "Diarrhea" in factors_str), "Should identify turbidity or diarrhea factor"
    print(f"  PASSED: Outbreak Probability = {int(analysis['outbreak_probability'] * 100)}%")
    print(f"  AI Risk Factors: {analysis['risk_factors']}\n")

    # 8. Test Batch Recalculation: POST /ml/recalculate-all
    print("Test 8: POST /ml/recalculate-all (Batch model inference across all villages)")
    resp_recalc = client.post("/ml/recalculate-all")
    assert resp_recalc.status_code == 200
    recalc_data = resp_recalc.json()
    assert recalc_data["status"] == "success"
    assert recalc_data["villages_updated"] >= 5
    print(f"  PASSED: Recalculated {recalc_data['villages_updated']} villages.")
    print(f"  Risk Distribution: {recalc_data['summary']['distribution']}\n")

    print("ALL PHASE 3 ML END-TO-END TESTS PASSED CLEANLY!")


if __name__ == "__main__":
    run_phase3_test_suite()
