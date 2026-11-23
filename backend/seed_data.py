"""
Seed script to populate realistic Northeast Indian villages and PHC resource inventories.
"""
import sys
import os

# Add parent directory to sys.path so app modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Village, ResourceInventory, SymptomReport, WaterQualityLog


def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Villages (Assam and Meghalaya)
        villages_data = [
            {
                "code": "V101",
                "name": "Majuli Island Rural",
                "district": "Majuli",
                "latitude": 26.9538,
                "longitude": 94.2037,
                "population": 2400,
                "risk_level": "YELLOW",
                "risk_score": 34.5,
            },
            {
                "code": "V102",
                "name": "Barpeta Riverside",
                "district": "Barpeta",
                "latitude": 26.3216,
                "longitude": 91.0061,
                "population": 3100,
                "risk_level": "GREEN",
                "risk_score": 12.0,
            },
            {
                "code": "V103",
                "name": "Laharighat Floodplain",
                "district": "Morigaon",
                "latitude": 26.2500,
                "longitude": 92.3500,
                "population": 1850,
                "risk_level": "ORANGE",
                "risk_score": 58.0,
            },
            {
                "code": "V104",
                "name": "Sohra (Cherrapunji) Valley",
                "district": "East Khasi Hills",
                "latitude": 25.2702,
                "longitude": 91.7323,
                "population": 1420,
                "risk_level": "GREEN",
                "risk_score": 8.5,
            },
            {
                "code": "V105",
                "name": "Mawlynnong Highland",
                "district": "East Khasi Hills",
                "latitude": 25.2014,
                "longitude": 91.9042,
                "population": 650,
                "risk_level": "GREEN",
                "risk_score": 4.0,
            },
        ]

        print(f"Seeding {len(villages_data)} villages...")
        for v in villages_data:
            existing = db.query(Village).filter(Village.code == v["code"]).first()
            if not existing:
                village = Village(**v)
                db.add(village)
                print(f"  + Added Village: {v['name']} ({v['code']}) in {v['district']}")
            else:
                # Update existing fields
                for key, val in v.items():
                    setattr(existing, key, val)
                print(f"  * Updated Village: {v['name']} ({v['code']})")

        # 2. Seed PHCs (Primary Health Centres)
        phcs_data = [
            {
                "phc_name": "Garamur Model Hospital & PHC",
                "district": "Majuli",
                "ors_packets": 1200,
                "chlorine_tablets": 3500,
                "test_kits": 150,
                "nurses_available": 8,
            },
            {
                "phc_name": "Sohra Community Health Centre (CHC/PHC)",
                "district": "East Khasi Hills",
                "ors_packets": 800,
                "chlorine_tablets": 2000,
                "test_kits": 80,
                "nurses_available": 5,
            },
        ]

        print(f"Seeding {len(phcs_data)} PHCs...")
        for p in phcs_data:
            existing = db.query(ResourceInventory).filter(ResourceInventory.phc_name == p["phc_name"]).first()
            if not existing:
                phc = ResourceInventory(**p)
                db.add(phc)
                print(f"  + Added PHC: {p['phc_name']} ({p['district']})")
            else:
                for key, val in p.items():
                    setattr(existing, key, val)
                print(f"  * Updated PHC: {p['phc_name']}")

        # 3. Baseline sample reports for initial demonstration
        sample_symptom = {
            "village_code": "V103",
            "reporter_role": "ASHA",
            "symptom_type": "DIARRHEA",
            "case_count": 4,
            "severity": "SEVERE",
            "sync_uuid": "seed-baseline-symptom-001"
        }
        if not db.query(SymptomReport).filter(SymptomReport.sync_uuid == sample_symptom["sync_uuid"]).first():
            db.add(SymptomReport(**sample_symptom))
            print("  + Added baseline symptom report for V103 (Laharighat)")

        sample_water = {
            "village_code": "V103",
            "source_type": "RIVER",
            "ph": 6.4,
            "turbidity_ntu": 18.2,
            "bacterial_contaminated": True,
            "source_method": "MANUAL_KIT"
        }
        if not db.query(WaterQualityLog).filter(WaterQualityLog.village_code == "V103").first():
            db.add(WaterQualityLog(**sample_water))
            print("  + Added baseline water quality log for V103")

        db.commit()
        print("\nDatabase seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
