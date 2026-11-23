"""
Verification script for SIH25001 Phase 1 Backend API endpoints.
Runs using FastAPI's TestClient to thoroughly validate all requirements.
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_suite():
    print("=== Running SIH25001 Backend API Test Suite ===\n")

    # 1. GET /health
    print("Test 1: GET /health")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["status"] == "ok"
    print(f"  PASSED: {data}\n")

    # 2. GET /villages
    print("Test 2: GET /villages")
    resp = client.get("/villages")
    assert resp.status_code == 200
    villages = resp.json()
    assert len(villages) >= 5, f"Expected at least 5 villages, got {len(villages)}"
    print(f"  PASSED: Retrieved {len(villages)} villages. First: {villages[0]['name']} ({villages[0]['code']})\n")

    # 3. POST /reports/symptom (New Record)
    print("Test 3: POST /reports/symptom (New record)")
    symptom_payload = {
        "village_code": "V101",
        "reporter_role": "ASHA",
        "symptom_type": "VOMITING",
        "case_count": 3,
        "severity": "MILD",
        "sync_uuid": "test-offline-uuid-999"
    }
    resp = client.post("/reports/symptom", json=symptom_payload)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    report_1 = resp.json()
    assert report_1["sync_uuid"] == "test-offline-uuid-999"
    print(f"  PASSED: Created report id={report_1['id']}, cases={report_1['case_count']}\n")

    # 4. POST /reports/symptom (Duplicate sync_uuid -> Idempotent offline sync)
    print("Test 4: POST /reports/symptom (Duplicate sync_uuid idempotency test)")
    resp_dup = client.post("/reports/symptom", json=symptom_payload)
    assert resp_dup.status_code == 200, f"Expected 200 for idempotent sync, got {resp_dup.status_code}"
    report_dup = resp_dup.json()
    assert report_dup["id"] == report_1["id"], "Should return the existing record!"
    print(f"  PASSED: Idempotent return of existing report id={report_dup['id']}\n")

    # 5. POST /reports/water
    print("Test 5: POST /reports/water")
    water_payload = {
        "village_code": "V102",
        "source_type": "WELL",
        "ph": 7.1,
        "turbidity_ntu": 3.8,
        "bacterial_contaminated": False,
        "source_method": "MANUAL_KIT"
    }
    resp = client.post("/reports/water", json=water_payload)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    water_res = resp.json()
    assert water_res["village_code"] == "V102"
    print(f"  PASSED: Logged water quality record id={water_res['id']}\n")

    # 6. POST /webhooks/sms
    print("Test 6: POST /webhooks/sms (Simulated SMS: 'HELP V101 1')")
    sms_payload = {
        "sender_phone": "+919876543210",
        "message_body": "HELP V101 1"
    }
    resp = client.post("/webhooks/sms", json=sms_payload)
    assert resp.status_code == 200
    sms_res = resp.json()
    assert sms_res["status"] == "success"
    assert sms_res["parsed_report_type"] == "DIARRHEA"
    assert "boiled water" in sms_res["auto_reply_sms"]
    print(f"  PASSED: Auto-reply SMS: \"{sms_res['auto_reply_sms']}\"\n")

    # 7. GET /resources
    print("Test 7: GET /resources")
    resp = client.get("/resources")
    assert resp.status_code == 200
    resources = resp.json()
    assert len(resources) >= 2, f"Expected at least 2 PHCs, got {len(resources)}"
    initial_phc = resources[0]
    initial_ors = initial_phc["ors_packets"]
    print(f"  PASSED: PHC '{initial_phc['phc_name']}' has {initial_ors} ORS packets\n")

    # 8. POST /resources/dispatch
    print("Test 8: POST /resources/dispatch")
    dispatch_payload = {
        "phc_id": initial_phc["id"],
        "target_village_code": "V101",
        "ors_packets": 50,
        "chlorine_tablets": 100,
        "test_kits": 5
    }
    resp = client.post("/resources/dispatch", json=dispatch_payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    dispatch_res = resp.json()
    assert dispatch_res["status"] == "success"
    new_ors = dispatch_res["remaining_inventory"]["ors_packets"]
    assert new_ors == initial_ors - 50, f"Expected {initial_ors - 50}, got {new_ors}"
    print(f"  PASSED: Stock deducted. Remaining ORS: {new_ors}\n")

    print("ALL API VERIFICATION TESTS COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    test_suite()
